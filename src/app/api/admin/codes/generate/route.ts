import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

// Generate new format code: MMYY-XXXX-NNNN
// MM = Month, YY = Year, XXXX = Internal code (4 digits from company_codes), NNNN = Sequential
// XXXX is determined by superadmin - can represent type+company or any internal numbering
async function getNextSequentialNumber(
    client: any,
    internalCode: string  // 4-digit code from company_codes
): Promise<{ prefix: string; nextNum: number }> {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    
    const prefix = `${month}${year}-${internalCode}-`;
    
    // Get max number WITH FOR UPDATE to prevent race condition
    const result = await client.query(`
        SELECT code FROM candidate_codes 
        WHERE code LIKE $1 
        AND LENGTH(code) = 14
        ORDER BY code DESC
        LIMIT 1
        FOR UPDATE
    `, [prefix + '%']);
    
    let nextNum = 1;
    if (result.rows.length > 0) {
        const lastCode = result.rows[0].code;
        const lastNumStr = lastCode.slice(-4);
        nextNum = parseInt(lastNumStr, 10) + 1;
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
            candidateName,
            companyCodeId,  // Company code ID - 4-digit internal code determined by superadmin
            useLegacyFormat = false  // Use old 16-char format
        } = await req.json();

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
                // Get starting sequence number once (with FOR UPDATE lock)
                const { prefix, nextNum } = await getNextSequentialNumber(client, internalCode);

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

                    const metadata = candidateName && count === 1
                        ? JSON.stringify({ name: candidateName })
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

                    const metadata = candidateName && count === 1
                        ? JSON.stringify({ name: candidateName })
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
