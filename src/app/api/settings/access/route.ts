import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

interface SiteSetting {
    setting_key: string;
    setting_value: string;
}

// GET - Get admin access status
export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !['admin', 'super_admin'].includes(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const accessSetting = await query<SiteSetting>(
            "SELECT setting_value FROM site_settings WHERE setting_key = 'admin_branding_access'"
        );

        const lastUpdateSetting = await query<SiteSetting>(
            "SELECT setting_value FROM site_settings WHERE setting_key = 'last_branding_update'"
        );

        const lastUpdaterSetting = await query<SiteSetting>(
            "SELECT setting_value FROM site_settings WHERE setting_key = 'last_branding_updater'"
        );

        // Calculate cooldown
        let cooldownRemaining = 0;
        if (lastUpdateSetting.length > 0 && lastUpdateSetting[0].setting_value) {
            const lastUpdate = new Date(lastUpdateSetting[0].setting_value);
            const now = new Date();
            const diffMs = now.getTime() - lastUpdate.getTime();
            const diffSeconds = Math.floor(diffMs / 1000);
            
            if (diffSeconds < 60) {
                cooldownRemaining = 60 - diffSeconds;
            }
        }

        return NextResponse.json({
            adminAccessEnabled: accessSetting.length > 0 ? accessSetting[0].setting_value === 'true' : false,
            lastUpdate: lastUpdateSetting.length > 0 ? lastUpdateSetting[0].setting_value : null,
            lastUpdater: lastUpdaterSetting.length > 0 ? lastUpdaterSetting[0].setting_value : null,
            cooldownRemaining
        });
    } catch (error) {
        console.error('Fetch access settings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT - Update admin access (superadmin only)
export async function PUT(req: Request) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || session.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { adminAccessEnabled } = body;

        await query(
            'INSERT INTO site_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2',
            ['admin_branding_access', adminAccessEnabled ? 'true' : 'false']
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update access settings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
