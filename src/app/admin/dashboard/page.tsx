'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserCog, LogOut, ClipboardList, Building2, BarChart3, Settings, KeyRound } from 'lucide-react';

interface DashboardStats {
    totalPsychologists: number;
    totalCandidates: number;
    totalExams: number;
    activeSessions: number;
}

interface Quota {
    maxPsychologists: number;
    maxCandidates: number;
    maxExams: number;
    usedPsychologists: number;
    usedCandidates: number;
    usedExams: number;
    validUntil: string | null;
}

export default function AdminOwnerDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats>({
        totalPsychologists: 0,
        totalCandidates: 0,
        totalExams: 0,
        activeSessions: 0
    });
    const [quota, setQuota] = useState<Quota | null>(null);
    const [loading, setLoading] = useState(true);
    const [orgName, setOrgName] = useState('');

    useEffect(() => {
        fetchStats();
        fetchQuota();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats');
            if (res.status === 401 || res.status === 403) {
                router.push('/adminpsi');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setOrgName(data.organization?.name || 'Organisasi');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuota = async () => {
        try {
            const res = await fetch('/api/admin/quota');
            if (res.ok) {
                const data = await res.json();
                setQuota(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/adminpsi');
    };

    const getQuotaPercentage = (used: number, max: number) => {
        if (max === 0) return 0;
        return Math.min(Math.round((used / max) * 100), 100);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10 backdrop-blur-sm bg-white/95">
                <div className="flex items-center gap-3">
                    <img src="/asisya.png" alt="Asisya" className="h-10 w-auto" />
                    <div>
                        <h1 className="text-xl font-bold text-blue-800">Admin Panel</h1>
                        <p className="text-xs text-gray-500">{orgName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full">
                        <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-white text-sm font-bold">
                            <Building2 size={16} />
                        </div>
                        <span className="text-gray-700 text-sm font-medium">Admin / Owner</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-red-600 hover:text-red-700 flex items-center gap-2 text-sm border border-red-300 px-4 py-2 rounded-lg hover:bg-red-50 transition-all"
                    >
                        <LogOut size={16} />
                        <span className="hidden md:inline">Logout</span>
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-6 mt-6">
                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Admin</h2>
                    <p className="text-gray-600">Kelola psikolog, pantau ujian, dan monitor aktivitas organisasi Anda</p>
                </div>

                {/* Quota Banner (if exists) */}
                {quota && (
                    <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white p-6 rounded-2xl mb-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <div>
                                <h3 className="text-lg font-semibold">Penggunaan Kuota</h3>
                                {quota.validUntil && (
                                    <p className="text-blue-200 text-sm">
                                        Berlaku hingga: {new Date(quota.validUntil).toLocaleDateString('id-ID')}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Psikolog</span>
                                    <span>{quota.usedPsychologists}/{quota.maxPsychologists}</span>
                                </div>
                                <div className="h-2 bg-blue-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white rounded-full"
                                        style={{ width: `${getQuotaPercentage(quota.usedPsychologists, quota.maxPsychologists)}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Kandidat</span>
                                    <span>{quota.usedCandidates}/{quota.maxCandidates}</span>
                                </div>
                                <div className="h-2 bg-blue-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white rounded-full"
                                        style={{ width: `${getQuotaPercentage(quota.usedCandidates, quota.maxCandidates)}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Ujian</span>
                                    <span>{quota.usedExams}/{quota.maxExams}</span>
                                </div>
                                <div className="h-2 bg-blue-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white rounded-full"
                                        style={{ width: `${getQuotaPercentage(quota.usedExams, quota.maxExams)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-800 to-blue-900 text-white p-6 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm opacity-90">Total Psikolog</div>
                            <UserCog className="opacity-75" size={24} />
                        </div>
                        <div className="text-4xl font-bold">{stats.totalPsychologists}</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-700 to-blue-800 text-white p-6 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm opacity-90">Total Kandidat</div>
                            <Users className="opacity-75" size={24} />
                        </div>
                        <div className="text-4xl font-bold">{stats.totalCandidates}</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm opacity-90">Total Ujian</div>
                            <ClipboardList className="opacity-75" size={24} />
                        </div>
                        <div className="text-4xl font-bold">{stats.totalExams}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-600 to-green-700 text-white p-6 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm opacity-90">Sesi Aktif</div>
                            <BarChart3 className="opacity-75" size={24} />
                        </div>
                        <div className="text-4xl font-bold">{stats.activeSessions}</div>
                    </div>
                </div>

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Psychologist Management Card */}
                    <div
                        onClick={() => router.push('/admin/psychologists')}
                        className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-xl transition-all cursor-pointer hover:border-blue-300 group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-800 transition-colors">
                                <UserCog className="text-blue-800 group-hover:text-white transition-colors" size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-800 transition-colors">Kelola Psikolog</h3>
                                <p className="text-sm text-gray-500">Tambah, edit, dan hapus psikolog</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Kelola tim psikolog di organisasi Anda. Tambahkan psikolog baru atau atur akses mereka.
                        </p>
                        <button className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            Buka Manajemen Psikolog
                        </button>
                    </div>

                    {/* Candidate Grouping Card */}
                    <div
                        onClick={() => router.push('/admin/grouping')}
                        className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-xl transition-all cursor-pointer hover:border-blue-300 group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-800 transition-colors">
                                <ClipboardList className="text-blue-800 group-hover:text-white transition-colors" size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-800 transition-colors">Pembagian Kandidat</h3>
                                <p className="text-sm text-gray-500">Assign kandidat ke psikolog</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Bagi kandidat ke psikolog untuk setiap ujian. Gunakan fitur auto-assign atau atur manual.
                        </p>
                        <button className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            Buka Pembagian Kandidat
                        </button>
                    </div>

                    {/* Candidate Codes Card */}
                    <div
                        onClick={() => router.push('/admin/codes')}
                        className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-xl transition-all cursor-pointer hover:border-purple-300 group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:bg-purple-800 transition-colors">
                                <KeyRound className="text-purple-800 group-hover:text-white transition-colors" size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-800 transition-colors">Kelola Kode Akses</h3>
                                <p className="text-sm text-gray-500">Generate dan hapus kode kandidat</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Buat kode akses untuk kandidat, kelola kode yang sudah ada, dan hapus kandidat jika diperlukan.
                        </p>
                        <button className="w-full bg-purple-800 hover:bg-purple-900 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            Kelola Kode Akses
                        </button>
                    </div>

                    {/* Reports Card */}
                    <div
                        onClick={() => router.push('/admin/reports')}
                        className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-xl transition-all cursor-pointer hover:border-blue-300 group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-800 transition-colors">
                                <BarChart3 className="text-blue-800 group-hover:text-white transition-colors" size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-800 transition-colors">Laporan</h3>
                                <p className="text-sm text-gray-500">Lihat statistik dan analisis</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Pantau performa ujian, lihat statistik kandidat, dan ekspor laporan.
                        </p>
                        <button className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            Lihat Laporan
                        </button>
                    </div>

                    {/* Organization Settings Card */}
                    <div
                        onClick={() => router.push('/admin/settings')}
                        className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-xl transition-all cursor-pointer hover:border-blue-300 group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-800 transition-colors">
                                <Settings className="text-blue-800 group-hover:text-white transition-colors" size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-800 transition-colors">Pengaturan</h3>
                                <p className="text-sm text-gray-500">Konfigurasi organisasi</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Atur profil organisasi, logo, dan preferensi sistem lainnya.
                        </p>
                        <button className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            Buka Pengaturan
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
