import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { encrypt } from '@/lib/auth';
import { ROLES } from '@/lib/roles';

// =============================================
// OPTIMIZED CANDIDATE LOGIN FOR 800 CONCURRENT USERS
// =============================================

// Kode yang sudah dipakai masih bisa digunakan dalam 2 hari (untuk preventif jaringan bermasalah)
const REUSE_WINDOW_DAYS = 2;

export async function POST(req: NextRequest) {
    try {
        const { code } = await req.json();

        if (!code || typeof code !== 'string') {
            return NextResponse.json(
                { error: 'Kode akses diperlukan' },
                { status: 400 }
            );
        }

        const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

        // Single optimized query - get code and candidate info together
        const result = await pool.query(
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
             LIMIT 1`,
            [normalizedCode]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Kode tidak valid atau sudah tidak aktif' },
                { status: 401 }
            );
        }

        const codeData = result.rows[0];

        // Validate expiry
        if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
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
                    return NextResponse.json(
                        { error: 'Kode sudah mencapai batas penggunaan dan melewati masa tenggang 2 hari' },
                        { status: 401 }
                    );
                }
                // Masih dalam window, allow re-login tanpa increment usage
                console.log(`Code ${normalizedCode} re-used within ${REUSE_WINDOW_DAYS}-day window`);
            } else {
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
                await pool.query(
                    'UPDATE candidate_codes SET current_uses = current_uses + 1 WHERE id = $1',
                    [codeData.code_id]
                );
            }
        } else {
            // Create new candidate - single transaction
            const candidateUsername = `candidate_${normalizedCode.toLowerCase()}`;

            const newUser = await pool.query(
                `INSERT INTO users (username, email, password_hash, role, organization_id, profile_completed, registration_type)
                 VALUES ($1, $2, $3, $4, $5, false, 'candidate_code')
                 RETURNING id, username`,
                [
                    candidateUsername,
                    `${candidateUsername}@candidate.local`,
                    'CANDIDATE_NO_PASSWORD',  // Candidates login via code, not password
                    ROLES.CANDIDATE,
                    codeData.admin_id
                ]
            );

            userId = newUser.rows[0].id;
            username = newUser.rows[0].username;

            // Update code with candidate link and increment usage
            await pool.query(
                `UPDATE candidate_codes 
                 SET candidate_id = $1, used_at = NOW(), current_uses = current_uses + 1
                 WHERE id = $2`,
                [userId, codeData.code_id]
            );
        }

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
            examId: codeData.exam_id
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

        return response;

    } catch (error) {
        console.error('Candidate login error:', error);
        return NextResponse.json(
            { error: 'Terjadi kesalahan server' },
            { status: 500 }
        );
    }
}
