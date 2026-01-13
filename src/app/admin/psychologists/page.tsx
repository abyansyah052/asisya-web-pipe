'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, UserCog, Search, Mail, Eye, EyeOff, CheckCircle, XCircle, ToggleLeft, ToggleRight } from 'lucide-react';

interface Psychologist {
    id: number;
    username: string;
    email: string;
    full_name: string | null;
    is_active: boolean;
    created_at: string;
    exam_count: number;
    candidate_count: number;
}

export default function ManagePsychologistsPage() {
    const router = useRouter();
    const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
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
        fullName: ''
    });
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        fetchPsychologists();
    }, []);

    const fetchPsychologists = async () => {
        try {
            const res = await fetch('/api/admin/psychologists');
            if (res.status === 401 || res.status === 403) {
                router.push('/adminpsi');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setPsychologists(data);
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
                ? `/api/admin/psychologists/${editingId}`
                : '/api/admin/psychologists';

            const res = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert(editingId ? 'Psikolog berhasil diupdate!' : 'Psikolog berhasil ditambahkan!');
                setShowAddModal(false);
                resetForm();
                fetchPsychologists();
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

    const handleEdit = (psych: Psychologist) => {
        setFormData({
            username: psych.username,
            email: psych.email,
            password: '',
            fullName: psych.full_name || ''
        });
        setEditingId(psych.id);
        setShowAddModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Yakin ingin menghapus psikolog ini? Semua data terkait akan ikut terhapus.')) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/psychologists/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert('Psikolog berhasil dihapus');
                fetchPsychologists();
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal menghapus');
            }
        } catch (err) {
            alert('Terjadi kesalahan');
        }
    };

    const handleToggleActive = async (id: number, currentStatus: boolean) => {
        const action = currentStatus ? 'menonaktifkan' : 'mengaktifkan';
        if (!confirm(`Apakah Anda yakin ingin ${action} psikolog ini?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/psychologists/${id}/activate`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentStatus })
            });

            if (res.ok) {
                alert(`Psikolog berhasil ${currentStatus ? 'dinonaktifkan' : 'diaktifkan'}!`);
                fetchPsychologists();
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal mengubah status');
            }
        } catch (err) {
            alert('Terjadi kesalahan');
        }
    };

    const resetForm = () => {
        setFormData({ username: '', email: '', password: '', fullName: '' });
        setEditingId(null);
    };

    const filteredPsychologists = psychologists.filter(p =>
        p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const pendingCount = psychologists.filter(p => !p.is_active).length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/admin/dashboard')}
                        className="text-gray-600 hover:text-gray-800"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <img src="/asisya.png" alt="Asisya" className="w-10 h-10 rounded-lg shadow-md" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Manajemen Psikolog</h1>
                        <p className="text-xs text-gray-500">Kelola tim psikolog organisasi</p>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6">
                {/* Pending Approval Banner */}
                {pendingCount > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                            <XCircle size={20} className="text-yellow-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-yellow-800">
                                {pendingCount} Psikolog Menunggu Persetujuan
                            </h3>
                            <p className="text-sm text-yellow-700">
                                Aktifkan psikolog di bawah agar mereka bisa mengakses platform.
                            </p>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari psikolog..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md"
                    >
                        <Plus size={18} />
                        Tambah Psikolog
                    </button>
                </div>

                {/* Psychologists Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-semibold text-gray-700">Daftar Psikolog ({filteredPsychologists.length})</h3>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Memuat data...</div>
                    ) : filteredPsychologists.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <UserCog size={32} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Belum ada psikolog</h3>
                            <p className="text-gray-500 mt-1">Klik tombol &quot;Tambah Psikolog&quot; untuk menambahkan.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                                        <th className="px-6 py-3 font-medium">Psikolog</th>
                                        <th className="px-6 py-3 font-medium">Email</th>
                                        <th className="px-6 py-3 font-medium text-center">Status</th>
                                        <th className="px-6 py-3 font-medium">Ujian</th>
                                        <th className="px-6 py-3 font-medium">Kandidat</th>
                                        <th className="px-6 py-3 font-medium">Bergabung</th>
                                        <th className="px-6 py-3 font-medium text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredPsychologists.map((psych) => (
                                        <tr key={psych.id} className={`hover:bg-gray-50 ${!psych.is_active ? 'bg-yellow-50' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${psych.is_active ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {psych.username[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{psych.full_name || psych.username}</div>
                                                        <div className="text-sm text-gray-500">@{psych.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <Mail size={14} className="text-gray-400" />
                                                    {psych.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {psych.is_active ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                                        <CheckCircle size={12} />
                                                        Aktif
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                                        <XCircle size={12} />
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{psych.exam_count}</td>
                                            <td className="px-6 py-4 text-gray-600">{psych.candidate_count}</td>
                                            <td className="px-6 py-4 text-gray-500 text-sm">
                                                {formatDate(psych.created_at)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Toggle Active */}
                                                    <button
                                                        onClick={() => handleToggleActive(psych.id, psych.is_active)}
                                                        className={`p-2 rounded-lg transition-colors ${psych.is_active
                                                                ? 'text-green-600 hover:bg-green-50'
                                                                : 'text-yellow-600 hover:bg-yellow-50'
                                                            }`}
                                                        title={psych.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                    >
                                                        {psych.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(psych)}
                                                        className="text-blue-600 hover:text-blue-800 p-2"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(psych.id)}
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
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">
                            {editingId ? 'Edit Psikolog' : 'Tambah Psikolog Baru'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Username <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                                    placeholder="Username untuk login"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nama Lengkap
                                </label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                                    placeholder="Nama lengkap psikolog"
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                                    placeholder="email@domain.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password {!editingId && <span className="text-red-500">*</span>}
                                    {editingId && <span className="text-gray-400">(kosongkan jika tidak ingin mengubah)</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required={!editingId}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
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
