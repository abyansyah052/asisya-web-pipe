import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import { getSession } from '@/lib/auth';
import { canAccessPsychologistFeatures } from '@/lib/roles';
import { verificationCodes } from '@/lib/verification-store';

export async function POST(req: Request) {
    try {
        // Auth check
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('user_session');
        const session = await getSession(sessionCookie?.value);

        if (!session || !canAccessPsychologistFeatures(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { examId } = await req.json();

        if (!examId) {
            return NextResponse.json({ error: 'Exam ID required' }, { status: 400 });
        }

        // Generate 6-digit random code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Store code (expires in 10 minutes)
        verificationCodes.set(examId, code, 10);
        
        console.log(`📧 Verification code for exam ${examId}: ${code}`);

        // Configure nodemailer (you need to set up SMTP credentials)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        // Send email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: 'berkasaby@gmail.com',
            subject: 'Kode Verifikasi Hapus Ujian - Asisya',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1e40af;">Kode Verifikasi Hapus Ujian</h2>
                    <p>Anda telah meminta untuk menghapus ujian dengan ID: <strong>${examId}</strong></p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #1e40af; font-size: 36px; margin: 0;">${code}</h1>
                    </div>
                    <p>Kode ini akan kedaluwarsa dalam 10 menit.</p>
                    <p style="color: #6b7280; font-size: 12px;">Jika Anda tidak meminta kode ini, abaikan email ini.</p>
                </div>
            `
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error sending verification code:', error);
        return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
    }
}
