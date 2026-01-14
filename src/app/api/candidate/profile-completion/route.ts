import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

// GET - Fetch existing profile data
export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        
        const user = await getSession(sessionCookie?.value);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ✅ Fetch profile data from user_profiles table + candidate_name from candidate_codes
        const profiles = await query<any>(
            `SELECT up.full_name, up.tanggal_lahir, up.jenis_kelamin, up.pendidikan_terakhir, 
                    up.pekerjaan, up.lokasi_test, up.alamat_ktp, up.nik, up.marital_status, up.foto,
                    u.profile_completed,
                    COALESCE(cc.metadata->>'candidate_name', cc.metadata->>'name') as candidate_name_from_code
             FROM users u
             LEFT JOIN user_profiles up ON u.id = up.user_id
             LEFT JOIN candidate_codes cc ON u.id = cc.candidate_id
             WHERE u.id = $1
             ORDER BY cc.used_at DESC
             LIMIT 1`,
            [user.id]
        );

        if (profiles.length === 0) {
            return NextResponse.json({ profile: null });
        }

        const profile = profiles[0];
        
        // If full_name is empty, use candidate_name from code metadata
        if (!profile.full_name && profile.candidate_name_from_code) {
            profile.full_name = profile.candidate_name_from_code;
        }

        return NextResponse.json({ profile });
    } catch (error) {
        console.error('Profile fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Save/update profile data
export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        
        const user = await getSession(sessionCookie?.value);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            full_name,
            tanggal_lahir,
            jenis_kelamin,
            pendidikan_terakhir,
            pekerjaan,
            lokasi_test,
            alamat_ktp,
            nik,
            marital_status,
            foto
        } = body;

        // Validate required fields
        if (!full_name || !tanggal_lahir || !alamat_ktp || !nik || !marital_status) {
            return NextResponse.json({ error: 'Field wajib harus diisi' }, { status: 400 });
        }

        // ✅ Check if profile exists
        const existingProfile = await query<{ id: number }>(
            'SELECT id FROM user_profiles WHERE user_id = $1',
            [user.id]
        );

        if (existingProfile.length > 0) {
            // ✅ UPDATE existing profile in user_profiles table
            await query(
                `UPDATE user_profiles SET 
                    full_name = $1,
                    tanggal_lahir = $2,
                    jenis_kelamin = $3,
                    pendidikan_terakhir = $4,
                    pekerjaan = $5,
                    lokasi_test = $6,
                    alamat_ktp = $7,
                    nik = $8,
                    marital_status = $9,
                    foto = $10,
                    updated_at = NOW()
                 WHERE user_id = $11`,
                [
                    full_name,
                    tanggal_lahir,
                    jenis_kelamin || null,
                    pendidikan_terakhir || null,
                    pekerjaan || null,
                    lokasi_test || null,
                    alamat_ktp,
                    nik,
                    marital_status,
                    foto || null,
                    user.id
                ]
            );
        } else {
            // ✅ INSERT new profile into user_profiles table
            await query(
                `INSERT INTO user_profiles 
                    (user_id, full_name, tanggal_lahir, jenis_kelamin, pendidikan_terakhir, 
                     pekerjaan, lokasi_test, alamat_ktp, nik, marital_status, foto, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
                [
                    user.id,
                    full_name,
                    tanggal_lahir,
                    jenis_kelamin || null,
                    pendidikan_terakhir || null,
                    pekerjaan || null,
                    lokasi_test || null,
                    alamat_ktp,
                    nik,
                    marital_status,
                    foto || null
                ]
            );
        }

        // ✅ Update profile_completed flag in users table
        await query(
            'UPDATE users SET profile_completed = true WHERE id = $1',
            [user.id]
        );

        return NextResponse.json({ 
            success: true,
            message: 'Profile saved successfully' 
        });
    } catch (error) {
        console.error('Profile save error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
