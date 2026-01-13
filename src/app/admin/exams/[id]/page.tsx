'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, CheckCircle, XCircle, Users, FileText, UserCircle, Download, Search, Trash2, Building2 } from 'lucide-react';

interface CompanyCode {
    id: number;
    code: string;
    company_name: string;
}

export default function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [exam, setExam] = useState<any>(null);
    const [results, setResults] = useState<any[]>([]);
    const [assignedCandidates, setAssignedCandidates] = useState<number[]>([]);
    const [isAssignedOnly, setIsAssignedOnly] = useState(false);
    const [adminList, setAdminList] = useState<any[]>([]);
    const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [examId, setExamId] = useState<string>('');
    const [downloading, setDownloading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    // Company code filter
    const [companyCodes, setCompanyCodes] = useState<CompanyCode[]>([]);
    const [selectedCompanyCode, setSelectedCompanyCode] = useState<string>('');
    // Delete state
    const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<{show: boolean; attemptId: number | null; studentName: string}>({show: false, attemptId: null, studentName: ''});

    useEffect(() => {
        params.then(p => setExamId(p.id));
    }, [params]);

    // Fetch company codes for filter
    useEffect(() => {
        const fetchCompanyCodes = async () => {
            try {
                const res = await fetch('/api/admin/company-codes');
                if (res.ok) {
                    const data = await res.json();
                    setCompanyCodes(data);
                }
            } catch (e) {
                // Silent fail for company codes
            }
        };
        fetchCompanyCodes();
    }, []);

    useEffect(() => {
        if (!examId) return;
        const fetchResults = async () => {
            try {
                // Always fetch all results
                const res = await fetch(`/api/admin/exams/${examId}/results?showAll=true`);
                if (res.ok) {
                    const data = await res.json();
                    setExam(data.exam);
                    setResults(data.results);
                    setAssignedCandidates(data.assignedCandidates || []);
                    setIsAssignedOnly(data.isAssignedOnly || false);
                    setAdminList(data.adminList || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [examId]);

    // Filter results based on company code, admin, and search
    const displayedResults = useMemo(() => {
        let filtered = results;
        
        // Filter by company code (top-level filter)
        if (selectedCompanyCode) {
            filtered = filtered.filter(r => r.company_code === selectedCompanyCode);
        }
        
        // Filter by admin
        if (selectedAdminId !== null) {
            const admin = adminList.find(a => a.admin_id === selectedAdminId);
            if (admin && admin.candidate_ids.length > 0) {
                filtered = filtered.filter(r => admin.candidate_ids.includes(r.user_id));
            } else {
                filtered = [];
            }
        }
        
        // Filter by search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r => r.student?.toLowerCase().includes(query));
        }
        
        return filtered;
    }, [results, selectedCompanyCode, selectedAdminId, adminList, searchQuery]);

    // Delete exam result handler
    const handleDeleteResult = async (attemptId: number) => {
        setDeleteLoading(attemptId);
        try {
            const res = await fetch(`/api/admin/exams/results/${attemptId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setResults(prev => prev.filter(r => r.id !== attemptId));
                setShowDeleteConfirm({show: false, attemptId: null, studentName: ''});
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal menghapus hasil ujian');
            }
        } catch (_e) {
            alert('Terjadi kesalahan saat menghapus');
        } finally {
            setDeleteLoading(null);
        }
    };

    // Download Excel function
    const handleDownload = async (filterType: 'all' | 'assigned' | 'selected') => {
        setDownloading(true);
        try {
            let url = `/api/admin/exams/${examId}/download?filter=all`;
            if (filterType === 'assigned' && assignedCandidates.length > 0) {
                url = `/api/admin/exams/${examId}/download?filter=assigned`;
            } else if (filterType === 'selected' && selectedAdminId !== null) {
                url = `/api/admin/exams/${examId}/download?filter=assigned&psychologistId=${selectedAdminId}`;
            }
            
            // Add company code filter to download URL
            if (selectedCompanyCode) {
                url += `&companyCode=${selectedCompanyCode}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;

                let filename = `Hasil_${exam?.title || 'Ujian'}`;
                if (selectedCompanyCode) {
                    const companyName = companyCodes.find(c => c.code === selectedCompanyCode)?.company_name || selectedCompanyCode;
                    filename += `_${companyName}`;
                }
                if (filterType === 'assigned') {
                    filename += '_Bagian_Saya';
                } else if (filterType === 'selected' && selectedAdminId !== null) {
                    const admin = adminList.find(a => a.admin_id === selectedAdminId);
                    filename += `_${admin?.admin_name || 'Admin'}`;
                } else if (!selectedCompanyCode) {
                    filename += '_Semua';
                }
                filename += '.xlsx';

                a.download = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(downloadUrl);
                document.body.removeChild(a);
            } else {
                alert('Gagal mengunduh file');
            }
        } catch (error) {
            console.error('Download error:', error);
            alert('Terjadi kesalahan saat mengunduh');
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-3 sm:p-6 font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <img src="/asisya.png" alt="Asisya" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg" />
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-500 hover:text-gray-800 text-sm sm:text-base"
                    >
                        <ArrowLeft size={16} className="mr-1 sm:mr-2 sm:w-5 sm:h-5" /> Kembali
                    </button>
                </div>

                <header className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{exam?.title}</h1>
                            <p className="text-gray-500 mt-1 text-sm sm:text-base">Hasil Peserta Ujian</p>
                            {isAssignedOnly && (
                                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                    <Users size={14} />
                                    Menampilkan {displayedResults.length} hasil dari {assignedCandidates.length} kandidat yang ditugaskan
                                </div>
                            )}
                        </div>

                        {/* Download Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            {selectedAdminId !== null && (
                                <button
                                    onClick={() => handleDownload('selected')}
                                    disabled={downloading}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
                                >
                                    <Download size={16} />
                                    {downloading ? 'Mengunduh...' : 'Download Filter Ini'}
                                </button>
                            )}
                            {isAssignedOnly && (
                                <button
                                    onClick={() => handleDownload('assigned')}
                                    disabled={downloading}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                                >
                                    <Download size={16} />
                                    {downloading ? 'Mengunduh...' : 'Download Ditugaskan'}
                                </button>
                            )}
                            <button
                                onClick={() => handleDownload('all')}
                                disabled={downloading}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                <Download size={16} />
                                {downloading ? 'Mengunduh...' : 'Download Semua'}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6">
                    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs sm:text-sm font-medium mb-1">
                            {isAssignedOnly ? 'Kandidat Saya' : 'Total'}
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-800">{displayedResults.length}</div>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-1 hidden sm:block">
                            {isAssignedOnly ? 'Ditugaskan ke Anda' : 'Peserta ujian'}
                        </p>
                    </div>
                    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs sm:text-sm font-medium mb-1">Selesai</div>
                        <div className="text-2xl sm:text-3xl font-bold text-green-600">{displayedResults.filter(r => r.score !== null).length}</div>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-1 hidden sm:block">Sudah mengumpulkan</p>
                    </div>
                </div>

                {/* Search + Company Code + Admin Filter */}
                <div className="mb-6 flex flex-col gap-4">
                    {/* Company Code Filter - TOP LEVEL */}
                    {companyCodes.length > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                            <Building2 size={18} className="text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">Perusahaan:</span>
                            <select
                                value={selectedCompanyCode}
                                onChange={(e) => {
                                    setSelectedCompanyCode(e.target.value);
                                    setSelectedAdminId(null); // Reset admin filter when company changes
                                }}
                                className="flex-1 sm:flex-none sm:w-64 px-3 py-2 border border-blue-300 rounded-lg text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Semua Perusahaan</option>
                                {companyCodes.map((cc) => (
                                    <option key={cc.id} value={cc.code}>
                                        {cc.company_name} ({cc.code})
                                    </option>
                                ))}
                            </select>
                            {selectedCompanyCode && (
                                <button
                                    onClick={() => setSelectedCompanyCode('')}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    )}
                    
                    {/* Search Input */}
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari nama peserta..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-80 pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400/60"
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
                    
                    {/* Admin Filter - Button + Dropdown */}
                    {adminList.length > 0 && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSelectedAdminId(null)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${selectedAdminId === null
                                        ? 'bg-blue-800 text-white shadow-md'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                Semua ({results.length})
                            </button>
                            <select
                                value={selectedAdminId || ''}
                                onChange={(e) => setSelectedAdminId(e.target.value ? parseInt(e.target.value) : null)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            >
                                <option value="">Pilih Admin...</option>
                                {adminList.map((admin) => {
                                    const adminResultCount = results.filter(r => admin.candidate_ids.includes(r.user_id)).length;
                                    return (
                                        <option key={admin.admin_id} value={admin.admin_id}>
                                            {admin.admin_name} ({adminResultCount})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm.show && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Konfirmasi Hapus</h3>
                            <p className="text-gray-600 mb-4">
                                Apakah Anda yakin ingin menghapus hasil ujian <strong>{showDeleteConfirm.studentName}</strong>?
                                Tindakan ini tidak dapat dibatalkan.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowDeleteConfirm({show: false, attemptId: null, studentName: ''})}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                                    disabled={deleteLoading !== null}
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={() => showDeleteConfirm.attemptId && handleDeleteResult(showDeleteConfirm.attemptId)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors disabled:opacity-50"
                                    disabled={deleteLoading !== null}
                                >
                                    {deleteLoading ? 'Menghapus...' : 'Ya, Hapus'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                                    <th className="px-6 py-3 font-medium">Nama Peserta</th>
                                    <th className="px-6 py-3 font-medium">Waktu Selesai</th>
                                    <th className="px-6 py-3 font-medium text-center">Nilai</th>
                                    <th className="px-6 py-3 font-medium text-center">Benar</th>
                                    <th className="px-6 py-3 font-medium text-center">Salah</th>
                                    <th className="px-6 py-3 font-medium text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayedResults.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                                            {selectedAdminId !== null
                                                ? 'Belum ada kandidat dari admin ini yang menyelesaikan ujian.'
                                                : isAssignedOnly
                                                    ? 'Belum ada kandidat Anda yang menyelesaikan ujian ini.'
                                                    : 'Belum ada peserta yang menyelesaikan ujian ini.'
                                            }
                                        </td>
                                    </tr>
                                ) : displayedResults.map((res: any) => (
                                    <tr key={res.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-800">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                    {res.student ? res.student.charAt(0).toUpperCase() : '?'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span>{res.student || 'Kandidat Tidak Dikenal'}</span>
                                                    {/* PSS Label */}
                                                    {res.pss_category && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium w-fit mt-0.5 ${
                                                            res.pss_category === 'Stres Ringan' ? 'bg-green-100 text-green-700' :
                                                            res.pss_category === 'Stres Sedang' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>{res.pss_category}</span>
                                                    )}
                                                    {/* SRQ Label */}
                                                    {res.srq_conclusion && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium w-fit mt-0.5 max-w-[120px] truncate ${
                                                            res.srq_conclusion === 'Normal' ? 'bg-green-100 text-green-700' :
                                                            'bg-orange-100 text-orange-700'
                                                        }`} title={res.srq_conclusion}>{res.srq_conclusion.split(' - ')[0]}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">
                                            {res.end_time ? new Date(res.end_time).toLocaleString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {/* Only show score in Nilai column - label is under name */}
                                            <span className="font-bold text-lg text-blue-600">{res.score}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {/* Show benar/salah for regular exams, - for PSS/SRQ */}
                                            {res.pss_category || res.srq_conclusion ? (
                                                <span className="text-gray-400">-</span>
                                            ) : res.correct_count !== null ? (
                                                <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                                                    <CheckCircle size={14} /> {res.correct_count}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {res.pss_category || res.srq_conclusion ? (
                                                <span className="text-gray-400">-</span>
                                            ) : res.incorrect_count !== null ? (
                                                <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                                                    <XCircle size={14} /> {res.incorrect_count}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-2 items-center">
                                                <button
                                                    onClick={() => router.push(`/admin/exams/${examId}/answers/${res.id}`)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-xs font-medium transition-colors w-full justify-center"
                                                >
                                                    <FileText size={14} />
                                                    Detail Jawaban
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/admin/candidates/${res.user_id}`)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg text-xs font-medium transition-colors w-full justify-center"
                                                >
                                                    <UserCircle size={14} />
                                                    Data Diri
                                                </button>
                                                <button
                                                    onClick={() => setShowDeleteConfirm({show: true, attemptId: res.id, studentName: res.student || 'Kandidat'})}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-medium transition-colors w-full justify-center"
                                                    disabled={deleteLoading === res.id}
                                                >
                                                    <Trash2 size={14} />
                                                    {deleteLoading === res.id ? 'Menghapus...' : 'Hapus'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {displayedResults.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                {selectedAdminId !== null
                                    ? 'Belum ada kandidat dari admin ini yang menyelesaikan ujian.'
                                    : isAssignedOnly
                                        ? 'Belum ada kandidat Anda yang menyelesaikan ujian ini.'
                                        : 'Belum ada peserta yang menyelesaikan ujian ini.'
                                }
                            </div>
                        ) : displayedResults.map((res: any) => (
                            <div key={res.id} className="p-4 hover:bg-gray-50 active:bg-gray-100">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                                        {(res.student || 'U').charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-gray-900 truncate">{res.student || 'Unknown'}</div>
                                        {/* PSS/SRQ Label under name in mobile */}
                                        {res.pss_category && (
                                            <div className={`text-[10px] px-1.5 py-0.5 rounded font-medium w-fit mt-0.5 ${
                                                res.pss_category === 'Stres Ringan' ? 'bg-green-100 text-green-700' :
                                                res.pss_category === 'Stres Sedang' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>{res.pss_category}</div>
                                        )}
                                        {res.srq_conclusion && (
                                            <div className={`text-[10px] px-1.5 py-0.5 rounded font-medium w-fit mt-0.5 max-w-[120px] truncate ${
                                                res.srq_conclusion === 'Normal' ? 'bg-green-100 text-green-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`} title={res.srq_conclusion}>{res.srq_conclusion.split(' - ')[0]}</div>
                                        )}
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {res.end_time ? new Date(res.end_time).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }) : '-'}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-2xl font-bold text-blue-600">{res.score}</div>
                                        <div className="text-[10px] text-gray-400">Nilai</div>
                                    </div>
                                </div>

                                {/* Correct/Incorrect counts removed for performance - available in detail view */}

                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => router.push(`/admin/exams/${examId}/answers/${res.id}`)}
                                        className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 active:bg-blue-200 text-blue-800 rounded-lg text-xs font-medium touch-manipulation"
                                    >
                                        <FileText size={14} />
                                        Jawaban
                                    </button>
                                    <button
                                        onClick={() => router.push(`/admin/candidates/${res.user_id}`)}
                                        className="flex items-center justify-center gap-1 px-3 py-2 bg-green-100 active:bg-green-200 text-green-800 rounded-lg text-xs font-medium touch-manipulation"
                                    >
                                        <UserCircle size={14} />
                                        Data Diri
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm({show: true, attemptId: res.id, studentName: res.student || 'Kandidat'})}
                                        className="flex items-center justify-center gap-1 px-3 py-2 bg-red-100 active:bg-red-200 text-red-700 rounded-lg text-xs font-medium touch-manipulation"
                                        disabled={deleteLoading === res.id}
                                    >
                                        <Trash2 size={14} />
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
