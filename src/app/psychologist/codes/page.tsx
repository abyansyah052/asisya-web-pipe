'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Copy, CheckCircle2, Trash2, Plus, ArrowLeft, RefreshCw, Download, Search } from 'lucide-react';

interface CandidateCode {
    id: number;
    code: string;
    created_at: string;
    expires_at: string | null;
    used_at: string | null;
    candidate_name: string | null;
    is_active: boolean;
    current_uses: number;
    max_uses: number;
    exam_title: string | null;
}

interface Exam {
    id: number;
    title: string;
}

export default function CodesPage() {
    const router = useRouter();
    const [codes, setCodes] = useState<CandidateCode[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Generate form state
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generateCount, setGenerateCount] = useState(1);
    const [selectedExam, setSelectedExam] = useState<number | null>(null);
    const [expiresInDays, setExpiresInDays] = useState(7);
    const [candidateName, setCandidateName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Filtered codes based on search
    const filteredCodes = useMemo(() => {
        if (!searchQuery.trim()) return codes;
        const query = searchQuery.toLowerCase().trim();
        return codes.filter(c => 
            c.code?.toLowerCase().includes(query) ||
            c.candidate_name?.toLowerCase().includes(query) ||
            c.exam_title?.toLowerCase().includes(query)
        );
    }, [codes, searchQuery]);

    useEffect(() => {
        fetchCodes();
        fetchExams();
    }, []);

    const fetchCodes = async () => {
        try {
            const res = await fetch('/api/psychologist/codes');
            if (res.status === 401 || res.status === 403) {
                router.push('/adminpsi');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setCodes(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchExams = async () => {
        try {
            const res = await fetch('/api/psychologist/exams');
            if (res.ok) {
                const data = await res.json();
                setExams(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const generateCodes = async () => {
        setGenerating(true);
        try {
            const res = await fetch('/api/psychologist/codes/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    count: generateCount,
                    examId: selectedExam,
                    expiresInDays,
                    candidateName: candidateName || null
                })
            });

            if (res.ok) {
                const data = await res.json();
                alert(`Berhasil membuat ${data.codes.length} kode baru!`);
                setShowGenerateModal(false);
                fetchCodes();
                // Reset form
                setGenerateCount(1);
                setSelectedExam(null);
                setExpiresInDays(7);
                setCandidateName('');
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal membuat kode');
            }
        } catch (err) {
            alert('Terjadi kesalahan');
        } finally {
            setGenerating(false);
        }
    };

    const copyCode = async (code: string, id: number) => {
        await navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const deactivateCode = async (codeId: number) => {
        if (!confirm('Yakin ingin menonaktifkan kode ini?')) return;

        try {
            const res = await fetch(`/api/psychologist/codes/${codeId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchCodes();
            }
        } catch (err) {
            alert('Gagal menonaktifkan kode');
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const downloadCodesCSV = () => {
        const activeCodes = codes.filter(c => c.is_active);
        const csv = [
            ['Kode', 'Dibuat', 'Kedaluwarsa', 'Ujian', 'Nama Kandidat', 'Status'].join(','),
            ...activeCodes.map(c => [
                c.code,
                formatDate(c.created_at),
                c.expires_at ? formatDate(c.expires_at) : '-',
                c.exam_title || '-',
                c.candidate_name || '-',
                c.used_at ? 'Terpakai' : 'Aktif'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kode-kandidat.csv';
        a.click();
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/psychologist/dashboard')}
                        className="text-gray-600 hover:text-gray-800"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <img src="/asisya.png" alt="Asisya" className="w-10 h-10 rounded-lg shadow-md" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Kode Akses Kandidat</h1>
                        <p className="text-xs text-gray-500">Generate dan kelola kode login kandidat</p>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6">
                {/* Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Manajemen Kode Akses</h2>
                        <p className="text-gray-500 text-sm">Buat kode unik untuk kandidat mengakses sistem ujian</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => fetchCodes()}
                            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                        >
                            <RefreshCw size={18} />
                            Refresh
                        </button>
                        <button
                            onClick={downloadCodesCSV}
                            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                        >
                            <Download size={18} />
                            Export CSV
                        </button>
                        <button
                            onClick={() => setShowGenerateModal(true)}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md"
                        >
                            <Plus size={18} />
                            Generate Kode Baru
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-sm font-medium mb-1">Total Kode</div>
                        <div className="text-3xl font-bold text-gray-800">{codes.length}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-sm font-medium mb-1">Kode Aktif</div>
                        <div className="text-3xl font-bold text-green-600">
                            {codes.filter(c => c.is_active && !c.used_at).length}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-sm font-medium mb-1">Kode Terpakai</div>
                        <div className="text-3xl font-bold text-blue-600">
                            {codes.filter(c => c.used_at).length}
                        </div>
                    </div>
                </div>

                {/* Codes Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <h3 className="font-semibold text-gray-700">Daftar Kode Akses</h3>
                        <div className="relative w-full sm:w-72">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cari kode, nama..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Memuat data...</div>
                    ) : filteredCodes.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <KeyRound size={32} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">
                                {searchQuery ? 'Tidak ada hasil pencarian' : 'Belum ada kode'}
                            </h3>
                            <p className="text-gray-500 mt-1">
                                {searchQuery 
                                    ? `Tidak ditemukan kode yang cocok dengan "${searchQuery}"`
                                    : 'Klik tombol "Generate Kode Baru" untuk membuat kode akses.'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                                        <th className="px-6 py-3 font-medium">Kode</th>
                                        <th className="px-6 py-3 font-medium">Kandidat</th>
                                        <th className="px-6 py-3 font-medium">Ujian</th>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                        <th className="px-6 py-3 font-medium">Dibuat</th>
                                        <th className="px-6 py-3 font-medium text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredCodes.map((code) => (
                                        <tr key={code.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-gray-100 px-3 py-1 rounded-lg font-mono text-sm">
                                                        {code.code}
                                                    </code>
                                                    <button
                                                        onClick={() => copyCode(code.code, code.id)}
                                                        className="text-gray-400 hover:text-blue-600"
                                                        title="Copy"
                                                    >
                                                        {copiedId === code.id ? (
                                                            <CheckCircle2 size={18} className="text-green-600" />
                                                        ) : (
                                                            <Copy size={18} />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {code.candidate_name || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {code.exam_title || 'Semua Ujian'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {code.used_at ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        Terpakai
                                                    </span>
                                                ) : code.is_active ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Aktif
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        Nonaktif
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-sm">
                                                {formatDate(code.created_at)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {code.is_active && !code.used_at && (
                                                    <button
                                                        onClick={() => deactivateCode(code.id)}
                                                        className="text-red-600 hover:text-red-800"
                                                        title="Nonaktifkan"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Generate Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Generate Kode Akses Baru</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Jumlah Kode
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={generateCount}
                                    onChange={(e) => setGenerateCount(parseInt(e.target.value) || 1)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Untuk Ujian (Opsional)
                                </label>
                                <select
                                    value={selectedExam || ''}
                                    onChange={(e) => setSelectedExam(e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                                >
                                    <option value="">Semua Ujian</option>
                                    {exams.map(exam => (
                                        <option key={exam.id} value={exam.id}>{exam.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Masa Berlaku (Hari)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={expiresInDays}
                                    onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                                />
                            </div>

                            {generateCount === 1 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nama Kandidat (Opsional)
                                    </label>
                                    <input
                                        type="text"
                                        value={candidateName}
                                        onChange={(e) => setCandidateName(e.target.value)}
                                        placeholder="Nama kandidat"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowGenerateModal(false)}
                                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                            >
                                Batal
                            </button>
                            <button
                                onClick={generateCodes}
                                disabled={generating}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                            >
                                {generating ? 'Generating...' : 'Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
