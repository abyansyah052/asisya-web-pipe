'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserCog, Users, Mail, Calendar, Shield, CheckCircle, XCircle, User, ToggleLeft, ToggleRight } from 'lucide-react';

interface User {
    id: number;
    username: string;
    email: string;
    full_name: string;
    role: 'admin' | 'psychologist' | 'candidate';
    profile_completed: boolean;
    is_active: boolean;
    created_at: string;
}

export default function UserManagementPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'psychologist' | 'candidate'>('all');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        filterUsers();
    }, [users, roleFilter, searchQuery]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/superadmin/users');
            if (res.status === 401 || res.status === 403) {
                router.push('/adminpsi');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const filterUsers = () => {
        let filtered = users;

        // Filter by role
        if (roleFilter !== 'all') {
            filtered = filtered.filter(user => user.role === roleFilter);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(user =>
                (user.full_name || '').toLowerCase().includes(query) ||
                user.email.toLowerCase().includes(query) ||
                user.username.toLowerCase().includes(query)
            );
        }

        setFilteredUsers(filtered);
    };

    const handleToggleActive = async (userId: number, currentStatus: boolean) => {
        const action = currentStatus ? 'menonaktifkan' : 'mengaktifkan';
        if (!confirm(`Apakah Anda yakin ingin ${action} user ini?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/superadmin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentStatus })
            });

            if (res.ok) {
                alert(`User berhasil ${currentStatus ? 'dinonaktifkan' : 'diaktifkan'}!`);
                fetchUsers(); // Refresh data
            } else {
                const error = await res.json();
                alert(error.error || 'Gagal mengubah status');
            }
        } catch (e) {
            alert('Terjadi kesalahan');
        }
    };

    const handleChangeRole = async (userId: number, newRole: 'admin' | 'psychologist' | 'candidate') => {
        if (!confirm(`Apakah Anda yakin ingin mengubah role user ini menjadi ${newRole}?`)) {
            return;
        }

        try {
            const res = await fetch('/api/superadmin/users/role', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: newRole })
            });

            if (res.ok) {
                alert('Role berhasil diubah!');
                fetchUsers(); // Refresh data
            } else {
                const error = await res.json();
                alert(error.error || 'Gagal mengubah role');
            }
        } catch (e) {
            alert('Terjadi kesalahan saat mengubah role');
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">Admin</span>;
            case 'psychologist':
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Psikolog</span>;
            case 'candidate':
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">Kandidat</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">{role}</span>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/superadmin/dashboard')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} className="text-gray-700" />
                    </button>
                    <img src="/asisya.png" alt="Asisya" className="h-10 w-auto" />
                    <div>
                        <h1 className="text-xl font-bold text-blue-800">Manajemen User</h1>
                        <p className="text-xs text-gray-500">Kelola role dan akses user</p>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-6 mt-6">
                {/* Header & Filters */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">Daftar User</h2>
                            <p className="text-gray-500 text-sm">Total: {filteredUsers.length} user</p>
                        </div>

                        {/* Search */}
                        <div className="flex-1 max-w-md">
                            <input
                                type="text"
                                placeholder="Cari nama, email, atau username..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent text-gray-900"
                            />
                        </div>
                    </div>

                    {/* Role Filter Tabs */}
                    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
                        <button
                            onClick={() => setRoleFilter('all')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${roleFilter === 'all'
                                ? 'bg-blue-800 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Semua ({users.length})
                        </button>
                        <button
                            onClick={() => setRoleFilter('admin')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${roleFilter === 'admin'
                                ? 'bg-purple-800 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            <Shield size={16} />
                            Admin ({users.filter(u => u.role === 'admin').length})
                        </button>
                        <button
                            onClick={() => setRoleFilter('psychologist')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${roleFilter === 'psychologist'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            <UserCog size={16} />
                            Psikolog ({users.filter(u => u.role === 'psychologist').length})
                        </button>
                        <button
                            onClick={() => setRoleFilter('candidate')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${roleFilter === 'candidate'
                                ? 'bg-gray-800 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            <Users size={16} />
                            Kandidat ({users.filter(u => u.role === 'candidate').length})
                        </button>
                    </div>
                </div>

                {/* Users Table */}
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Memuat data...</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                        <Users size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak Ada User</h3>
                        <p className="text-gray-500">Tidak ada user yang sesuai dengan filter.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Terdaftar</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${user.role === 'admin' ? 'bg-purple-100' :
                                                            user.role === 'psychologist' ? 'bg-blue-100' : 'bg-gray-100'
                                                        }`}>
                                                        <span className={`font-bold text-sm ${user.role === 'admin' ? 'text-purple-800' :
                                                                user.role === 'psychologist' ? 'text-blue-800' : 'text-gray-800'
                                                            }`}>
                                                            {(user.full_name || user.username).charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-gray-900 truncate">{user.full_name || user.username}</div>
                                                        <div className="text-sm text-gray-500 truncate">@{user.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <Mail size={14} className="text-gray-400 flex-shrink-0" />
                                                    <span className="text-sm truncate">{user.email || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {getRoleBadge(user.role)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {user.is_active ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                                        <CheckCircle size={12} />
                                                        Aktif
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                                        <XCircle size={12} />
                                                        Nonaktif
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-gray-600 text-sm">
                                                    <Calendar size={14} className="flex-shrink-0" />
                                                    {new Date(user.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* Toggle Active */}
                                                    <button
                                                        onClick={() => handleToggleActive(user.id, user.is_active)}
                                                        className={`p-2 rounded-lg transition-colors ${user.is_active
                                                                ? 'text-green-600 hover:bg-green-50'
                                                                : 'text-gray-400 hover:bg-gray-100'
                                                            }`}
                                                        title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                    >
                                                        {user.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                                    </button>

                                                    {/* Role Change Buttons */}
                                                    {user.role === 'psychologist' && (
                                                        <button
                                                            onClick={() => handleChangeRole(user.id, 'admin')}
                                                            className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition-colors"
                                                        >
                                                            → Admin
                                                        </button>
                                                    )}
                                                    {user.role === 'admin' && (
                                                        <button
                                                            onClick={() => handleChangeRole(user.id, 'psychologist')}
                                                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                                                        >
                                                            → Psikolog
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
