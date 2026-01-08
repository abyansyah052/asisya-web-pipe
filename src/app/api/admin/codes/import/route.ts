import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

// Generate random code - 16 characters for standard
function generateCode(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
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

// POST - Import multiple codes from Excel data
export async function POST(req: NextRequest) {
    try {
        // ✅ Use user_session cookie (fixed from auth_token)
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');

        const user = await getSession(sessionCookie?.value);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admin and super_admin can import codes
        if (!['admin', 'super_admin'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { candidates, examId, expiresInDays } = await req.json();

        if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
            return NextResponse.json({ error: 'Candidates data is required' }, { status: 400 });
        }

        // Validate examId if provided
        if (examId) {
            const examCheck = await query<{ id: number }>('SELECT id FROM exams WHERE id = $1', [examId]);
            if (examCheck.length === 0) {
                return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
            }
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

        const generatedCodes: GeneratedCode[] = [];

        for (const candidate of candidates) {
            const name = candidate.name?.trim();
            if (!name) continue;

            // Generate unique code
            let code = generateCode();
            let attempts = 0;
            const maxAttempts = 10;

            while (attempts < maxAttempts) {
                const existing = await query<{ id: number }>('SELECT id FROM candidate_codes WHERE code = $1', [code]);
                if (existing.length === 0) break;
                code = generateCode();
                attempts++;
            }

            if (attempts === maxAttempts) {
                continue; // Skip if can't generate unique code
            }

            // ✅ Use metadata JSONB field for candidate_name (fixed from direct column)
            const metadata = JSON.stringify({ candidate_name: name });

            // Insert code with created_by from session
            const result = await query<{ id: number; code: string; expires_at: string }>(
                `INSERT INTO candidate_codes (code, exam_id, expires_at, is_active, metadata, created_by, created_at)
                 VALUES ($1, $2, $3, true, $4::jsonb, $5, NOW())
                 RETURNING id, code, expires_at`,
                [code, examId || null, expiresAt, metadata, user.id]
            );

            if (result.length > 0) {
                generatedCodes.push({
                    id: result[0].id,
                    code: result[0].code,
                    candidate_name: name,
                    expires_at: result[0].expires_at
                });
            }
        }

        return NextResponse.json({
            message: `Successfully imported ${generatedCodes.length} codes`,
            codes: generatedCodes
        });

    } catch (error) {
        console.error('Import codes error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
