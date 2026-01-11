'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, UserCog, Shuffle, Hand, X, Search } from 'lucide-react';

interface Exam {
    id: number;
    title: string;
    duration_minutes: number;
}

interface Candidate {
    id: number;
    full_name: string;
    email: string;
    nomor_peserta: number;
}

interface Admin {
    id: number;
    full_name: string;
    email: string;
}

interface CandidateGroup {
    adminId: number;
    candidates: number[]; // candidate IDs
}

export default function GroupingPage() {
    const router = useRouter();
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [groups, setGroups] = useState<CandidateGroup[]>([]);
    const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set());
    const [_loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchExams();
        fetchAdmins();
    }, []);

    useEffect(() => {
        if (selectedExamId) {
            fetchExamData();
        }
    }, [selectedExamId]);

    const fetchExams = async () => {
        try {
            const res = await fetch('/api/superadmin/exams');
            if (res.ok) {
                const data = await res.json();
                setExams(data.exams);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchAdmins = async () => {
        try {
            const res = await fetch('/api/superadmin/admins');
            if (res.ok) {
                const data = await res.json();
                setAdmins(data.admins);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchExamData = async () => {
        if (!selectedExamId) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/superadmin/grouping/${selectedExamId}`);
            if (res.ok) {
                const data = await res.json();
                console.log('Exam data received:', data);
                setCandidates(data.candidates);
                setGroups(data.groups || []);
            } else {
                console.error('Failed to fetch exam data:', await res.text());
            }
        } catch (e) {
            console.error('Error fetching exam data:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleAutoDivide = () => {
        if (admins.length === 0 || candidates.length === 0) {
            alert('Tidak ada admin atau kandidat untuk dibagi');
            return;
        }

        const candidatesPerAdmin = Math.ceil(candidates.length / admins.length);
        const newGroups: CandidateGroup[] = [];

        let candidateIndex = 0;
        admins.forEach(admin => {
            const adminCandidates: number[] = [];
            for (let i = 0; i < candidatesPerAdmin && candidateIndex < candidates.length; i++) {
                adminCandidates.push(candidates[candidateIndex].id);
                candidateIndex++;
            }
            newGroups.push({
                adminId: admin.id,
                candidates: adminCandidates
            });
        });

        setGroups(newGroups);
        alert(`Kandidat berhasil dibagi rata ke ${admins.length} admin!`);
    };

    const handleCandidateClick = (candidateId: number, event: React.MouseEvent) => {
        const newSelected = new Set(selectedCandidates);

        if (event.shiftKey && selectedCandidates.size > 0) {
            // Block select: select all between last selected and current
            const candidateIds = candidates.map(c => c.id);
            const lastSelected = Array.from(selectedCandidates)[selectedCandidates.size - 1];
            const lastIndex = candidateIds.indexOf(lastSelected);
            const currentIndex = candidateIds.indexOf(candidateId);

            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);

            for (let i = start; i <= end; i++) {
                newSelected.add(candidateIds[i]);
            }
        } else {
            // Single select/deselect
            if (newSelected.has(candidateId)) {
                newSelected.delete(candidateId);
            } else {
                newSelected.add(candidateId);
            }
        }

        setSelectedCandidates(newSelected);
    };

    const handleAssignToAdmin = (adminId: number) => {
        if (selectedCandidates.size === 0) {
            alert('Pilih kandidat terlebih dahulu');
            return;
        }

        const newGroups = [...groups];
        const groupIndex = newGroups.findIndex(g => g.adminId === adminId);

        // Remove selected candidates from all groups
        newGroups.forEach(group => {
            group.candidates = group.candidates.filter(id => !selectedCandidates.has(id));
        });

        // Add to target admin group
        if (groupIndex !== -1) {
            newGroups[groupIndex].candidates.push(...Array.from(selectedCandidates));
        } else {
            newGroups.push({
                adminId,
                candidates: Array.from(selectedCandidates)
            });
        }

        setGroups(newGroups);
        setSelectedCandidates(new Set());
    };

    const handleRemoveCandidate = (adminId: number, candidateId: number) => {
        const newGroups = [...groups];
        const groupIndex = newGroups.findIndex(g => g.adminId === adminId);

        if (groupIndex !== -1) {
            newGroups[groupIndex].candidates = newGroups[groupIndex].candidates.filter(id => id !== candidateId);
        }

        setGroups(newGroups);
    };

    const handleSaveGroups = async () => {
        if (!selectedExamId) {
            alert('Pilih ujian terlebih dahulu');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/superadmin/grouping/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    examId: selectedExamId,
                    groups
                })
            });

            if (res.ok) {
                alert('Pembagian peserta berhasil disimpan!');
            } else {
                const error = await res.json();
                alert(error.error || 'Gagal menyimpan pembagian');
            }
        } catch (e) {
            alert('Terjadi kesalahan saat menyimpan');
        } finally {
            setSaving(false);
        }
    };

    const getAssignedCandidates = (adminId: number): Candidate[] => {
        const group = groups.find(g => g.adminId === adminId);
        if (!group) return [];
        return candidates.filter(c => group.candidates.includes(c.id));
    };

    const getUnassignedCandidates = (): Candidate[] => {
        const assignedIds = new Set(groups.flatMap(g => g.candidates));
        return candidates.filter(c => !assignedIds.has(c.id));
    };

    // Filter unassigned candidates based on search
    const filteredUnassignedCandidates = useMemo(() => {
        const unassigned = getUnassignedCandidates();
        if (!searchQuery.trim()) return unassigned;
        const query = searchQuery.toLowerCase().trim();
        return unassigned.filter(c => 
            (c.full_name?.toLowerCase().includes(query)) ||
            (c.email?.toLowerCase().includes(query)) ||
            (String(c.nomor_peserta).includes(query))
        );
    }, [candidates, groups, searchQuery]);

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
                        <h1 className="text-xl font-bold text-blue-800">Pembagian Peserta</h1>
                        <p className="text-xs text-gray-500">Assign peserta ke admin per ujian</p>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-6 mt-6">
                {/* Exam Selection */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Pilih Ujian
                    </label>
                    <select
                        value={selectedExamId || ''}
                        onChange={(e) => setSelectedExamId(Number(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:border-transparent text-gray-900"
                    >
                        <option value="">-- Pilih Ujian --</option>
                        {exams.map(exam => (
                            <option key={exam.id} value={exam.id}>
                                {exam.title} ({exam.duration_minutes} menit)
                            </option>
                        ))}
                    </select>
                </div>

                {selectedExamId && (
                    <>
                        {/* Action Buttons */}
                        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-6">
                            <h3 className="font-bold text-gray-900 mb-4">Aksi Cepat</h3>
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={handleAutoDivide}
                                    className="flex items-center gap-2 px-6 py-3 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-lg transition-colors"
                                >
                                    <Shuffle size={18} />
                                    Bagi Rata Otomatis
                                </button>
                                <button
                                    onClick={handleSaveGroups}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {saving ? 'Menyimpan...' : 'Simpan Pembagian'}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-3">
                                Tips: Gunakan Shift+Click untuk block select kandidat
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Unassigned Candidates */}
                            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Users size={20} />
                                    Peserta Belum Ditugaskan ({getUnassignedCandidates().length})
                                </h3>
                                {/* Search Input */}
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Cari nama peserta..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                                    />
                                </div>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {filteredUnassignedCandidates.length === 0 ? (
                                        <p className="text-sm text-gray-400 italic text-center py-4">
                                            {searchQuery ? 'Tidak ada peserta yang cocok' : 'Tidak ada peserta belum ditugaskan'}
                                        </p>
                                    ) : filteredUnassignedCandidates.map(candidate => (
                                        <div
                                            key={candidate.id}
                                            onClick={(e) => handleCandidateClick(candidate.id, e)}
                                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedCandidates.has(candidate.id)
                                                ? 'border-blue-800 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="font-semibold text-gray-900">{candidate.full_name}</div>
                                            <div className="text-sm text-gray-500">No. {candidate.nomor_peserta} • {candidate.email}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Admin Groups */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <UserCog size={20} />
                                    Pembagian per Admin
                                </h3>
                                {admins.map(admin => {
                                    const assignedCandidates = getAssignedCandidates(admin.id);
                                    return (
                                        <div key={admin.id} className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h4 className="font-bold text-gray-900">{admin.full_name}</h4>
                                                    <p className="text-sm text-gray-500">{admin.email}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-blue-800">{assignedCandidates.length}</div>
                                                    <div className="text-xs text-gray-500">peserta</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAssignToAdmin(admin.id)}
                                                disabled={selectedCandidates.size === 0}
                                                className="w-full mb-3 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                <Hand size={16} />
                                                Assign {selectedCandidates.size > 0 ? `${selectedCandidates.size} ` : ''}Peserta ke Admin Ini
                                            </button>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {assignedCandidates.map(candidate => (
                                                    <div key={candidate.id} className="p-2 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between group hover:bg-gray-100 transition-colors">
                                                        <div className="flex-1">
                                                            <div className="font-semibold text-sm text-gray-900">{candidate.full_name}</div>
                                                            <div className="text-xs text-gray-500">No. {candidate.nomor_peserta}</div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveCandidate(admin.id, candidate.id)}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded text-red-600"
                                                            title="Hapus dari admin ini"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {assignedCandidates.length === 0 && (
                                                    <p className="text-sm text-gray-400 italic text-center py-4">Belum ada peserta ditugaskan</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
