'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Copy, CheckCircle2, Trash2, Plus, ArrowLeft, RefreshCw, Download, UserX, Upload, FileSpreadsheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';

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
    used_by_user_id: number | null;
    used_by_email: string | null;
}

interface Exam {
    id: number;
    title: string;
}

export default function AdminCodesPage() {
    const router = useRouter();
    const [codes, setCodes] = useState<CandidateCode[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

    // Generate form state
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generateCount, setGenerateCount] = useState(1);
    const [selectedExam, setSelectedExam] = useState<number | null>(null);
    const [expiresInDays, setExpiresInDays] = useState(7);
    const [candidateName, setCandidateName] = useState('');

    // Import Excel state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState<{name: string; validityDays?: number}[]>([]);
    const [importing, setImporting] = useState(false);
    const [importExam, setImportExam] = useState<number | null>(null);
    const [importExpiresDays, setImportExpiresDays] = useState(7);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchCodes();
        fetchExams();
    }, []);

    const fetchCodes = async () => {
        try {
            const res = await fetch('/api/admin/codes');
            if (res.status === 401 || res.status === 403) {
                router.push('/adminpsi');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setCodes(data.codes || data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchExams = async () => {
        try {
            const res = await fetch('/api/admin/exams');
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
            const res = await fetch('/api/admin/codes/generate', {
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
            const res = await fetch(`/api/admin/codes/${codeId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchCodes();
            }
        } catch (err) {
            alert('Gagal menonaktifkan kode');
        }
    };

    const deleteCodeAndCandidate = async (codeId: number, candidateEmail: string | null) => {
        const confirmMsg = candidateEmail 
            ? `Yakin ingin menghapus kode ini DAN akun kandidat (${candidateEmail})? Semua data kandidat akan dihapus permanen.`
            : 'Yakin ingin menghapus kode ini?';
        
        if (!confirm(confirmMsg)) return;

        setDeleteLoading(codeId);
        try {
            const res = await fetch(`/api/admin/codes/${codeId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deleteCandidate: true })
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.candidateDeleted) {
                    alert('Kode dan akun kandidat berhasil dihapus');
                } else {
                    alert('Kode berhasil dihapus');
                }
                fetchCodes();
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal menghapus');
            }
        } catch (err) {
            alert('Terjadi kesalahan');
        } finally {
            setDeleteLoading(null);
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

    // Download Kode Akses as Excel
    const downloadCodesExcel = () => {
        const activeCodes = codes.filter(c => c.is_active);
        
        // Create worksheet data
        const wsData = [
            ['No', 'Kode', 'Nama Kandidat', 'Ujian', 'Status', 'Dibuat', 'Kedaluwarsa', 'Email'],
            ...activeCodes.map((c, idx) => [
                idx + 1,
                c.code,
                c.candidate_name || '-',
                c.exam_title || 'Semua Ujian',
                c.used_at ? 'Terpakai' : 'Aktif',
                formatDate(c.created_at),
                c.expires_at ? formatDate(c.expires_at) : '-',
                c.used_by_email || '-'
            ])
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 5 },  // No
            { wch: 20 }, // Kode
            { wch: 25 }, // Nama Kandidat
            { wch: 20 }, // Ujian
            { wch: 12 }, // Status
            { wch: 20 }, // Dibuat
            { wch: 20 }, // Kedaluwarsa
            { wch: 30 }, // Email
        ];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Daftar Kode Akses');
        
        XLSX.writeFile(wb, `Daftar_Kode_Akses_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`);
    };

    const downloadCodesCSV = () => {
        const activeCodes = codes.filter(c => c.is_active);
        const csv = [
            ['Kode', 'Dibuat', 'Kedaluwarsa', 'Ujian', 'Nama Kandidat', 'Email', 'Status'].join(','),
            ...activeCodes.map(c => [
                c.code,
                formatDate(c.created_at),
                c.expires_at ? formatDate(c.expires_at) : '-',
                c.exam_title || '-',
                c.candidate_name || '-',
                c.used_by_email || '-',
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

    // Download template Excel for import
    const downloadImportTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['Nama Peserta', 'Masa Berlaku (hari)'],
            ['Contoh: Budi Santoso', '30'],
            ['Contoh: Ani Wijaya', '30'],
            ['Contoh: Ahmad Hidayat', '30'],
        ]);
        
        // Set column width
        ws['!cols'] = [{ wch: 30 }, { wch: 20 }];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template Peserta');
        
        XLSX.writeFile(wb, 'template-import-peserta.xlsx');
    };

    // Handle file upload for import
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = evt.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<{[key: string]: string | number}>(sheet);

                // Parse data - look for column named "Nama Peserta" and "Masa Berlaku"
                const parsed = jsonData.map(row => {
                    const name = row['Nama Peserta'] || row['nama_peserta'] || row['nama'] || row['Name'] || Object.values(row)[0];
                    const validity = row['Masa Berlaku (hari)'] || row['masa_berlaku'] || row['validity'] || 30;
                    return { 
                        name: String(name || '').trim(),
                        validityDays: Number(validity) || 30
                    };
                }).filter(item => item.name && item.name.length > 0 && !item.name.toLowerCase().startsWith('contoh'));

                if (parsed.length === 0) {
                    alert('Tidak ada data peserta yang valid ditemukan. Pastikan kolom "Nama Peserta" terisi.');
                    return;
                }

                setImportData(parsed);
                setShowImportModal(true);
            } catch (error) {
                console.error('Error parsing Excel:', error);
                alert('Gagal membaca file Excel. Pastikan format file benar.');
            }
        };
        reader.readAsBinaryString(file);
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Import codes from Excel data
    const importCodesFromExcel = async () => {
        if (importData.length === 0) {
            alert('Tidak ada data untuk diimport');
            return;
        }

        setImporting(true);
        try {
            const res = await fetch('/api/admin/codes/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidates: importData,
                    examId: importExam,
                    expiresInDays: importExpiresDays
                })
            });

            if (res.ok) {
                const data = await res.json();
                alert(`Berhasil membuat ${data.codes.length} kode untuk ${importData.length} peserta!`);
                setShowImportModal(false);
                setImportData([]);
                setImportExam(null);
                setImportExpiresDays(7);
                fetchCodes();
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal import kode');
            }
        } catch (err) {
            alert('Terjadi kesalahan saat import');
        } finally {
            setImporting(false);
        }
    };

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
                    <div className="flex gap-3 flex-wrap">
                        <button
                            onClick={() => fetchCodes()}
                            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                        >
                            <RefreshCw size={18} />
                            Refresh
                        </button>
                        <button
                            onClick={downloadCodesExcel}
                            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                        >
                            <Download size={18} />
                            Export Excel
                        </button>
                        <button
                            onClick={downloadImportTemplate}
                            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                        >
                            <FileSpreadsheet size={18} />
                            Download Template
                        </button>
                        <label className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-md cursor-pointer">
                            <Upload size={18} />
                            Import Excel
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".xlsx,.xls"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
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
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-semibold text-gray-700">Daftar Kode Akses</h3>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Memuat data...</div>
                    ) : codes.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <KeyRound size={32} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Belum ada kode</h3>
                            <p className="text-gray-500 mt-1">Klik tombol &quot;Generate Kode Baru&quot; untuk membuat kode akses.</p>
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
                                    {codes.map((code) => (
                                        <tr key={code.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-gray-100 px-3 py-1 rounded-lg font-mono text-sm text-gray-900">
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
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900">{code.candidate_name || '-'}</div>
                                                {code.used_by_email && (
                                                    <div className="text-xs text-gray-500">{code.used_by_email}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900">
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
                                                <div className="flex justify-end gap-2">
                                                    {code.is_active && !code.used_at && (
                                                        <button
                                                            onClick={() => deactivateCode(code.id)}
                                                            className="text-orange-600 hover:text-orange-800"
                                                            title="Nonaktifkan"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                    {/* Delete code + candidate button */}
                                                    <button
                                                        onClick={() => deleteCodeAndCandidate(code.id, code.used_by_email)}
                                                        disabled={deleteLoading === code.id}
                                                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                                        title={code.used_by_email ? "Hapus kode & kandidat" : "Hapus kode"}
                                                    >
                                                        {deleteLoading === code.id ? (
                                                            <RefreshCw size={18} className="animate-spin" />
                                                        ) : (
                                                            <UserX size={18} />
                                                        )}
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

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Import Peserta dari Excel</h2>
                            <button
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportData([]);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="mb-6">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                <p className="text-green-800 font-medium">✓ {importData.length} peserta ditemukan</p>
                                <p className="text-green-600 text-sm mt-1">
                                    Kode akan di-generate otomatis untuk setiap peserta
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                                <p className="text-sm font-medium text-gray-700 mb-2">Daftar Peserta:</p>
                                <div className="space-y-1">
                                    {importData.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                                                {idx + 1}
                                            </span>
                                            {item.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Untuk Ujian (Opsional)
                                </label>
                                <select
                                    value={importExam || ''}
                                    onChange={(e) => setImportExam(e.target.value ? parseInt(e.target.value) : null)}
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
                                    value={importExpiresDays}
                                    onChange={(e) => setImportExpiresDays(parseInt(e.target.value) || 7)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportData([]);
                                }}
                                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                            >
                                Batal
                            </button>
                            <button
                                onClick={importCodesFromExcel}
                                disabled={importing}
                                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                            >
                                {importing ? 'Mengimport...' : `Import ${importData.length} Kode`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
