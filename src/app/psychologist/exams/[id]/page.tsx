'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, CheckCircle, XCircle, Users, FileText, UserCircle, Filter, Download, Clock, Search } from 'lucide-react';

export default function PsychologistExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [exam, setExam] = useState<any>(null);
    const [results, setResults] = useState<any[]>([]);
    const [assignedCandidates, setAssignedCandidates] = useState<number[]>([]);
    const [isAssignedOnly, setIsAssignedOnly] = useState(false);
    const [psychologistList, setPsychologistList] = useState<any[]>([]);
    const [selectedFilter, setSelectedFilter] = useState<'all' | number>('all'); // 'all' or psychologist ID
    const [loading, setLoading] = useState(true);
    const [examId, setExamId] = useState<string>('');
    const [downloading, setDownloading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Tab state: 'assigned' or 'all'
    const [viewMode, setViewMode] = useState<'assigned' | 'all'>('assigned');
    // Toggle to include in-progress candidates (started but not completed)
    const [includeInProgress, setIncludeInProgress] = useState(false);

    useEffect(() => {
        params.then(p => setExamId(p.id));
    }, [params]);

    useEffect(() => {
        if (!examId) return;
        const fetchResults = async () => {
            try {
                // ALWAYS fetch all results - filtering is done client-side
                const queryParams = new URLSearchParams();
                queryParams.set('showAll', 'true'); // Always get all
                if (includeInProgress) queryParams.set('includeInProgress', 'true');
                const queryString = queryParams.toString();
                const url = `/api/admin/exams/${examId}/results${queryString ? `?${queryString}` : ''}`;
                
                const res = await fetch(url);
                if (res.status === 401 || res.status === 403) {
                    router.push('/adminpsi');
                    return;
                }
                if (res.ok) {
                    const data = await res.json();
                    setExam(data.exam);
                    setResults(data.results);
                    setAssignedCandidates(data.assignedCandidates || []);
                    setIsAssignedOnly(data.isAssignedOnly || false);
                    setPsychologistList(data.adminList || []);
                    
                    // If no assigned candidates, default to 'all' view
                    if (!data.assignedCandidates || data.assignedCandidates.length === 0) {
                        setViewMode('all');
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [examId, router, includeInProgress]); // Remove viewMode dependency - always fetch all

    // Filter results based on viewMode, psychologist selection, and search
    const displayedResults = useMemo(() => {
        let filtered = results;
        
        // First filter by viewMode (assigned vs all)
        if (viewMode === 'assigned' && assignedCandidates.length > 0) {
            filtered = filtered.filter(r => assignedCandidates.includes(r.user_id));
        }
        
        // Then filter by psychologist if selected
        if (selectedFilter !== 'all') {
            const psychologist = psychologistList.find(p => p.admin_id === selectedFilter);
            if (psychologist && psychologist.candidate_ids.length > 0) {
                filtered = filtered.filter(r => psychologist.candidate_ids.includes(r.user_id));
            } else {
                filtered = [];
            }
        }
        
        // Finally filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r => 
                r.student?.toLowerCase().includes(query)
            );
        }
        
        return filtered;
    }, [results, viewMode, assignedCandidates, selectedFilter, psychologistList, searchQuery]);

    // Download Excel function
    const handleDownload = async (filterType: 'all' | 'assigned' | 'current') => {
        setDownloading(true);
        try {
            // Build URL with filter params
            let url = `/api/admin/exams/${examId}/download?filter=all`;
            if (filterType === 'assigned') {
                url = `/api/admin/exams/${examId}/download?filter=assigned`;
            } else if (filterType === 'current' && selectedFilter !== 'all') {
                url = `/api/admin/exams/${examId}/download?filter=assigned&psychologistId=${selectedFilter}`;
            }
            
            const response = await fetch(url);
            if (response.ok) {
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                
                let filename = `Hasil_${exam?.title || 'Ujian'}`;
                if (filterType === 'assigned') {
                    filename += '_Bagian_Saya';
                } else if (filterType === 'current' && selectedFilter !== 'all') {
                    const psych = psychologistList.find(p => p.admin_id === selectedFilter);
                    filename += `_${psych?.admin_name || 'Psikolog'}`;
                } else {
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
                        onClick={() => router.push('/psychologist/dashboard')}
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
                            
                            {/* Tab untuk switch Kandidat Saya vs Semua Kandidat - SELALU tampilkan */}
                            <div className="mt-3 flex flex-wrap gap-2">
                                {assignedCandidates.length > 0 && (
                                    <button
                                        onClick={() => setViewMode('assigned')}
                                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                            viewMode === 'assigned'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        Kandidat Saya ({results.filter(r => assignedCandidates.includes(r.user_id)).length}/{assignedCandidates.length})
                                    </button>
                                )}
                                <button
                                    onClick={() => setViewMode('all')}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                        viewMode === 'all' || assignedCandidates.length === 0
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Semua Kandidat ({results.length})
                                </button>
                            </div>
                            
                            {/* Toggle untuk termasuk yang belum selesai */}
                            <div className="mt-3 flex items-center gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeInProgress}
                                        onChange={(e) => setIncludeInProgress(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-600">Termasuk yang Sedang Mengerjakan</span>
                                </label>
                                {includeInProgress && (
                                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full flex items-center gap-1">
                                        <Clock size={12} />
                                        Termasuk In-Progress
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        {/* Download Buttons - Always show both */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={() => handleDownload('assigned')}
                                disabled={downloading || assignedCandidates.length === 0}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                <Download size={16} />
                                {downloading ? 'Mengunduh...' : 'Download Bagian Saya'}
                            </button>
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

                {/* Stats Cards - Always show MY assigned stats, not filtered */}
                <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6">
                    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs sm:text-sm font-medium mb-1">
                            Kandidat Saya
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-800">
                            {results.filter(r => assignedCandidates.includes(r.user_id)).length}
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-1 hidden sm:block">
                            Dari {assignedCandidates.length} yang ditugaskan
                        </p>
                    </div>
                    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs sm:text-sm font-medium mb-1">Selesai</div>
                        <div className="text-2xl sm:text-3xl font-bold text-green-600">
                            {results.filter(r => assignedCandidates.includes(r.user_id) && r.score !== null).length}
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-1 hidden sm:block">Sudah mengumpulkan</p>
                    </div>
                </div>

                {/* Search + Psychologist Filter */}
                <div className="mb-6 flex flex-col gap-4">
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
                    
                    {/* Psychologist Filter - Button + Dropdown */}
                    {psychologistList.filter(p => p.admin_name).length > 0 && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="flex items-center gap-2 text-gray-600 text-sm">
                                <Filter size={16} />
                                <span className="font-medium">Filter Psikolog:</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => setSelectedFilter('all')}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                        selectedFilter === 'all'
                                            ? 'bg-blue-800 text-white shadow-md'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    Semua ({results.length})
                                </button>
                                <select
                                    value={selectedFilter === 'all' ? '' : selectedFilter}
                                    onChange={(e) => setSelectedFilter(e.target.value ? parseInt(e.target.value) : 'all')}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                    <option value="">Pilih Psikolog...</option>
                                    {psychologistList.filter(p => p.admin_name).map((psych) => {
                                        const psychResultCount = results.filter(r => psych.candidate_ids.includes(r.user_id)).length;
                                        return (
                                            <option key={psych.admin_id} value={psych.admin_id}>
                                                {psych.admin_name} ({psychResultCount})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

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
                                            {selectedFilter !== 'all'
                                                ? 'Belum ada kandidat dari psikolog ini yang menyelesaikan ujian.'
                                                : 'Belum ada peserta yang menyelesaikan ujian ini.'
                                            }
                                        </td>
                                    </tr>
                                ) : displayedResults.map((res: any) => (
                                    <tr key={res.id || res.user_id} className={`hover:bg-gray-50 ${!res.id ? 'bg-gray-50/50' : ''}`}>
                                        <td className="px-6 py-4 font-medium text-gray-800">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                                    res.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
                                                }`}>
                                                    {res.student?.charAt(0) || '?'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span>{res.student}</span>
                                                    {!res.id && (
                                                        <span className="text-xs text-orange-500 font-normal">(Belum mengerjakan)</span>
                                                    )}
                                                    {/* PSS Label under name */}
                                                    {res.pss_category && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium w-fit mt-0.5 ${
                                                            res.pss_category === 'Stres Ringan' ? 'bg-green-100 text-green-700' :
                                                            res.pss_category === 'Stres Sedang' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>{res.pss_category}</span>
                                                    )}
                                                    {/* SRQ Label under name */}
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
                                            {res.end_time ? new Date(res.end_time).toLocaleString() : (
                                                <span className="text-gray-400 italic">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {/* Only show score in Nilai column - label is under name */}
                                            {res.score !== null ? (
                                                <span className="font-bold text-lg text-blue-600">{res.score}</span>
                                            ) : (
                                                <span className="text-gray-400 text-sm font-normal">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {/* Show benar/salah for regular exams, - for PSS/SRQ */}
                                            {res.pss_category || res.srq_conclusion ? (
                                                <span className="text-gray-400">-</span>
                                            ) : res.correct_count !== null && res.correct_count !== undefined ? (
                                                <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                                                    <CheckCircle size={14} /> {res.correct_count}
                                                </span>
                                            ) : res.id ? (
                                                <span className="text-gray-400 text-sm">-</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {res.pss_category || res.srq_conclusion ? (
                                                <span className="text-gray-400">-</span>
                                            ) : res.incorrect_count !== null && res.incorrect_count !== undefined ? (
                                                <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                                                    <XCircle size={14} /> {res.incorrect_count}
                                                </span>
                                            ) : res.id ? (
                                                <span className="text-gray-400 text-sm">-</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {res.id ? (
                                                <div className="flex flex-col gap-2 items-center">
                                                    <button
                                                        onClick={() => router.push(`/psychologist/exams/${examId}/answers/${res.id}`)}
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
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2 items-center">
                                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium">
                                                        <Clock size={14} />
                                                        Menunggu
                                                    </span>
                                                    <button
                                                        onClick={() => router.push(`/admin/candidates/${res.user_id}`)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg text-xs font-medium transition-colors w-full justify-center"
                                                    >
                                                        <UserCircle size={14} />
                                                        Data Diri
                                                    </button>
                                                </div>
                                            )}
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
                                {selectedFilter !== 'all'
                                    ? 'Belum ada kandidat dari psikolog ini yang menyelesaikan ujian.'
                                    : 'Belum ada peserta yang menyelesaikan ujian ini.'
                                }
                            </div>
                        ) : displayedResults.map((res: any) => (
                            <div key={res.id || res.user_id} className={`p-4 hover:bg-gray-50 active:bg-gray-100 ${!res.id ? 'bg-gray-50/50' : ''}`}>
                                <div className="flex items-start gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                        res.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
                                    }`}>
                                        {res.student?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-gray-900 truncate">{res.student}</div>
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
                                            }) : (
                                                <span className="text-orange-500">Belum mengerjakan</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className={`text-2xl font-bold ${res.id ? 'text-blue-600' : 'text-gray-400'}`}>
                                            {res.score !== null ? res.score : '-'}
                                        </div>
                                        {/* Show PSS category or SRQ conclusion in mobile */}
                                        {res.pss_category ? (
                                            <div className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                                res.pss_category === 'Stres Ringan' ? 'bg-green-100 text-green-700' :
                                                res.pss_category === 'Stres Sedang' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>{res.pss_category}</div>
                                        ) : res.srq_conclusion ? (
                                            <div className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate max-w-[80px] ${
                                                res.srq_conclusion === 'Normal' ? 'bg-green-100 text-green-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>{res.srq_conclusion.split(' - ')[0]}</div>
                                        ) : (
                                            <div className="text-[10px] text-gray-400">Nilai</div>
                                        )}
                                    </div>
                                </div>
                                
                                {res.id ? (
                                    <>
                                        {/* Benar/Salah removed for performance - see detail view */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => router.push(`/psychologist/exams/${examId}/answers/${res.id}`)}
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
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex gap-2">
                                        <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium">
                                            <Clock size={14} />
                                            Menunggu mengerjakan ujian
                                        </div>
                                        <button
                                            onClick={() => router.push(`/admin/candidates/${res.user_id}`)}
                                            className="flex items-center justify-center gap-1 px-3 py-2 bg-green-100 active:bg-green-200 text-green-800 rounded-lg text-xs font-medium touch-manipulation"
                                        >
                                            <UserCircle size={14} />
                                            Data Diri
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
