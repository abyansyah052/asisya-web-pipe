'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserCog, LogOut, ClipboardList } from 'lucide-react';

interface DashboardStats {
    totalUsers: number;
    totalAdmins: number;
    totalCandidates: number;
    totalExams: number;
}

export default function SuperAdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        totalAdmins: 0,
        totalCandidates: 0,
        totalExams: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/superadmin/stats');
            if (res.status === 401 || res.status === 403) {
                router.push('/');
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
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10 backdrop-blur-sm bg-white/95">
                <div className="flex items-center gap-3">
                    <img src="/asisya.png" alt="Asisya" className="h-10 w-auto" />
                    <div>
                        <h1 className="text-xl font-bold text-blue-800">Super Admin Panel</h1>
                        <p className="text-xs text-gray-500">Manajemen User & Role</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full">
                        <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-white text-sm font-bold">
                            SA
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
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Super Admin</h2>
                    <p className="text-gray-600">Kelola user, role, dan pembagian kandidat untuk setiap ujian</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-800 to-blue-900 text-white p-6 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm opacity-90">Total Users</div>
                            <Users className="opacity-75" size={24} />
                        </div>
                        <div className="text-4xl font-bold">{stats.totalUsers}</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-700 to-blue-800 text-white p-6 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm opacity-90">Total Admin</div>
                            <UserCog className="opacity-75" size={24} />
                        </div>
                        <div className="text-4xl font-bold">{stats.totalAdmins}</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm opacity-90">Total Kandidat</div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* User Management Card */}
                    <div 
                        onClick={() => router.push('/superadmin/users')}
                        className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-xl transition-all cursor-pointer hover:border-blue-300 group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-800 transition-colors">
                                <UserCog className="text-blue-800 group-hover:text-white transition-colors" size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-800 transition-colors">Manajemen User</h3>
                                <p className="text-sm text-gray-500">Kelola role user (Admin/Kandidat)</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Lihat semua user, ubah role, tambah atau hapus admin. Atur siapa yang memiliki akses sebagai admin atau kandidat.
                        </p>
                        <button className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            Buka Manajemen User
                        </button>
                    </div>

                    {/* Candidate Grouping Card */}
                    <div 
                        onClick={() => router.push('/superadmin/grouping')}
                        className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 hover:shadow-xl transition-all cursor-pointer hover:border-blue-300 group"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-800 transition-colors">
                                <ClipboardList className="text-blue-800 group-hover:text-white transition-colors" size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-800 transition-colors">Pembagian Kandidat</h3>
                                <p className="text-sm text-gray-500">Assign kandidat ke admin per ujian</p>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Bagi kandidat ke admin assessor untuk setiap ujian. Gunakan auto-divide atau manual grouping dengan block select.
                        </p>
                        <button className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            Buka Pembagian Kandidat
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
