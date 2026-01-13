import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { encrypt } from '@/lib/auth';
import { ROLES } from '@/lib/roles';

// =============================================
// OPTIMIZED CANDIDATE LOGIN FOR 800 CONCURRENT USERS
// ✅ WITH TRANSACTION TO PREVENT RACE CONDITION
// =============================================

// Kode yang sudah dipakai masih bisa digunakan dalam 2 hari (untuk preventif jaringan bermasalah)
const REUSE_WINDOW_DAYS = 2;

export async function POST(req: NextRequest) {
    const client = await pool.connect();
    
    try {
        const { code } = await req.json();

        if (!code || typeof code !== 'string') {
            client.release();
            return NextResponse.json(
                { error: 'Kode akses diperlukan' },
                { status: 400 }
            );
        }

        // ✅ ROBUST NORMALIZATION: Handle unicode, invisible chars, etc.
        // 1. Normalize unicode (NFKC converts fullwidth to ASCII)
        // 2. Trim whitespace including non-breaking spaces
        // 3. Convert to uppercase
        // 4. Remove ALL non-alphanumeric characters (dash, space, etc)
        const normalizedCode = code
            .normalize('NFKC')  // Convert fullwidth chars: Ａ→A, ０→0
            .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')  // Remove zero-width and nbsp
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');  // Keep only A-Z and 0-9
        
        // Debug log for troubleshooting
        console.log(`[LOGIN] Input: "${code}" (len=${code.length}) → Normalized: "${normalizedCode}" (len=${normalizedCode.length})`);

        // ✅ Validate minimum length (12 chars without dashes)
        if (normalizedCode.length < 10) {
            client.release();
            return NextResponse.json(
                { error: `Kode terlalu pendek. Pastikan mengetik kode dengan benar (${normalizedCode.length} karakter terdeteksi).` },
                { status: 400 }
            );
        }

        // ✅ START TRANSACTION to prevent race condition
        await client.query('BEGIN');

        // ✅ Lock the row with FOR UPDATE to prevent concurrent access
        const result = await client.query(
            `SELECT 
                cc.id as code_id,
                cc.candidate_id,
                cc.admin_id,
                cc.exam_id,
                cc.expires_at,
                cc.max_uses,
                cc.current_uses,
                cc.used_at,
                cc.metadata,
                u.id as user_id,
                u.username,
                u.profile_completed
             FROM candidate_codes cc
             LEFT JOIN users u ON cc.candidate_id = u.id
             WHERE REPLACE(cc.code, '-', '') = $1 
             AND cc.is_active = true
             FOR UPDATE OF cc
             LIMIT 1`,
            [normalizedCode]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            console.log(`[LOGIN] Code not found: "${normalizedCode}"`);
            return NextResponse.json(
                { error: `Kode "${normalizedCode}" tidak valid atau sudah tidak aktif. Pastikan mengetik kode dengan benar.` },
                { status: 401 }
            );
        }

        const codeData = result.rows[0];

        // Validate expiry
        if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
            await client.query('ROLLBACK');
            client.release();
            return NextResponse.json(
                { error: 'Kode sudah kedaluwarsa' },
                { status: 401 }
            );
        }

        // Check max_uses with 2-day reuse window
        // Jika kode sudah dipakai, masih bisa login selama 2 hari setelah used_at
        if (codeData.max_uses && codeData.current_uses >= codeData.max_uses) {
            // Cek apakah masih dalam window reuse (2 hari setelah pertama kali dipakai)
            if (codeData.used_at) {
                const usedAt = new Date(codeData.used_at);
                const reuseDeadline = new Date(usedAt.getTime() + (REUSE_WINDOW_DAYS * 24 * 60 * 60 * 1000));

                if (new Date() > reuseDeadline) {
                    await client.query('ROLLBACK');
                    client.release();
                    return NextResponse.json(
                        { error: 'Kode sudah mencapai batas penggunaan dan melewati masa tenggang 2 hari' },
                        { status: 401 }
                    );
                }
                // Masih dalam window, allow re-login tanpa increment usage
                console.log(`Code ${normalizedCode} re-used within ${REUSE_WINDOW_DAYS}-day window`);
            } else {
                await client.query('ROLLBACK');
                client.release();
                return NextResponse.json(
                    { error: 'Kode sudah mencapai batas penggunaan' },
                    { status: 401 }
                );
            }
        }

        let userId: number;
        let profileCompleted = false;
        let username: string;

        // Check if within reuse window (don't increment usage if already maxed)
        const isReuseWithinWindow = codeData.max_uses &&
            codeData.current_uses >= codeData.max_uses &&
            codeData.used_at;

        if (codeData.candidate_id) {
            // Existing candidate
            userId = codeData.candidate_id;
            profileCompleted = codeData.profile_completed || false;
            username = codeData.username || `candidate_${userId}`;

            // Only increment usage if not already maxed (reuse window case)
            if (!isReuseWithinWindow) {
                await client.query(
                    'UPDATE candidate_codes SET current_uses = current_uses + 1 WHERE id = $1',
                    [codeData.code_id]
                );
            }
        } else {
            // Create new candidate - within same transaction
            const candidateUsername = `candidate_${normalizedCode.toLowerCase()}`;

            // ✅ Extract candidate name from metadata if available (from imported codes)
            let candidateName: string | null = null;
            if (codeData.metadata && typeof codeData.metadata === 'object') {
                candidateName = codeData.metadata.candidate_name || null;
            }

            const newUser = await client.query(
                `INSERT INTO users (username, email, password_hash, role, organization_id, profile_completed, registration_type, full_name)
                 VALUES ($1, $2, $3, $4, $5, false, 'candidate_code', $6)
                 RETURNING id, username`,
                [
                    candidateUsername,
                    `${candidateUsername}@candidate.local`,
                    'CANDIDATE_NO_PASSWORD',  // Candidates login via code, not password
                    ROLES.CANDIDATE,
                    codeData.admin_id,
                    candidateName  // ✅ Set full_name from import metadata
                ]
            );

            userId = newUser.rows[0].id;
            username = newUser.rows[0].username;

            // Update code with candidate link and increment usage
            await client.query(
                `UPDATE candidate_codes 
                 SET candidate_id = $1, used_at = NOW(), current_uses = current_uses + 1
                 WHERE id = $2`,
                [userId, codeData.code_id]
            );
        }

        // ✅ COMMIT TRANSACTION
        await client.query('COMMIT');

        // Check if code was already used (for redirect logic)
        const codeWasUsed = codeData.current_uses > 0 && codeData.used_at;

        // Create JWT
        const token = await encrypt({
            id: userId,
            role: ROLES.CANDIDATE,
            username: username,
            profileCompleted: profileCompleted,
            organizationId: codeData.admin_id
        });

        const response = NextResponse.json({
            success: true,
            role: ROLES.CANDIDATE,
            profileCompleted: profileCompleted,
            examId: codeData.exam_id,
            codeUsed: codeWasUsed  // 🔴 NEW: Tell frontend if code was already used
        });

        // Use user_session cookie name for consistency
        response.cookies.set({
            name: 'user_session',
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 8,
            path: '/',
        });

        client.release();
        return response;

    } catch (error) {
        // ✅ ROLLBACK on any error
        await client.query('ROLLBACK').catch(() => {});
        client.release();
        console.error('Candidate login error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
