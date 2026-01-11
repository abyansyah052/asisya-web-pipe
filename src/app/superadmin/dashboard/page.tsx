'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserCog, LogOut, ClipboardList, Building2, Settings, BarChart3, Shield } from 'lucide-react';

interface DashboardStats {
    totalAdmins: number;
    totalPsychologists: number;
    totalCandidates: number;
    totalExams: number;
    totalOrganizations: number;
}

export default function SuperAdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats>({
        totalAdmins: 0,
        totalPsychologists: 0,
        totalCandidates: 0,
        totalExams: 0,
        totalOrganizations: 0
    });
    const [_loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/superadmin/stats');
            if (res.status === 401 || res.status === 403) {
                router.push('/adminpsi');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/adminpsi');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10 backdrop-blur-sm bg-white/95">
                <div className="flex items-center gap-3">
                    <img src="/asisya.png" alt="Asisya" className="h-10 w-auto" />
                    <div>
                        <h1 className="text-xl font-bold text-blue-800">Super Admin Panel</h1>
                        <p className="text-xs text-gray-500">Platform Developer Console</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-full">
                        <div className="w-8 h-8 rounded-full bg-purple-800 flex items-center justify-center text-white text-sm font-bold">
                            <Shield size={16} />
                        </div>
                        <span className="text-gray-700 text-sm font-medium">Super Admin</span>
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Developer</h2>
                    <p className="text-gray-600">Kelola semua admin/client, kuota, dan monitoring platform</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-purple-800 to-purple-900 text-white p-6 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm opacity-90">Organisasi</div>
                            <Building2 className="opacity-75" size={24} />
                        </div>
                        <div className="text-4xl font-bold">{stats.totalOrganizations}</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-800 to-blue-900 text-white p-6 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm opacity-90">Admin/Client</div>
                            <Building2 className="opacity-75" size={24} />
                        </div>
                        <div className="text-4xl font-bold">{stats.totalAdmins}</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-700 to-blue-800 text-white p-6 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm opacity-90">Psikolog</div>
                            <UserCog className="opacity-75" size={24} />
                        </div>
                        <div className="text-4xl font-bold">{stats.totalPsychologists}</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm opacity-90">Kandidat</div>
                            <Users className="opacity-75" size={24} />
                        </div>
                        <div className="text-4xl font-bold">{stats.totalCandidates}</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm opacity-90">Total Ujian</div>
                            <ClipboardList className="opacity-75" size={24} />
                        </div>
                        <div className="text-4xl font-bold">{stats.totalExams}</div>
                    </div>
                </div>

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Client Management Card */}
                    <div
                        onClick={() => router.push('/superadmin/clients')}
                        className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-xl transition-all cursor-pointer hover:border-purple-300 group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:bg-purple-800 transition-colors">
                                <Building2 className="text-purple-800 group-hover:text-white transition-colors" size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-800 transition-colors">Kelola Client</h3>
                                <p className="text-sm text-gray-500">Tambah dan atur admin/client B2B</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Tambahkan client baru, atur organisasi, dan kelola akses admin untuk setiap client.
                        </p>
                        <button className="w-full bg-purple-800 hover:bg-purple-900 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            Buka Manajemen Client
                        </button>
                    </div>

                    {/* Quota Management Card */}
                    <div
                        onClick={() => router.push('/superadmin/quotas')}
                        className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-xl transition-all cursor-pointer hover:border-purple-300 group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:bg-purple-800 transition-colors">
                                <BarChart3 className="text-purple-800 group-hover:text-white transition-colors" size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-800 transition-colors">Kuota & Token</h3>
                                <p className="text-sm text-gray-500">Atur batas penggunaan setiap client</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Tentukan kuota psikolog, kandidat, dan ujian untuk setiap client. Atur masa berlaku kuota.
                        </p>
                        <button className="w-full bg-purple-800 hover:bg-purple-900 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            Kelola Kuota
                        </button>
                    </div>

                    {/* All Users Card */}
                    <div
                        onClick={() => router.push('/superadmin/users')}
                        className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-xl transition-all cursor-pointer hover:border-purple-300 group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-800 transition-colors">
                                <UserCog className="text-blue-800 group-hover:text-white transition-colors" size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-800 transition-colors">Semua User</h3>
                                <p className="text-sm text-gray-500">Lihat dan kelola semua user</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Lihat semua user dalam sistem, ubah role, dan kelola akses untuk semua pengguna platform.
                        </p>
                        <button className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            Buka Manajemen User
                        </button>
                    </div>

                    {/* All Exams Card */}
                    <div
                        onClick={() => router.push('/superadmin/exams')}
                        className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-xl transition-all cursor-pointer hover:border-blue-300 group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-800 transition-colors">
                                <ClipboardList className="text-blue-800 group-hover:text-white transition-colors" size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-800 transition-colors">Semua Ujian</h3>
                                <p className="text-sm text-gray-500">Lihat semua ujian dalam platform</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Pantau semua ujian yang dibuat di platform, statistik penggunaan, dan status ujian.
                        </p>
                        <button className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            Lihat Semua Ujian
                        </button>
                    </div>

                    {/* Grouping Card */}
                    <div
                        onClick={() => router.push('/superadmin/grouping')}
                        className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-xl transition-all cursor-pointer hover:border-blue-300 group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-800 transition-colors">
                                <Users className="text-blue-800 group-hover:text-white transition-colors" size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-800 transition-colors">Pembagian Peserta</h3>
                                <p className="text-sm text-gray-500">Assign peserta secara global</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Bagi peserta ke psikolog untuk setiap ujian. Auto-divide atau manual grouping.
                        </p>
                        <button className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            Buka Pembagian
                        </button>
                    </div>

                    {/* Company Codes Card */}
                    <div
                        onClick={() => router.push('/superadmin/company-codes')}
                        className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-xl transition-all cursor-pointer hover:border-amber-300 group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center group-hover:bg-amber-600 transition-colors">
                                <Building2 className="text-amber-600 group-hover:text-white transition-colors" size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-amber-600 transition-colors">Kode Perusahaan</h3>
                                <p className="text-sm text-gray-500">Kelola kode unik perusahaan</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Buat dan kelola kode perusahaan untuk mengidentifikasi kandidat dari berbagai organisasi.
                        </p>
                        <button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            Kelola Kode Perusahaan
                        </button>
                    </div>

                    {/* Platform Settings Card */}
                    <div
                        onClick={() => router.push('/superadmin/settings')}
                        className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-xl transition-all cursor-pointer hover:border-gray-300 group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center group-hover:bg-gray-800 transition-colors">
                                <Settings className="text-gray-800 group-hover:text-white transition-colors" size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors">Pengaturan Platform</h3>
                                <p className="text-sm text-gray-500">Konfigurasi sistem global</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Atur konfigurasi global platform, email settings, dan preferensi sistem lainnya.
                        </p>
                        <button className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            Buka Pengaturan
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
