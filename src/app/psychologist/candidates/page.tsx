'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Search, Mail, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Candidate {
    id: number;
    full_name: string;
    email: string;
    created_at: string;
    exam_count: number;
    completed_count: number;
    last_exam_date: string | null;
}

export default function PsychologistCandidatesPage() {
    const router = useRouter();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        try {
            const res = await fetch('/api/psychologist/candidates');
            if (res.status === 401 || res.status === 403) {
                router.push('/adminpsi');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setCandidates(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredCandidates = candidates.filter(c =>
        c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
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
                        onClick={() => router.push('/psychologist/dashboard')}
                        className="text-gray-600 hover:text-gray-800"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <img src="/asisya.png" alt="Asisya" className="w-10 h-10 rounded-lg shadow-md" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Daftar Kandidat</h1>
                        <p className="text-xs text-gray-500">Lihat semua peserta ujian</p>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Users className="text-blue-600" size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Kandidat</p>
                                <p className="text-xl font-bold text-gray-900">{candidates.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle className="text-green-600" size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Sudah Ujian</p>
                                <p className="text-xl font-bold text-gray-900">
                                    {candidates.filter(c => c.completed_count > 0).length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Clock className="text-yellow-600" size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Belum Ujian</p>
                                <p className="text-xl font-bold text-gray-900">
                                    {candidates.filter(c => c.completed_count === 0).length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6 max-w-md">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari kandidat..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                </div>

                {/* Candidates Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-semibold text-gray-700">Daftar Kandidat ({filteredCandidates.length})</h3>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Memuat data...</div>
                    ) : filteredCandidates.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Users size={32} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Belum ada kandidat</h3>
                            <p className="text-gray-500 mt-1">Kandidat akan muncul setelah mereka login menggunakan kode akses</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                                        <th className="px-6 py-3 font-medium">Kandidat</th>
                                        <th className="px-6 py-3 font-medium">Email</th>
                                        <th className="px-6 py-3 font-medium text-center">Ujian Selesai</th>
                                        <th className="px-6 py-3 font-medium">Terakhir Ujian</th>
                                        <th className="px-6 py-3 font-medium">Terdaftar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredCandidates.map((candidate) => (
                                        <tr key={candidate.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold">
                                                        {(candidate.full_name || 'U')[0].toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-gray-900">
                                                        {candidate.full_name || 'Unnamed'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Mail size={14} />
                                                    {candidate.email || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {candidate.completed_count > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                                        <CheckCircle size={14} />
                                                        {candidate.completed_count}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                                                        <XCircle size={14} />
                                                        0
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-gray-500 text-sm">
                                                    <Calendar size={14} />
                                                    {formatDate(candidate.last_exam_date)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-sm">
                                                {formatDate(candidate.created_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
