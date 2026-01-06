'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Briefcase, MapPin, CreditCard, GraduationCap, User, Upload, ArrowRight, LogOut } from 'lucide-react';

const PENDIDIKAN_OPTIONS = ['SMP', 'SMA/K', 'D3/D4', 'S1', 'S2', 'S3'];

export default function ProfileCompletionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        tanggal_lahir: '',
        jenis_kelamin: '',
        pendidikan_terakhir: '',
        pekerjaan: '',
        lokasi_test: '',
        alamat_ktp: '',
        nik: '',
    });

    useEffect(() => {
        // Pre-fill from session if available
        fetchExistingProfile();
    }, []);

    const fetchExistingProfile = async () => {
        try {
            const res = await fetch('/api/candidate/profile-completion');
            if (res.ok) {
                const data = await res.json();
                if (data.profile) {
                    setFormData({
                        full_name: data.profile.full_name || '',
                        tanggal_lahir: data.profile.tanggal_lahir ? data.profile.tanggal_lahir.split('T')[0] : '',
                        jenis_kelamin: data.profile.jenis_kelamin || '',
                        pendidikan_terakhir: data.profile.pendidikan_terakhir || '',
                        pekerjaan: data.profile.pekerjaan || '',
                        lokasi_test: data.profile.lokasi_test || '',
                        alamat_ktp: data.profile.alamat_ktp || '',
                        nik: data.profile.nik || '',
                    });
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/candidate/profile-completion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include', // Ensure cookies are sent and received
            });

            if (res.ok) {
                // Wait a moment for cookie to be set, then navigate
                await new Promise(resolve => setTimeout(resolve, 100));
                window.location.href = '/candidate/dashboard'; // Full page reload to ensure new session is used
            } else {
                const data = await res.json();
                alert(data.error || 'Gagal menyimpan profil');
            }
        } catch (err) {
            alert('Terjadi kesalahan');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            {/* Header */}
            <header className="w-full bg-white border-b border-slate-200 px-4 sm:px-10 py-3 sticky top-0 z-50 shadow-sm">
                <div className="max-w-[1280px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 text-slate-900">
                        <img src="/asisya.png" alt="Asisya" className="h-10 w-auto" />
                        <h2 className="text-lg font-bold tracking-tight">Asisya Consulting</h2>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <LogOut size={18} />
                        <span className="hidden sm:block">Log Out</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow w-full max-w-[960px] mx-auto px-4 sm:px-6 md:px-8 py-8 flex flex-col gap-6">
                {/* Progress Bar */}
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <p className="text-slate-900 text-sm font-semibold uppercase tracking-wider">
                            Langkah 1 dari 2: Pengaturan Profil
                        </p>
                        <span className="text-slate-500 text-xs font-medium">50% Completed</span>
                    </div>
                    <div className="rounded-full bg-slate-200 h-2 w-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: '50%' }}></div>
                    </div>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-2 mt-2">
                    <h1 className="text-slate-900 text-3xl md:text-[32px] font-bold tracking-tight leading-tight">
                        Lengkapi Profil Anda
                    </h1>
                    <p className="text-slate-500 text-base max-w-2xl leading-relaxed">
                        Harap pastikan detail Anda akurat sebelum melanjutkan ke penilaian psikologis.
                        Informasi ini akan digunakan untuk sertifikat hasil dan identifikasi.
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                    {/* Photo Section */}
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center pb-8 border-b border-slate-200 mb-8">
                        <div className="relative group">
                            <div className="aspect-square bg-gradient-to-br from-blue-500 to-blue-700 rounded-full h-24 w-24 md:h-28 md:w-28 border-4 border-white shadow-lg flex items-center justify-center">
                                <User size={40} className="text-white/80" />
                            </div>
                            <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow-lg transition-all">
                                <Upload size={16} />
                            </button>
                        </div>
                        <div className="flex flex-col justify-center flex-1">
                            <h3 className="text-slate-900 text-xl font-bold">Foto Profil <span className="text-slate-400 text-sm font-normal">(Opsional)</span></h3>
                            <p className="text-slate-500 text-sm mt-1">
                                Unggah foto profesional terbaru Anda. Format: JPG, PNG. Maksimal 2MB.
                            </p>
                        </div>
                        <button className="flex items-center gap-2 h-10 px-6 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors">
                            <Upload size={18} />
                            Unggah Foto
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nama Lengkap */}
                        <div className="flex flex-col gap-2">
                            <label className="text-slate-700 text-sm font-semibold">Nama Lengkap *</label>
                            <div className="relative">
                                <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    required
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Masukkan nama lengkap sesuai KTP"
                                />
                            </div>
                        </div>

                        {/* NIK */}
                        <div className="flex flex-col gap-2">
                            <label className="text-slate-700 text-sm font-semibold">NIK (Nomor KTP) *</label>
                            <div className="relative">
                                <CreditCard size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    required
                                    name="nik"
                                    value={formData.nik}
                                    onChange={handleChange}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="16 digit NIK"
                                    maxLength={16}
                                />
                            </div>
                        </div>

                        {/* Tanggal Lahir */}
                        <div className="flex flex-col gap-2">
                            <label className="text-slate-700 text-sm font-semibold">Tanggal Lahir *</label>
                            <div className="relative">
                                <Calendar size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    required
                                    type="date"
                                    name="tanggal_lahir"
                                    value={formData.tanggal_lahir}
                                    onChange={handleChange}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Jenis Kelamin */}
                        <div className="flex flex-col gap-2">
                            <label className="text-slate-700 text-sm font-semibold">Jenis Kelamin *</label>
                            <div className="relative">
                                <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    required
                                    name="jenis_kelamin"
                                    value={formData.jenis_kelamin}
                                    onChange={handleChange}
                                    className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                                >
                                    <option value="">Pilih jenis kelamin</option>
                                    <option value="Laki-laki">Laki-laki</option>
                                    <option value="Perempuan">Perempuan</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Pendidikan Terakhir */}
                        <div className="flex flex-col gap-2">
                            <label className="text-slate-700 text-sm font-semibold">Pendidikan Terakhir *</label>
                            <div className="relative">
                                <GraduationCap size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    required
                                    name="pendidikan_terakhir"
                                    value={formData.pendidikan_terakhir}
                                    onChange={handleChange}
                                    className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                                >
                                    <option value="">Pilih tingkat pendidikan</option>
                                    {PENDIDIKAN_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Pekerjaan */}
                        <div className="flex flex-col gap-2">
                            <label className="text-slate-700 text-sm font-semibold">Posisi / Pekerjaan <span className="text-slate-400 text-xs font-normal">(Opsional)</span></label>
                            <div className="relative">
                                <Briefcase size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    name="pekerjaan"
                                    value={formData.pekerjaan}
                                    onChange={handleChange}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Contoh: Senior Marketing Manager"
                                />
                            </div>
                        </div>

                        {/* Lokasi Test */}
                        <div className="flex flex-col gap-2">
                            <label className="text-slate-700 text-sm font-semibold">Lokasi Test *</label>
                            <div className="relative">
                                <MapPin size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    required
                                    name="lokasi_test"
                                    value={formData.lokasi_test}
                                    onChange={handleChange}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Lokasi mengikuti test"
                                />
                            </div>
                        </div>

                        {/* Alamat KTP */}
                        <div className="flex flex-col gap-2 md:col-span-2">
                            <label className="text-slate-700 text-sm font-semibold">Alamat sesuai KTP *</label>
                            <div className="relative">
                                <MapPin size={20} className="absolute left-4 top-4 text-slate-400" />
                                <textarea
                                    required
                                    name="alamat_ktp"
                                    value={formData.alamat_ktp}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                                    placeholder="Masukkan alamat lengkap sesuai KTP"
                                />
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="md:col-span-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-4 mt-4 pt-6 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full sm:w-auto px-6 py-3 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Menyimpan...' : (
                                    <>
                                        Simpan Profil & Lanjut
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Help Link */}
                <div className="flex justify-center pb-8">
                    <a className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors" href="#">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Butuh bantuan? Hubungi Admin
                    </a>
                </div>
            </main>
        </div>
    );
}
