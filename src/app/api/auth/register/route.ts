import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { ROLES } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const { email, fullName, password, username } = await req.json();

        // Validation
        if (!email || !password || !username) {
            return NextResponse.json({ error: 'Email, username, dan password wajib diisi' }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
        }

        // Validate username format (alphanumeric and underscore only)
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            return NextResponse.json({ error: 'Username hanya boleh mengandung huruf, angka, dan underscore' }, { status: 400 });
        }

        if (username.length < 3) {
            return NextResponse.json({ error: 'Username minimal 3 karakter' }, { status: 400 });
        }

        // Validate password (min 6 chars)
        if (password.length < 6) {
            return NextResponse.json({
                error: 'Password minimal 6 karakter'
            }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            // Check if email already exists
            const existingEmail = await client.query(
                'SELECT id FROM users WHERE email = $1',
                [email.toLowerCase()]
            );

            if (existingEmail.rows.length > 0) {
                return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 });
            }

            // Check if username already exists
            const existingUsername = await client.query(
                'SELECT id FROM users WHERE username = $1',
                [username.toLowerCase()]
            );

            if (existingUsername.rows.length > 0) {
                return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 });
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            // Insert user - Staff registration defaults to psychologist role
            // New psychologists are NOT active by default - requires Admin Owner approval
            const result = await client.query(
                `INSERT INTO users (username, email, full_name, password_hash, role, profile_completed, is_active) 
                 VALUES ($1, $2, $3, $4, $5, true, false) 
                 RETURNING id, username, email, full_name`,
                [username.toLowerCase(), email.toLowerCase(), fullName || null, passwordHash, ROLES.PSYCHOLOGIST]
            );

            return NextResponse.json({
                success: true,
                user: result.rows[0]
            }, { status: 201 });

        } finally {
            client.release();
        }
    } catch (error: unknown) {
        console.error('Registration error:', error);
        if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === '23505') {
            return NextResponse.json({ error: 'Email atau username sudah terdaftar' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Gagal mendaftar' }, { status: 500 });
    }
}
