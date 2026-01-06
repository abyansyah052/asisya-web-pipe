import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { decrypt } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        
        if (!sessionCookie) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await decrypt(sessionCookie.value);
        if (!session) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }
        const userId = session.id;

        const body = await req.json();
        
        // Support both snake_case (frontend) and camelCase field names
        const fullName = body.full_name || body.fullName;
        const tanggalLahir = body.tanggal_lahir || body.tanggalLahir;
        const jenisKelamin = body.jenis_kelamin || body.jenisKelamin;
        const pendidikanTerakhir = body.pendidikan_terakhir || body.pendidikanTerakhir;
        const pekerjaan = body.pekerjaan;
        const lokasiTest = body.lokasi_test || body.lokasiTest;
        const alamatKtp = body.alamat_ktp || body.alamatKtp;
        const nik = body.nik;
        // Photo is optional
        const foto = body.foto || body.photo || null;

        // Validation - required fields
        if (!fullName || !tanggalLahir || !jenisKelamin || 
            !pendidikanTerakhir || !lokasiTest || !alamatKtp || !nik) {
            return NextResponse.json({ 
                error: 'Semua field wajib diisi (kecuali foto dan pekerjaan)',
                missing: {
                    fullName: !fullName,
                    tanggalLahir: !tanggalLahir,
                    jenisKelamin: !jenisKelamin,
                    pendidikanTerakhir: !pendidikanTerakhir,
                    lokasiTest: !lokasiTest,
                    alamatKtp: !alamatKtp,
                    nik: !nik
                }
            }, { status: 400 });
        }

        if (nik.length !== 16 || isNaN(Number(nik))) {
            return NextResponse.json({ error: 'NIK harus 16 digit angka' }, { status: 400 });
        }

        // Calculate age from tanggal_lahir
        const birthDate = new Date(tanggalLahir);
        const today = new Date();
        let usia = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            usia--;
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check if profile already exists
            const existingProfile = await client.query(
                'SELECT id FROM user_profiles WHERE user_id = $1',
                [userId]
            );

            if (existingProfile.rows.length > 0) {
                // Update existing profile
                await client.query(
                    `UPDATE user_profiles SET 
                        full_name = $1,
                        tanggal_lahir = $2,
                        usia = $3,
                        jenis_kelamin = $4,
                        pendidikan_terakhir = $5,
                        pekerjaan = $6,
                        lokasi_test = $7,
                        alamat_ktp = $8,
                        nik = $9,
                        foto = $10,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = $11`,
                    [fullName, tanggalLahir, usia, jenisKelamin, pendidikanTerakhir,
                     pekerjaan || null, lokasiTest, alamatKtp, nik, foto, userId]
                );
            } else {
                // Insert new profile
                await client.query(
                    `INSERT INTO user_profiles 
                        (user_id, full_name, tanggal_lahir, usia, jenis_kelamin,
                         pendidikan_terakhir, pekerjaan, lokasi_test, alamat_ktp, nik, foto)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [userId, fullName, tanggalLahir, usia, jenisKelamin,
                     pendidikanTerakhir, pekerjaan || null, lokasiTest, alamatKtp, nik, foto]
                );
            }

            // Update user's profile_completed flag and full_name
            await client.query(
                'UPDATE users SET profile_completed = true, full_name = $2 WHERE id = $1',
                [userId, fullName]
            );

            await client.query('COMMIT');

            // Update session cookie with JWT (must encrypt, not JSON.stringify)
            const { encrypt } = await import('@/lib/auth');
            const updatedToken = await encrypt({
                id: session.id,
                role: session.role,
                username: session.username,
                profileCompleted: true,
                organizationId: session.organizationId
            });

            const response = NextResponse.json({ success: true });
            response.cookies.set({
                name: 'user_session',
                value: updatedToken,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 8,
                path: '/',
            });

            return response;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Profile completion error:', error);
        return NextResponse.json({ error: 'Gagal menyimpan profil' }, { status: 500 });
    }
}
