import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessAdminFeatures } from '@/lib/roles';

// Generate random code - 16 alphanumeric characters (consistent with import)
function generateCode(): string {
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

        const { count = 1, examId, expiresInDays = 7, candidateName } = await req.json();

        if (count < 1 || count > 100) {
            return NextResponse.json({ error: 'Jumlah kode harus antara 1-100' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            const codes: string[] = [];
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);

            // Generate unique codes
            for (let i = 0; i < count; i++) {
                let code: string;
                let isUnique = false;

                // Keep generating until we get a unique code
                while (!isUnique) {
                    code = generateCode();
                    const existing = await client.query(
                        'SELECT id FROM candidate_codes WHERE code = $1',
                        [code]
                    );
                    if (existing.rows.length === 0) {
                        isUnique = true;

                        // Insert the code
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
                }
            }

            return NextResponse.json({
                success: true,
                codes,
                expiresAt: expiresAt.toISOString()
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error generating codes:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
