'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, User, Mail, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [successModal, setSuccessModal] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const validateEmail = (email: string) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const validatePassword = (password: string) => {
        return password.length >= 8;
    };

    const handleBlur = (field: string) => {
        const newErrors = { ...errors };

        if (field === 'fullName') {
            if (!formData.fullName || formData.fullName.trim().length < 3) {
                newErrors.fullName = 'Nama lengkap minimal 3 karakter';
            } else {
                delete newErrors.fullName;
            }
        }

        if (field === 'email') {
            if (!formData.email) {
                newErrors.email = 'Email harus diisi';
            } else if (!validateEmail(formData.email)) {
                newErrors.email = 'Format email tidak valid';
            } else {
                delete newErrors.email;
            }
        }

        if (field === 'username') {
            if (!formData.username || formData.username.trim().length < 3) {
                newErrors.username = 'Username minimal 3 karakter';
            } else if (!/^[a-zA-Z0-9._]+$/.test(formData.username)) {
                newErrors.username = 'Username hanya boleh huruf, angka, titik, dan underscore';
            } else {
                delete newErrors.username;
            }
        }

        if (field === 'password') {
            if (!formData.password) {
                newErrors.password = 'Password harus diisi';
            } else if (!validatePassword(formData.password)) {
                newErrors.password = 'Password minimal 8 karakter';
            } else {
                delete newErrors.password;
            }
        }

        if (field === 'confirmPassword') {
            if (formData.confirmPassword !== formData.password) {
                newErrors.confirmPassword = 'Password tidak cocok';
            } else {
                delete newErrors.confirmPassword;
            }
        }

        setErrors(newErrors);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all fields
        const newErrors: { [key: string]: string } = {};

        if (!formData.fullName || formData.fullName.trim().length < 3) {
            newErrors.fullName = 'Nama lengkap minimal 3 karakter';
        }
        if (!formData.email || !validateEmail(formData.email)) {
            newErrors.email = 'Email tidak valid';
        }
        if (!formData.username || formData.username.trim().length < 3) {
            newErrors.username = 'Username minimal 3 karakter';
        }
        if (!validatePassword(formData.password)) {
            newErrors.password = 'Password minimal 8 karakter';
        }
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Password tidak cocok';
        }
        if (!agreedToTerms) {
            newErrors.terms = 'Anda harus menyetujui syarat dan ketentuan';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    fullName: formData.fullName,
                    username: formData.username,
                    password: formData.password
                })
            });

            if (res.ok) {
                setSuccessModal(true);
                setTimeout(() => {
                    router.push('/adminpsi');
                }, 2500);
            } else {
                const error = await res.json();
                setErrors({ submit: error.error || 'Registrasi gagal' });
            }
        } catch {
            setErrors({ submit: 'Terjadi kesalahan saat registrasi' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-200">
            {/* Success Modal */}
            {successModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl animate-bounce-in">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-12 h-12 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">Registrasi Berhasil!</h3>
                        <p className="text-gray-600 mb-2">Akun Anda telah dibuat.</p>
                        <p className="text-sm text-amber-600 font-medium">
                            Akun akan aktif setelah disetujui oleh Admin Owner.
                        </p>
                        <p className="text-xs text-gray-400 mt-4">Mengalihkan ke halaman login...</p>
                    </div>
                </div>
            )}

            <div className="w-full max-w-[1100px] min-h-[700px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
                {/* Left Side - Hero Image */}
                <div
                    className="relative w-full lg:w-1/2 h-64 lg:h-auto bg-cover bg-center flex flex-col justify-between p-8 lg:p-12 text-white"
                    style={{
                        backgroundImage: `linear-gradient(to bottom right, rgba(37, 99, 235, 0.85), rgba(15, 23, 42, 0.90)), url('https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200')`,
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <img src="/asisya.png" alt="Asisya" className="h-10 w-auto brightness-0 invert" />
                        <span className="text-lg font-bold">Asisya Consulting</span>
                    </div>

                    {/* Main Content */}
                    <div className="relative z-10 flex flex-col gap-5">
                        <h1 className="text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
                            Platform Asesmen<br />Profesional<br />Terpercaya
                        </h1>
                        <p className="text-white/80 text-base font-light leading-relaxed max-w-sm">
                            Kelola data psikologis dan administrasi klien Anda dalam satu platform yang aman dan terintegrasi.
                        </p>

                        {/* Stats */}
                        <div className="flex items-center gap-3 mt-4">
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full bg-blue-400 border-2 border-white flex items-center justify-center text-xs font-bold">P</div>
                                <div className="w-8 h-8 rounded-full bg-indigo-400 border-2 border-white flex items-center justify-center text-xs font-bold">S</div>
                                <div className="w-8 h-8 rounded-full bg-purple-400 border-2 border-white flex items-center justify-center text-xs font-bold">K</div>
                            </div>
                            <div className="text-sm">
                                <span className="font-semibold">1,000+ Psikolog</span>
                                <p className="text-white/70 text-xs">Bergabung bersama kami</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-white/60 mt-auto pt-8">
                        <span>© 2025 Asisya Consulting</span>
                        <div className="flex gap-4">
                            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
                            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full lg:w-1/2 bg-white p-8 lg:p-12 flex flex-col justify-center overflow-y-auto">
                    {/* Logo for mobile */}
                    <div className="flex lg:hidden items-center gap-3 mb-6">
                        <img src="/asisya.png" alt="Asisya" className="h-10 w-auto" />
                        <h2 className="text-xl font-bold text-slate-900">Asisya Consulting</h2>
                    </div>

                    <div className="mb-6">
                        <h1 className="text-slate-900 tracking-tight text-2xl lg:text-3xl font-bold leading-tight mb-2">
                            Buat Akun Baru
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Bergabung dengan Asisya Consulting untuk memulai.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
                        {/* Nama Lengkap */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-slate-700 text-sm font-semibold">Nama Lengkap</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    onBlur={() => handleBlur('fullName')}
                                    className={`w-full rounded-xl border ${errors.fullName ? 'border-red-400' : 'border-slate-200'} bg-slate-50 h-12 px-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none`}
                                    placeholder="Masukkan nama lengkap"
                                />
                            </div>
                            {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
                        </div>

                        {/* Email */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-slate-700 text-sm font-semibold">Email</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    onBlur={() => handleBlur('email')}
                                    className={`w-full rounded-xl border ${errors.email ? 'border-red-400' : 'border-slate-200'} bg-slate-50 h-12 px-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none`}
                                    placeholder="nama@perusahaan.com"
                                />
                            </div>
                            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                        </div>

                        {/* Username */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-slate-700 text-sm font-semibold">Username</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    onBlur={() => handleBlur('username')}
                                    className={`w-full rounded-xl border ${errors.username ? 'border-red-400' : 'border-slate-200'} bg-slate-50 h-12 px-4 pr-12 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none`}
                                    placeholder="Buat username unik"
                                />
                                <User size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                            {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
                        </div>

                        {/* Password Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Password */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-slate-700 text-sm font-semibold">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        onBlur={() => handleBlur('password')}
                                        className={`w-full rounded-xl border ${errors.password ? 'border-red-400' : 'border-slate-200'} bg-slate-50 h-12 px-4 pr-12 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none`}
                                        placeholder="Min. 8 karakter"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                            </div>

                            {/* Confirm Password */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-slate-700 text-sm font-semibold">Konfirmasi Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        onBlur={() => handleBlur('confirmPassword')}
                                        className={`w-full rounded-xl border ${errors.confirmPassword ? 'border-red-400' : 'border-slate-200'} bg-slate-50 h-12 px-4 pr-12 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none`}
                                        placeholder="Ulangi password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
                            </div>
                        </div>

                        {/* Terms Checkbox */}
                        <div className="flex items-start gap-3 mt-1">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="terms" className="text-sm text-slate-600">
                                Saya setuju dengan{' '}
                                <Link href="#" className="text-blue-600 hover:text-blue-700 font-semibold">
                                    Syarat & Ketentuan
                                </Link>
                            </label>
                        </div>
                        {errors.terms && <p className="text-xs text-red-500 -mt-2">{errors.terms}</p>}

                        {/* Submit Error */}
                        {errors.submit && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium">
                                {errors.submit}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-sm font-bold tracking-wide transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Mendaftar...' : (
                                <>
                                    Daftar Sekarang
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <div className="mt-6 text-center">
                        <p className="text-slate-500 text-sm">
                            Sudah punya akun?{' '}
                            <button
                                onClick={() => router.push('/adminpsi')}
                                className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                            >
                                Masuk di sini
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes bounce-in {
                    0% { transform: scale(0.9); opacity: 0; }
                    50% { transform: scale(1.02); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-bounce-in {
                    animation: bounce-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
