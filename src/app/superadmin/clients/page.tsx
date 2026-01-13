'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, Building2, Search, Eye, EyeOff, Users, ClipboardList } from 'lucide-react';

interface Client {
    id: number;
    username: string;
    email: string;
    full_name: string | null;
    organization_name: string | null;
    created_at: string;
    psychologist_count: number;
    candidate_count: number;
    exam_count: number;
}

export default function ManageClientsPage() {
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        fullName: '',
        organizationName: ''
    });
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const res = await fetch('/api/superadmin/clients');
            if (res.status === 401 || res.status === 403) {
                router.push('/adminpsi');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setClients(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const url = editingId
                ? `/api/superadmin/clients/${editingId}`
                : '/api/superadmin/clients';

            const res = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert(editingId ? 'Client berhasil diupdate!' : 'Client berhasil ditambahkan!');
                setShowAddModal(false);
                resetForm();
                fetchClients();
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal menyimpan data');
            }
        } catch (err) {
            alert('Terjadi kesalahan');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (client: Client) => {
        setFormData({
            username: client.username,
            email: client.email,
            password: '',
            fullName: client.full_name || '',
            organizationName: client.organization_name || ''
        });
        setEditingId(client.id);
        setShowAddModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Yakin ingin menghapus client ini? Semua data organisasi, psikolog, dan kandidat terkait akan ikut terhapus.')) {
            return;
        }

        try {
            const res = await fetch(`/api/superadmin/clients/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert('Client berhasil dihapus');
                fetchClients();
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal menghapus');
            }
        } catch (err) {
            alert('Terjadi kesalahan');
        }
    };

    const resetForm = () => {
        setFormData({ username: '', email: '', password: '', fullName: '', organizationName: '' });
        setEditingId(null);
    };

    const filteredClients = clients.filter(c =>
        c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.organization_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/superadmin/dashboard')}
                        className="text-gray-600 hover:text-gray-800"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <img src="/asisya.png" alt="Asisya" className="w-10 h-10 rounded-lg shadow-md" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Manajemen Client</h1>
                        <p className="text-xs text-gray-500">Kelola admin/owner B2B</p>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6">
                {/* Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari client..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                        />
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow-md"
                    >
                        <Plus size={18} />
                        Tambah Client Baru
                    </button>
                </div>

                {/* Clients Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-semibold text-gray-700">Daftar Client ({filteredClients.length})</h3>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Memuat data...</div>
                    ) : filteredClients.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Building2 size={32} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Belum ada client</h3>
                            <p className="text-gray-500 mt-1">Klik tombol &quot;Tambah Client Baru&quot; untuk menambahkan.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                                        <th className="px-6 py-3 font-medium">Client</th>
                                        <th className="px-6 py-3 font-medium">Organisasi</th>
                                        <th className="px-6 py-3 font-medium text-center">Psikolog</th>
                                        <th className="px-6 py-3 font-medium text-center">Kandidat</th>
                                        <th className="px-6 py-3 font-medium text-center">Ujian</th>
                                        <th className="px-6 py-3 font-medium">Bergabung</th>
                                        <th className="px-6 py-3 font-medium text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredClients.map((client) => (
                                        <tr key={client.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-800 font-bold">
                                                        {client.username[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{client.full_name || client.username}</div>
                                                        <div className="text-sm text-gray-500">{client.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Building2 size={16} className="text-gray-400" />
                                                    <span className="text-gray-700">{client.organization_name || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                                                    <Users size={14} />
                                                    {client.psychologist_count}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                                                    <Users size={14} />
                                                    {client.candidate_count}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                                                    <ClipboardList size={14} />
                                                    {client.exam_count}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-sm">
                                                {formatDate(client.created_at)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => router.push(`/superadmin/quotas?client=${client.id}`)}
                                                        className="text-purple-600 hover:text-purple-800 p-2"
                                                        title="Atur Kuota"
                                                    >
                                                        <ClipboardList size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(client)}
                                                        className="text-blue-600 hover:text-blue-800 p-2"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(client.id)}
                                                        className="text-red-600 hover:text-red-800 p-2"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">
                            {editingId ? 'Edit Client' : 'Tambah Client Baru'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nama Organisasi <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.organizationName}
                                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                                    placeholder="PT. Contoh Perusahaan"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Username Admin <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                                    placeholder="Username untuk login"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nama Lengkap Admin
                                </label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                                    placeholder="Nama lengkap admin/owner"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                                    placeholder="email@domain.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password {!editingId && <span className="text-red-500">*</span>}
                                    {editingId && <span className="text-gray-400 text-xs">(kosongkan jika tidak ingin mengubah)</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required={!editingId}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                                        placeholder={editingId ? "••••••••" : "Minimal 6 karakter"}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddModal(false); resetForm(); }}
                                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50"
                                >
                                    {saving ? 'Menyimpan...' : (editingId ? 'Update' : 'Tambah')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
