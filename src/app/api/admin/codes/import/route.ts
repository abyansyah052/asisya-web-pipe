import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

const MAX_IMPORT = 3000; // Rate limit max candidates per import

// Legacy: Generate random code - 16 characters
function generateLegacyCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

interface GeneratedCode {
    id: number;
    code: string;
    candidate_name: string;
    expires_at: string;
}

// POST - Import multiple codes from Excel data with optimized bulk insert
export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');

        const user = await getSession(sessionCookie?.value);
        if (!user || !canAccessAdminFeatures(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { candidates, examId, expiresInDays, companyCodeId, useLegacyFormat = false } = await req.json();

        if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
            return NextResponse.json({ error: 'Data kandidat diperlukan' }, { status: 400 });
        }

        // Rate limiting - max 3000
        if (candidates.length > MAX_IMPORT) {
            return NextResponse.json({ 
                error: `Maksimal ${MAX_IMPORT} kandidat per import. Anda mengirim ${candidates.length} kandidat.` 
            }, { status: 400 });
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
            const examCheck = await pool.query('SELECT id FROM exams WHERE id = $1', [examId]);
            if (examCheck.rows.length === 0) {
                return NextResponse.json({ error: 'Ujian tidak ditemukan' }, { status: 404 });
            }
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

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

            const generatedCodes: GeneratedCode[] = [];

            if (!useLegacyFormat) {
                // OPTIMIZED: New format with bulk insert
                const now = new Date();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const year = String(now.getFullYear()).slice(-2);
                const prefix = `${month}${year}-${internalCode}-`;

                // Filter valid candidates first
                const validCandidates = candidates.filter((c: any) => c.name?.trim());

                // ✅ ATOMIC: Use get_next_code_number function (race condition fix)
                const seqResult = await client.query(
                    'SELECT get_next_code_number($1) as next_num',
                    [prefix]
                );
                
                let nextNum = seqResult.rows[0]?.next_num || 1;

                // Reserve all numbers atomically if importing multiple
                if (validCandidates.length > 1) {
                    await client.query(`
                        UPDATE code_sequences 
                        SET next_num = next_num + $1 - 1, 
                            updated_at = CURRENT_TIMESTAMP
                        WHERE prefix = $2
                    `, [validCandidates.length, prefix]);
                }

                // Check if we have enough numbers
                if (nextNum + validCandidates.length - 1 > 9999) {
                    await client.query('ROLLBACK');
                    return NextResponse.json({ 
                        error: `Nomor urut tidak cukup. Tersisa ${9999 - nextNum + 1} nomor untuk kombinasi ini. Butuh ${validCandidates.length} nomor.` 
                    }, { status: 400 });
                }

                // Build bulk insert values
                const values: any[] = [];
                const placeholders: string[] = [];
                let paramIndex = 1;

                for (let i = 0; i < validCandidates.length; i++) {
                    const name = validCandidates[i].name.trim();
                    const code = `${prefix}${String(nextNum + i).padStart(4, '0')}`;
                    const metadata = JSON.stringify({ candidate_name: name });

                    placeholders.push(
                        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
                    );
                    values.push(
                        code,
                        user.id,                        // created_by
                        user.organizationId || null,    // admin_id (organization admin)
                        examId || null,                 // exam_id
                        expiresAt.toISOString(),        // expires_at
                        metadata,                       // metadata
                        companyCodeIdToUse              // company_code_id
                    );

                    generatedCodes.push({
                        id: 0, // Will be updated after insert
                        code,
                        candidate_name: name,
                        expires_at: expiresAt.toISOString()
                    });
                }

                if (placeholders.length > 0) {
                    // Single bulk insert - much faster than loop
                    // ✅ Same column order as generate API
                    await client.query(`
                        INSERT INTO candidate_codes (code, created_by, admin_id, exam_id, expires_at, metadata, company_code_id)
                        VALUES ${placeholders.join(', ')}
                    `, values);
                }

            } else {
                // Legacy format - individual inserts with collision check
                for (const candidate of candidates) {
                    const name = candidate.name?.trim();
                    if (!name) continue;

                    // Generate unique code with collision check
                    let code = generateLegacyCode();
                    let attempts = 0;
                    const maxAttempts = 10;

                    while (attempts < maxAttempts) {
                        const existing = await client.query(
                            'SELECT id FROM candidate_codes WHERE code = $1',
                            [code]
                        );
                        if (existing.rows.length === 0) break;
                        code = generateLegacyCode();
                        attempts++;
                    }

                    if (attempts === maxAttempts) continue;

                    const metadata = JSON.stringify({ candidate_name: name });

                    // ✅ Same column order as generate API
                    const result = await client.query(
                        `INSERT INTO candidate_codes (code, created_by, admin_id, exam_id, expires_at, metadata)
                         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
                         RETURNING id, code, expires_at`,
                        [code, user.id, user.organizationId || null, examId || null, expiresAt, metadata]
                    );

                    if (result.rows.length > 0) {
                        generatedCodes.push({
                            id: result.rows[0].id,
                            code: result.rows[0].code,
                            candidate_name: name,
                            expires_at: result.rows[0].expires_at
                        });
                    }
                }
            }

            await client.query('COMMIT');

            return NextResponse.json({
                success: true,
                message: `Berhasil import ${generatedCodes.length} kode`,
                codes: generatedCodes,
                format: useLegacyFormat ? 'legacy' : 'new'
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Import codes error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
