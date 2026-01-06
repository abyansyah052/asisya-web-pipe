'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Building2, Search, Save, Users, ClipboardList, UserCog, Coins, Edit2, X, Check } from 'lucide-react';

interface AdminQuota {
    admin_id: number;
    admin_username: string;
    admin_name: string;
    admin_email: string;
    organization_id: number;
    organization_name: string;
    max_psychologists: number;
    max_candidates: number;
    max_exams: number;
    current_psychologists: number;
    current_candidates: number;
    current_exams: number;
    token_balance: number;
    tokens_used: number;
    valid_until: string | null;
    actual_psychologists: number;
    actual_candidates: number;
}

function ManageQuotasContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preSelectedClient = searchParams.get('client');

    const [quotas, setQuotas] = useState<AdminQuota[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        maxPsychologists: 10,
        maxCandidates: 100,
        maxExams: 50,
        tokenBalance: 0,
        validUntil: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchQuotas();
    }, []);

    const fetchQuotas = async () => {
        try {
            const res = await fetch('/api/superadmin/quotas');
            if (res.status === 401 || res.status === 403) {
                router.push('/adminpsi');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setQuotas(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (quota: AdminQuota) => {
        setEditingId(quota.admin_id);
        setEditForm({
            maxPsychologists: quota.max_psychologists,
            maxCandidates: quota.max_candidates,
            maxExams: quota.max_exams,
            tokenBalance: quota.token_balance,
            validUntil: quota.valid_until ? quota.valid_until.split('T')[0] : ''
        });
    };

    const handleSave = async (adminId: number) => {
        setSaving(true);
        try {
            const res = await fetch('/api/superadmin/quotas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminId,
                    maxPsychologists: editForm.maxPsychologists,
                    maxCandidates: editForm.maxCandidates,
                    maxExams: editForm.maxExams,
                    tokenBalance: editForm.tokenBalance,
                    validUntil: editForm.validUntil || null
                })
            });

            if (res.ok) {
                alert('Kuota berhasil diupdate!');
                setEditingId(null);
                fetchQuotas();
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal menyimpan kuota');
            }
        } catch (err) {
            alert('Terjadi kesalahan');
        } finally {
            setSaving(false);
        }
    };

    const filteredQuotas = quotas.filter(q =>
        q.organization_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.admin_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.admin_username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    <img src="/asisya.png" alt="Asisya" className="h-10 w-auto" />
                    <div>
                        <h1 className="text-xl font-bold text-blue-800">Manajemen Kuota</h1>
                        <p className="text-xs text-gray-500">Atur kuota untuk setiap Admin Owner</p>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Building2 size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{quotas.length}</p>
                                <p className="text-xs text-gray-500">Total Admin</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <UserCog size={20} className="text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {quotas.reduce((sum, q) => sum + parseInt(String(q.actual_psychologists || 0)), 0)}
                                </p>
                                <p className="text-xs text-gray-500">Total Psikolog</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <Users size={20} className="text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {quotas.reduce((sum, q) => sum + parseInt(String(q.actual_candidates || 0)), 0)}
                                </p>
                                <p className="text-xs text-gray-500">Total Kandidat</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                                <Coins size={20} className="text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {quotas.reduce((sum, q) => sum + (q.token_balance || 0), 0)}
                                </p>
                                <p className="text-xs text-gray-500">Total Token</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Cari admin/organisasi..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        />
                    </div>
                </div>

                {/* Quotas Table */}
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Memuat data...</div>
                ) : filteredQuotas.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
                        <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Admin</h3>
                        <p className="text-gray-500">Admin Owner perlu dibuat terlebih dahulu.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Admin / Organisasi</th>
                                        <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Psikolog</th>
                                        <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Kandidat</th>
                                        <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Ujian</th>
                                        <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Token</th>
                                        <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Berlaku Hingga</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredQuotas.map(quota => (
                                        <tr key={quota.admin_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                        <Building2 size={20} className="text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{quota.organization_name || 'Belum ada organisasi'}</div>
                                                        <div className="text-sm text-gray-500">@{quota.admin_username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {editingId === quota.admin_id ? (
                                                    <input
                                                        type="number"
                                                        value={editForm.maxPsychologists}
                                                        onChange={(e) => setEditForm({ ...editForm, maxPsychologists: parseInt(e.target.value) || 0 })}
                                                        className="w-20 px-2 py-1 border rounded text-center text-gray-900"
                                                    />
                                                ) : (
                                                    <span className="text-gray-900">{quota.actual_psychologists}/{quota.max_psychologists}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {editingId === quota.admin_id ? (
                                                    <input
                                                        type="number"
                                                        value={editForm.maxCandidates}
                                                        onChange={(e) => setEditForm({ ...editForm, maxCandidates: parseInt(e.target.value) || 0 })}
                                                        className="w-20 px-2 py-1 border rounded text-center text-gray-900"
                                                    />
                                                ) : (
                                                    <span className="text-gray-900">{quota.actual_candidates}/{quota.max_candidates}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {editingId === quota.admin_id ? (
                                                    <input
                                                        type="number"
                                                        value={editForm.maxExams}
                                                        onChange={(e) => setEditForm({ ...editForm, maxExams: parseInt(e.target.value) || 0 })}
                                                        className="w-20 px-2 py-1 border rounded text-center text-gray-900"
                                                    />
                                                ) : (
                                                    <span className="text-gray-900">{quota.current_exams}/{quota.max_exams}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {editingId === quota.admin_id ? (
                                                    <input
                                                        type="number"
                                                        value={editForm.tokenBalance}
                                                        onChange={(e) => setEditForm({ ...editForm, tokenBalance: parseInt(e.target.value) || 0 })}
                                                        className="w-24 px-2 py-1 border rounded text-center text-gray-900"
                                                    />
                                                ) : (
                                                    <span className="font-semibold text-yellow-600">{quota.token_balance}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {editingId === quota.admin_id ? (
                                                    <input
                                                        type="date"
                                                        value={editForm.validUntil}
                                                        onChange={(e) => setEditForm({ ...editForm, validUntil: e.target.value })}
                                                        className="px-2 py-1 border rounded text-gray-900"
                                                    />
                                                ) : (
                                                    <span className="text-gray-600 text-sm">
                                                        {quota.valid_until
                                                            ? new Date(quota.valid_until).toLocaleDateString('id-ID')
                                                            : 'Unlimited'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {editingId === quota.admin_id ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleSave(quota.admin_id)}
                                                            disabled={saving}
                                                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEdit(quota)}
                                                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
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

export default function ManageQuotasPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
            <ManageQuotasContent />
        </Suspense>
    );
}
