'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Briefcase, MapPin, CreditCard, GraduationCap, User, Upload, ArrowRight, LogOut, Heart } from 'lucide-react';

const PENDIDIKAN_OPTIONS = ['SMP', 'SMA/K', 'D3/D4', 'S1', 'S2', 'S3'];
const MARITAL_STATUS_OPTIONS = ['Belum Kawin', 'Sudah Kawin'];

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
        marital_status: '',
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
                        marital_status: data.profile.marital_status || '',
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
            <header className="w-full bg-white border-b border-slate-200 px-3 sm:px-4 md:px-10 py-2.5 sm:py-3 sticky top-0 z-50 shadow-sm">
                <div className="max-w-[1280px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3 text-slate-900 min-w-0">
                        <img src="/asisya.png" alt="Asisya" className="h-8 sm:h-10 w-auto shrink-0" />
                        <h2 className="text-sm sm:text-lg font-bold tracking-tight truncate">Asisya Consulting</h2>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
                    >
                        <LogOut className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                        <span className="hidden sm:block">Log Out</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow w-full max-w-[960px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 flex flex-col gap-4 sm:gap-6">
                {/* Progress Bar */}
                <div className="flex flex-col gap-2 sm:gap-3">
                    <div className="flex justify-between items-center">
                        <p className="text-slate-900 text-xs sm:text-sm font-semibold uppercase tracking-wider">
                            Langkah 1 dari 2: Profil
                        </p>
                        <span className="text-slate-500 text-[10px] sm:text-xs font-medium">50%</span>
                    </div>
                    <div className="rounded-full bg-slate-200 h-1.5 sm:h-2 w-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: '50%' }}></div>
                    </div>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-1.5 sm:gap-2 mt-1 sm:mt-2">
                    <h1 className="text-slate-900 text-xl sm:text-2xl md:text-3xl lg:text-[32px] font-bold tracking-tight leading-tight">
                        Lengkapi Profil Anda
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed">
                        Pastikan detail Anda akurat sebelum melanjutkan ke penilaian. Informasi ini akan digunakan untuk sertifikat hasil.
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 md:p-8">
                    {/* Photo Section */}
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center pb-6 sm:pb-8 border-b border-slate-200 mb-6 sm:mb-8">
                        <div className="relative group">
                            <div className="aspect-square bg-gradient-to-br from-blue-500 to-blue-700 rounded-full h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 border-4 border-white shadow-lg flex items-center justify-center">
                                <User className="w-8 h-8 sm:w-10 sm:h-10 text-white/80" />
                            </div>
                            <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 sm:p-2 rounded-full hover:bg-blue-700 shadow-lg transition-all">
                                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                        </div>
                        <div className="flex flex-col items-center sm:items-start flex-1 text-center sm:text-left">
                            <h3 className="text-slate-900 text-base sm:text-lg md:text-xl font-bold">Foto Profil <span className="text-slate-400 text-xs sm:text-sm font-normal">(Opsional)</span></h3>
                            <p className="text-slate-500 text-xs sm:text-sm mt-1">
                                Format: JPG, PNG. Maksimal 2MB.
                            </p>
                        </div>
                        <button className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-10 px-4 sm:px-6 bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors">
                            <Upload className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                            <span className="hidden xs:inline">Unggah</span> Foto
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {/* Nama Lengkap */}
                        <div className="flex flex-col gap-1.5 sm:gap-2">
                            <label className="text-slate-700 text-xs sm:text-sm font-semibold">Nama Lengkap *</label>
                            <div className="relative">
                                <User className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    required
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm sm:text-base"
                                    placeholder="Nama lengkap sesuai KTP"
                                />
                            </div>
                        </div>

                        {/* NIK */}
                        <div className="flex flex-col gap-1.5 sm:gap-2">
                            <label className="text-slate-700 text-xs sm:text-sm font-semibold">NIK (Nomor KTP) *</label>
                            <div className="relative">
                                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    required
                                    name="nik"
                                    value={formData.nik}
                                    onChange={handleChange}
                                    className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm sm:text-base"
                                    placeholder="16 digit NIK"
                                    maxLength={16}
                                />
                            </div>
                        </div>

                        {/* Tanggal Lahir */}
                        <div className="flex flex-col gap-1.5 sm:gap-2">
                            <label className="text-slate-700 text-xs sm:text-sm font-semibold">Tanggal Lahir *</label>
                            <div className="relative">
                                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    required
                                    type="date"
                                    name="tanggal_lahir"
                                    value={formData.tanggal_lahir}
                                    onChange={handleChange}
                                    className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm sm:text-base"
                                />
                            </div>
                        </div>

                        {/* Jenis Kelamin */}
                        <div className="flex flex-col gap-1.5 sm:gap-2">
                            <label className="text-slate-700 text-xs sm:text-sm font-semibold">Jenis Kelamin *</label>
                            <div className="relative">
                                <User className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    required
                                    name="jenis_kelamin"
                                    value={formData.jenis_kelamin}
                                    onChange={handleChange}
                                    className="w-full pl-9 sm:pl-11 pr-8 sm:pr-10 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 text-slate-900 appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer text-sm sm:text-base"
                                >
                                    <option value="">Pilih jenis kelamin</option>
                                    <option value="Laki-laki">Laki-laki</option>
                                    <option value="Perempuan">Perempuan</option>
                                </select>
                                <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Status Pernikahan */}
                        <div className="flex flex-col gap-1.5 sm:gap-2">
                            <label className="text-slate-700 text-xs sm:text-sm font-semibold">Status Pernikahan *</label>
                            <div className="relative">
                                <Heart className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    required
                                    name="marital_status"
                                    value={formData.marital_status}
                                    onChange={handleChange}
                                    className="w-full pl-9 sm:pl-11 pr-8 sm:pr-10 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 text-slate-900 appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer text-sm sm:text-base"
                                >
                                    <option value="">Pilih status</option>
                                    {MARITAL_STATUS_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Pendidikan Terakhir */}
                        <div className="flex flex-col gap-1.5 sm:gap-2">
                            <label className="text-slate-700 text-xs sm:text-sm font-semibold">Pendidikan Terakhir *</label>
                            <div className="relative">
                                <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    required
                                    name="pendidikan_terakhir"
                                    value={formData.pendidikan_terakhir}
                                    onChange={handleChange}
                                    className="w-full pl-9 sm:pl-11 pr-8 sm:pr-10 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 text-slate-900 appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer text-sm sm:text-base"
                                >
                                    <option value="">Pilih pendidikan</option>
                                    {PENDIDIKAN_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Pekerjaan */}
                        <div className="flex flex-col gap-1.5 sm:gap-2">
                            <label className="text-slate-700 text-xs sm:text-sm font-semibold">Posisi / Pekerjaan <span className="text-slate-400 text-[10px] sm:text-xs font-normal">(Opsional)</span></label>
                            <div className="relative">
                                <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    name="pekerjaan"
                                    value={formData.pekerjaan}
                                    onChange={handleChange}
                                    className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm sm:text-base"
                                    placeholder="Contoh: Marketing Manager"
                                />
                            </div>
                        </div>

                        {/* Lokasi Test */}
                        <div className="flex flex-col gap-1.5 sm:gap-2">
                            <label className="text-slate-700 text-xs sm:text-sm font-semibold">Lokasi Test *</label>
                            <div className="relative">
                                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    required
                                    name="lokasi_test"
                                    value={formData.lokasi_test}
                                    onChange={handleChange}
                                    className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm sm:text-base"
                                    placeholder="Lokasi mengikuti test"
                                />
                            </div>
                        </div>

                        {/* Alamat KTP */}
                        <div className="flex flex-col gap-1.5 sm:gap-2 md:col-span-2">
                            <label className="text-slate-700 text-xs sm:text-sm font-semibold">Alamat sesuai KTP *</label>
                            <div className="relative">
                                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 sm:left-4 top-3 sm:top-4 text-slate-400" />
                                <textarea
                                    required
                                    name="alamat_ktp"
                                    value={formData.alamat_ktp}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-sm sm:text-base"
                                    placeholder="Alamat lengkap sesuai KTP"
                                />
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="md:col-span-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sm:gap-4 mt-3 sm:mt-4 pt-4 sm:pt-6 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors text-sm sm:text-base"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base active:scale-95"
                            >
                                {loading ? 'Menyimpan...' : (
                                    <>
                                        <span className="hidden sm:inline">Simpan Profil &</span> Lanjut
                                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Help Link */}
                <div className="flex justify-center pb-4 sm:pb-8">
                    <a className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 hover:text-blue-600 transition-colors" href="#">
                        <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
