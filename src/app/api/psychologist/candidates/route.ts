import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession, ROLES } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessPsychologistFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse pagination params
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
        const offset = (page - 1) * limit;
        const search = searchParams.get('search')?.trim() || '';

        const client = await pool.connect();
        try {
            // Build WHERE clause with organization filter
            const conditions = ['u.role = $1'];
            const params: (string | number | null)[] = [ROLES.CANDIDATE];
            let paramIndex = 2;

            // 🔒 SECURITY: Add organization filter
            // Psychologist can only see candidates from their organization
            if (session.organizationId) {
                conditions.push(`u.organization_id = $${paramIndex}`);
                params.push(session.organizationId);
                paramIndex++;
            }

            // Search filter
            if (search) {
                conditions.push(`(u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
                params.push(`%${search}%`);
                paramIndex++;
            }

            const whereClause = conditions.join(' AND ');

            // Get total count for pagination
            const countQuery = `SELECT COUNT(*) FROM users u WHERE ${whereClause}`;
            const countResult = await client.query(countQuery, params);
            const total = parseInt(countResult.rows[0].count);

            // Get paginated candidates with their exam stats
            const query = `
                SELECT 
                    u.id,
                    u.full_name,
                    u.email,
                    u.created_at,
                    COUNT(DISTINCT ea.id) as exam_count,
                    COUNT(DISTINCT CASE WHEN ea.status = 'completed' THEN ea.id END) as completed_count,
                    MAX(CASE WHEN ea.status = 'completed' THEN ea.end_time END) as last_exam_date
                FROM users u
                LEFT JOIN exam_attempts ea ON u.id = ea.user_id
                WHERE ${whereClause}
                GROUP BY u.id
                ORDER BY u.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
            
            const result = await client.query(query, [...params, limit, offset]);
            
            return NextResponse.json({
                data: result.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching candidates:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
