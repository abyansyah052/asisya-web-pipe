import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('user_session');

    const session = await getSession(sessionCookie?.value);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has psychologist features access (psychologist, admin, super_admin)
    if (!canAccessPsychologistFeatures(session.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const userId = parseInt(params.id);

    try {
        // Get user basic info with access code (nomor peserta)
        // ✅ Use COALESCE to prefer user_profiles.full_name > users.full_name > username
        const userResult = await pool.query(
            `SELECT u.id, u.username, u.email, 
                    COALESCE(up.full_name, u.full_name, u.username) as full_name,
                    u.created_at, u.profile_completed,
                    cc.code as nomor_peserta
             FROM users u
             LEFT JOIN user_profiles up ON up.user_id = u.id
             LEFT JOIN candidate_codes cc ON cc.candidate_id = u.id
             WHERE u.id = $1 AND u.role = $2`,
            [userId, 'candidate']
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'Kandidat tidak ditemukan' }, { status: 404 });
        }

        const user = userResult.rows[0];

        // Get profile data if completed
        let profile = null;
        if (user.profile_completed) {
            const profileResult = await pool.query(
                'SELECT * FROM user_profiles WHERE user_id = $1',
                [userId]
            );
            profile = profileResult.rows[0] || null;
        }

        return NextResponse.json({
            ...user,
            profile
        });
    } catch (error) {
        console.error('Error fetching candidate detail:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
