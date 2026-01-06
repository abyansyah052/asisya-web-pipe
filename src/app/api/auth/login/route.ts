import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { encrypt, getLoginRedirect, ROLES } from '@/lib/auth';
import { loginRateLimiter, checkRateLimit } from '@/lib/ratelimit';

// =============================================
// OPTIMIZED LOGIN API FOR 800 CONCURRENT USERS
// =============================================

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Non-blocking rate limit check (1s timeout)
        const ip = req.headers.get('x-forwarded-for') ||
            req.headers.get('x-real-ip') ||
            'unknown';
        const identifier = `${username}:${ip}`;

        const rateLimit = await checkRateLimit(loginRateLimiter, identifier, 1000);
        if (!rateLimit.success) {
            return NextResponse.json(
                { error: 'Terlalu banyak percobaan login. Coba lagi nanti.' },
                { status: 429 }
            );
        }

        // Query user - use pool.query directly (no client.connect overhead)
        const result = await pool.query(
            'SELECT id, username, password_hash, role, is_active, profile_completed FROM users WHERE username = $1 OR email = $1 LIMIT 1',
            [username]
        );
        const user = result.rows[0];

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Check if psychologist is active
        if (user.role === ROLES.PSYCHOLOGIST && !user.is_active) {
            return NextResponse.json({
                error: 'Akun Anda belum diaktifkan oleh Admin.'
            }, { status: 403 });
        }

        // Block candidates from admin login
        if (user.role === ROLES.CANDIDATE) {
            return NextResponse.json({
                error: 'Gunakan kode akses di halaman utama.'
            }, { status: 403 });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Create session JWT
        const sessionData = {
            id: user.id,
            role: user.role,
            username: user.username,
            profileCompleted: user.profile_completed
        };
        const token = await encrypt(sessionData);
        const redirectPath = getLoginRedirect(user.role);

        const response = NextResponse.json({
            success: true,
            role: user.role,
            redirect: redirectPath
        });

        // Set secure cookie
        response.cookies.set({
            name: 'user_session',
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 8, // 8 hours
            path: '/',
        });

        return response;

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
