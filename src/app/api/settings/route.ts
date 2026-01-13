import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

// ✅ Route segment config - allow caching for settings
export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 minutes
export const runtime = 'nodejs';

interface SiteSetting {
    id: number;
    setting_key: string;
    setting_value: string;
}

// Simple in-memory cache for settings
let settingsCache: Record<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 300000; // 5 minutes cache (settings jarang berubah)

// GET - Public endpoint for fetching site settings (no auth required)
export async function GET() {
    const startTime = Date.now();
    
    try {
        // Check cache first - return immediately if valid
        const now = Date.now();
        if (settingsCache && (now - cacheTimestamp) < CACHE_TTL) {
            const cacheAge = Math.floor((now - cacheTimestamp) / 1000);
            console.log(`✅ Settings from cache (age: ${cacheAge}s)`);
            return NextResponse.json(settingsCache, {
                headers: {
                    'Cache-Control': 'public, max-age=300, s-maxage=300'
                }
            });
        }

        const queryStart = Date.now();
        const settings = await query<SiteSetting>(
            'SELECT setting_key, setting_value FROM site_settings'
        );
        const queryTime = Date.now() - queryStart;
        
        console.log(`⏱️ Settings query: ${queryTime}ms (rows: ${settings.length})`);
        if (queryTime > 200) {
            console.warn(`⚠️ Slow settings query: ${queryTime}ms`);
        }

        // Convert to object format
        const settingsObj: Record<string, string> = {};
        settings.forEach(s => {
            settingsObj[s.setting_key] = s.setting_value;
        });

        // Update cache
        settingsCache = settingsObj;
        cacheTimestamp = now;

        const totalTime = Date.now() - startTime;
        console.log(`✅ Settings API: ${totalTime}ms total`);

        return NextResponse.json(settingsObj, {
            headers: {
                'Cache-Control': 'public, max-age=300, s-maxage=300'
            }
        });
    } catch (error) {
        console.error('Fetch site settings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Helper to invalidate cache
function invalidateCache() {
    settingsCache = null;
    cacheTimestamp = 0;
}

// PUT - Update site settings (admin and superadmin with cooldown)
export async function PUT(req: Request) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !['admin', 'super_admin'].includes(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Check admin access if not super_admin
        if (session.role === 'admin') {
            const accessSetting = await query<SiteSetting>(
                "SELECT setting_value FROM site_settings WHERE setting_key = 'admin_branding_access'"
            );
            
            if (accessSetting.length === 0 || accessSetting[0].setting_value !== 'true') {
                return NextResponse.json({ 
                    error: 'Hubungi super admin untuk mendapatkan akses fitur ini',
                    accessDenied: true
                }, { status: 403 });
            }
        }

        // Check 1 minute cooldown
        const lastUpdateSetting = await query<SiteSetting>(
            "SELECT setting_value FROM site_settings WHERE setting_key = 'last_branding_update'"
        );
        
        if (lastUpdateSetting.length > 0 && lastUpdateSetting[0].setting_value) {
            const lastUpdate = new Date(lastUpdateSetting[0].setting_value);
            const now = new Date();
            const diffMs = now.getTime() - lastUpdate.getTime();
            const diffSeconds = Math.floor(diffMs / 1000);
            
            if (diffSeconds < 60) {
                const remainingSeconds = 60 - diffSeconds;
                return NextResponse.json({ 
                    error: `Mohon tunggu ${remainingSeconds} detik lagi sebelum mengubah pengaturan`,
                    cooldown: true,
                    remainingSeconds
                }, { status: 429 });
            }
        }

        const body = await req.json();
        const { company_name, company_tagline, logo_url, primary_color } = body;

        // Update each setting if provided
        if (company_name !== undefined) {
            await query(
                'INSERT INTO site_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2',
                ['company_name', company_name]
            );
        }

        if (company_tagline !== undefined) {
            await query(
                'INSERT INTO site_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2',
                ['company_tagline', company_tagline]
            );
        }

        if (logo_url !== undefined) {
            await query(
                'INSERT INTO site_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2',
                ['logo_url', logo_url]
            );
        }

        if (primary_color !== undefined) {
            await query(
                'INSERT INTO site_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2',
                ['primary_color', primary_color]
            );
        }

        // Update last branding update timestamp and updater
        await query(
            'INSERT INTO site_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2',
            ['last_branding_update', new Date().toISOString()]
        );
        
        await query(
            'INSERT INTO site_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2',
            ['last_branding_updater', session.role]
        );

        // Invalidate cache after update
        invalidateCache();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update site settings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
