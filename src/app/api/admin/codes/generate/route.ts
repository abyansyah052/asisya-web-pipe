import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

// Generate new format code: MMYY-XXXX-NNNN
// MM = Month, YY = Year, XXXX = Internal code (4 digits from company_codes), NNNN = Sequential
// XXXX is determined by superadmin - can represent type+company or any internal numbering

// 🔴 FIX RACE CONDITION: Use atomic sequence table instead of FOR UPDATE
// FOR UPDATE only locks EXISTING rows - first code in prefix has NO LOCK!
// With 800 concurrent users, this can cause duplicate codes!
async function getNextSequentialNumber(
    client: any,
    internalCode: string,  // 4-digit code from company_codes
    count: number = 1      // How many codes to generate
): Promise<{ prefix: string; nextNum: number }> {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    
    const prefix = `${month}${year}-${internalCode}-`;
    
    // ✅ ATOMIC: Use get_next_code_number function (UPSERT-based, thread-safe)
    // This handles race conditions properly even with 800 concurrent users
    const result = await client.query(
        'SELECT get_next_code_number($1) as next_num',
        [prefix]
    );
    
    let nextNum = result.rows[0]?.next_num || 1;
    
    // If generating multiple codes, reserve all numbers at once
    if (count > 1) {
        // Update sequence to reserve all numbers atomically
        await client.query(`
            UPDATE code_sequences 
            SET next_num = next_num + $1 - 1, 
                updated_at = CURRENT_TIMESTAMP
            WHERE prefix = $2
        `, [count, prefix]);
    }
    
    return { prefix, nextNum };
}

// Legacy: Generate random code - 16 alphanumeric characters
function generateLegacyCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 16; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// POST - Generate new codes (admin only)
export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessAdminFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const { 
            count = 1, 
            examId, 
            expiresInDays = 7, 
            candidateName,    // Single name (backward compatibility)
            candidateNames,   // Array of names (new format)
            companyCodeId,  // Company code ID - 4-digit internal code determined by superadmin
            useLegacyFormat = false  // Use old 16-char format
        } = await req.json();

        // Process candidate names - support both single name and array
        const names: string[] = [];
        if (candidateNames && Array.isArray(candidateNames)) {
            names.push(...candidateNames.filter((n: string) => n && n.trim()));
        } else if (candidateName && typeof candidateName === 'string' && candidateName.trim()) {
            names.push(candidateName.trim());
        }

        if (count < 1 || count > 100) {
            return NextResponse.json({ error: 'Jumlah kode harus antara 1-100' }, { status: 400 });
        }

        // Input validation for companyCodeId
        if (!useLegacyFormat) {
            if (!companyCodeId) {
                return NextResponse.json({ error: 'Pilih kode perusahaan untuk format baru' }, { status: 400 });
            }
            if (typeof companyCodeId !== 'number' || companyCodeId < 1 || !Number.isInteger(companyCodeId)) {
                return NextResponse.json({ error: 'companyCodeId harus berupa angka positif' }, { status: 400 });
            }
        }

        // Validate examId if provided
        if (examId !== undefined && examId !== null) {
            if (typeof examId !== 'number' || examId < 1 || !Number.isInteger(examId)) {
                return NextResponse.json({ error: 'examId harus berupa angka positif' }, { status: 400 });
            }
        }

        const client = await pool.connect();
        try {
            // Start transaction to prevent race conditions
            await client.query('BEGIN');

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);

            // Get company internal code (4-digit) if using new format
            let internalCode = '0000';
            let companyCodeIdToUse = null;
            
            if (!useLegacyFormat && companyCodeId) {
                const companyResult = await client.query(
                    'SELECT id, code FROM company_codes WHERE id = $1 AND is_active = TRUE',
                    [companyCodeId]
                );
                if (companyResult.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return NextResponse.json({ error: 'Kode perusahaan tidak ditemukan atau tidak aktif' }, { status: 400 });
                }
                internalCode = companyResult.rows[0].code;
                companyCodeIdToUse = companyResult.rows[0].id;
            }

            // OPTIMIZED: Generate all codes in batch for new format
            if (!useLegacyFormat) {
                // ✅ ATOMIC: Get starting sequence number with race condition fix
                const { prefix, nextNum } = await getNextSequentialNumber(client, internalCode, count);

                // Check if we have enough numbers
                if (nextNum + count - 1 > 9999) {
                    await client.query('ROLLBACK');
                    return NextResponse.json({ 
                        error: `Nomor urut tidak cukup. Tersisa ${9999 - nextNum + 1} nomor untuk kombinasi ini` 
                    }, { status: 400 });
                }

                // Build bulk insert values
                const codes: string[] = [];
                const values: any[] = [];
                const placeholders: string[] = [];
                let paramIndex = 1;

                for (let i = 0; i < count; i++) {
                    const code = `${prefix}${String(nextNum + i).padStart(4, '0')}`;
                    codes.push(code);

                    // Use name from array if available (by index), otherwise empty
                    const nameForCode = names[i] || '';
                    const metadata = nameForCode
                        ? JSON.stringify({ name: nameForCode })
                        : '{}';

                    placeholders.push(
                        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
                    );
                    values.push(
                        code,
                        session.id,
                        session.organizationId || null,
                        examId || null,
                        expiresAt.toISOString(),
                        metadata,
                        companyCodeIdToUse
                    );
                }

                // Single bulk insert - much faster than loop
                await client.query(`
                    INSERT INTO candidate_codes 
                    (code, created_by, admin_id, exam_id, expires_at, metadata, company_code_id)
                    VALUES ${placeholders.join(', ')}
                `, values);

                await client.query('COMMIT');

                return NextResponse.json({
                    success: true,
                    codes,
                    expiresAt: expiresAt.toISOString(),
                    format: 'new',
                    internalCode
                });
            } else {
                // Legacy format - individual inserts with collision check
                const codes: string[] = [];

                for (let i = 0; i < count; i++) {
                    let code: string = '';
                    let isUnique = false;
                    let attempts = 0;
                    const maxAttempts = 10;

                    while (!isUnique && attempts < maxAttempts) {
                        code = generateLegacyCode();
                        const existing = await client.query(
                            'SELECT id FROM candidate_codes WHERE code = $1',
                            [code]
                        );
                        isUnique = existing.rows.length === 0;
                        attempts++;
                    }

                    if (!isUnique) continue;

                    // Use name from array if available (by index), otherwise empty
                    const nameForCode = names[i] || '';
                    const metadata = nameForCode
                        ? JSON.stringify({ name: nameForCode })
                        : '{}';

                    await client.query(
                        `INSERT INTO candidate_codes 
                         (code, created_by, admin_id, exam_id, expires_at, metadata)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            code,
                            session.id,
                            session.organizationId || null,
                            examId || null,
                            expiresAt.toISOString(),
                            metadata
                        ]
                    );

                    codes.push(code);
                }

                await client.query('COMMIT');

                return NextResponse.json({
                    success: true,
                    codes,
                    expiresAt: expiresAt.toISOString(),
                    format: 'legacy'
                });
            }
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error generating codes:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
