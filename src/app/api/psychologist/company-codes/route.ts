import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';
import { cookies } from 'next/headers';

// GET - List active company codes for psychologist dropdown
export async function GET(_request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessPsychologistFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get active company codes
        // For psychologist, show codes for their organization OR global codes
        let query = `
            SELECT 
                cc.id,
                cc.code,
                cc.company_name
            FROM company_codes cc
            WHERE cc.is_active = TRUE
        `;

        const params: any[] = [];

        if (session.organizationId) {
            query += ` AND (cc.organization_id = $1 OR cc.organization_id IS NULL)`;
            params.push(session.organizationId);
        }

        query += ` ORDER BY cc.code ASC`;

        const result = await pool.query(query, params);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching company codes:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
