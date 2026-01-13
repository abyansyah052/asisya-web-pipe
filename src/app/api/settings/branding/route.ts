import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

interface BrandingPreset {
    id: number;
    name: string;
    logo_url: string;
    company_name: string;
    company_tagline: string;
    primary_color: string;
    is_default: boolean;
    created_at: string;
}

// GET - Fetch all saved branding presets (admin and superadmin)
export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !['admin', 'super_admin'].includes(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const presets = await query<BrandingPreset>(
            'SELECT id, name, logo_url, company_name, company_tagline, primary_color, is_default, created_at FROM branding_presets ORDER BY is_default DESC, created_at DESC'
        );

        return NextResponse.json(presets);
    } catch (error) {
        console.error('Fetch branding presets error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Add new branding preset
export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !['admin', 'super_admin'].includes(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { name, logo_url, company_name, company_tagline, primary_color } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Check if name already exists
        const existing = await query<BrandingPreset>(
            'SELECT id FROM branding_presets WHERE name = $1',
            [name]
        );

        if (existing.length > 0) {
            return NextResponse.json({ error: 'Preset dengan nama ini sudah ada', existingId: existing[0].id }, { status: 409 });
        }

        const result = await query<BrandingPreset>(
            `INSERT INTO branding_presets (name, logo_url, company_name, company_tagline, primary_color, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, name, logo_url, company_name, company_tagline, primary_color, is_default, created_at`,
            [
                name, 
                logo_url || '/asisya.png', 
                company_name || 'Asisya Consulting', 
                company_tagline || 'Platform asesmen psikologi profesional', 
                primary_color || '#0891b2',
                session.id
            ]
        );

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('Add branding preset error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Remove branding preset (except default)
export async function DELETE(req: Request) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !['admin', 'super_admin'].includes(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Check if it's a default preset
        const preset = await query<BrandingPreset>(
            'SELECT is_default FROM branding_presets WHERE id = $1',
            [id]
        );

        if (preset.length === 0) {
            return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
        }

        if (preset[0].is_default) {
            return NextResponse.json({ error: 'Cannot delete default preset' }, { status: 400 });
        }

        await query('DELETE FROM branding_presets WHERE id = $1', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete branding preset error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
