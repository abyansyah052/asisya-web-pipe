'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, UserCog, Shuffle, Save, RefreshCw } from 'lucide-react';

interface Exam {
    id: number;
    title: string;
    status: string;
}

interface Psychologist {
    id: number;
    username: string;
    full_name: string | null;
    assigned_count: number;
}

interface Candidate {
    id: number;
    username: string;
    full_name: string | null;
    assigned_to: number | null;
}

interface AssignmentInput {
    psychologistId: number;
    count: number;
}

export default function GroupingPage() {
    const router = useRouter();
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState<number | null>(null);
    const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Auto-assign inputs
    const [assignmentInputs, setAssignmentInputs] = useState<AssignmentInput[]>([]);
    const [autoAssignMode, setAutoAssignMode] = useState<'equal' | 'custom'>('equal');

    useEffect(() => {
        fetchExams();
        fetchPsychologists();
    }, []);

    useEffect(() => {
        if (selectedExam) {
            fetchCandidates(selectedExam);
        }
    }, [selectedExam]);

    const fetchExams = async () => {
        try {
            const res = await fetch('/api/admin/grouping/exams');
            if (res.status === 401 || res.status === 403) {
                router.push('/adminpsi');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setExams(data);
                if (data.length > 0) {
                    setSelectedExam(data[0].id);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPsychologists = async () => {
        try {
            const res = await fetch('/api/admin/psychologists');
            if (res.ok) {
                const data = await res.json();
                setPsychologists(data);
                // Initialize assignment inputs
                setAssignmentInputs(data.map((p: Psychologist) => ({
                    psychologistId: p.id,
                    count: 0
                })));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchCandidates = async (examId: number) => {
        try {
            const res = await fetch(`/api/admin/grouping/candidates?examId=${examId}`);
            if (res.ok) {
                const data = await res.json();
                setCandidates(data);
                // Update psychologist assigned counts
                updateAssignedCounts(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const updateAssignedCounts = (candidateList: Candidate[]) => {
        const counts: Record<number, number> = {};
        candidateList.forEach(c => {
            if (c.assigned_to) {
                counts[c.assigned_to] = (counts[c.assigned_to] || 0) + 1;
            }
        });

        setPsychologists(prev => prev.map(p => ({
            ...p,
            assigned_count: counts[p.id] || 0
        })));
    };

    const handleAutoAssign = () => {
        const unassignedCandidates = candidates.filter(c => !c.assigned_to);

        if (unassignedCandidates.length === 0) {
            alert('Tidak ada kandidat yang belum di-assign');
            return;
        }

        const newCandidates = [...candidates];

        if (autoAssignMode === 'equal') {
            // Equal distribution
            const perPsychologist = Math.floor(unassignedCandidates.length / psychologists.length);
            const remainder = unassignedCandidates.length % psychologists.length;

            let candidateIndex = 0;
            psychologists.forEach((psych, psychIndex) => {
                const count = perPsychologist + (psychIndex < remainder ? 1 : 0);
                for (let i = 0; i < count && candidateIndex < unassignedCandidates.length; i++) {
                    const candidate = unassignedCandidates[candidateIndex];
                    const idx = newCandidates.findIndex(c => c.id === candidate.id);
                    if (idx !== -1) {
                        newCandidates[idx] = { ...newCandidates[idx], assigned_to: psych.id };
                    }
                    candidateIndex++;
                }
            });
        } else {
            // Custom distribution based on inputs
            const totalRequested = assignmentInputs.reduce((sum, a) => sum + a.count, 0);

            if (totalRequested > unassignedCandidates.length) {
                alert(`Total yang diminta (${totalRequested}) lebih banyak dari kandidat tersedia (${unassignedCandidates.length})`);
                return;
            }

            let candidateIndex = 0;
            assignmentInputs.forEach(input => {
                for (let i = 0; i < input.count && candidateIndex < unassignedCandidates.length; i++) {
                    const candidate = unassignedCandidates[candidateIndex];
                    const idx = newCandidates.findIndex(c => c.id === candidate.id);
                    if (idx !== -1) {
                        newCandidates[idx] = { ...newCandidates[idx], assigned_to: input.psychologistId };
                    }
                    candidateIndex++;
                }
            });
        }

        setCandidates(newCandidates);
        updateAssignedCounts(newCandidates);
    };

    const handleSaveAssignment = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/grouping/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    examId: selectedExam,
                    assignments: candidates.map(c => ({
                        candidateId: c.id,
                        psychologistId: c.assigned_to
                    }))
                })
            });

            if (res.ok) {
                alert('Pembagian kandidat berhasil disimpan!');
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal menyimpan');
            }
        } catch (err) {
            alert('Terjadi kesalahan');
        } finally {
            setSaving(false);
        }
    };

    const handleResetAssignment = () => {
        if (!confirm('Yakin ingin reset semua pembagian?')) return;
        setCandidates(prev => prev.map(c => ({ ...c, assigned_to: null })));
        updateAssignedCounts([]);
    };

    const updateInputCount = (psychId: number, count: number) => {
        setAssignmentInputs(prev => prev.map(a =>
            a.psychologistId === psychId ? { ...a, count: Math.max(0, count) } : a
        ));
    };

    const unassignedCount = candidates.filter(c => !c.assigned_to).length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar - Mobile Responsive */}
            <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={() => router.push('/admin/dashboard')}
                        className="text-gray-600 hover:text-gray-800 p-1"
                    >
                        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <img src="/asisya.png" alt="Asisya" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shadow-md" />
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">Pembagian Kandidat</h1>
                        <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">Auto-assign kandidat ke psikolog</p>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-4 sm:p-6">
                {/* Exam Selection */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h3 className="font-semibold text-gray-700 mb-4">Pilih Ujian</h3>
                    <select
                        value={selectedExam || ''}
                        onChange={(e) => setSelectedExam(parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                        <option value="">Pilih ujian...</option>
                        {exams.map(exam => (
                            <option key={exam.id} value={exam.id}>{exam.title}</option>
                        ))}
                    </select>
                </div>

                {selectedExam && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Psychologists Panel */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                    <UserCog size={20} />
                                    Daftar Psikolog
                                </h3>
                            </div>

                            {/* Auto-assign Mode */}
                            <div className="p-4 border-b border-gray-100">
                                <div className="flex gap-4 mb-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="assignMode"
                                            checked={autoAssignMode === 'equal'}
                                            onChange={() => setAutoAssignMode('equal')}
                                            className="text-blue-600"
                                        />
                                        <span className="text-sm text-gray-900">Bagi Rata</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="assignMode"
                                            checked={autoAssignMode === 'custom'}
                                            onChange={() => setAutoAssignMode('custom')}
                                            className="text-blue-600"
                                        />
                                        <span className="text-sm text-gray-900">Custom Jumlah</span>
                                    </label>
                                </div>

                                {autoAssignMode === 'custom' && (
                                    <div className="space-y-2">
                                        {psychologists.map(psych => (
                                            <div key={psych.id} className="flex items-center justify-between">
                                                <span className="text-sm text-gray-700">
                                                    {psych.full_name || psych.username}
                                                </span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={assignmentInputs.find(a => a.psychologistId === psych.id)?.count || 0}
                                                    onChange={(e) => updateInputCount(psych.id, parseInt(e.target.value) || 0)}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-gray-900"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={handleAutoAssign}
                                    className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                >
                                    <Shuffle size={18} />
                                    Auto-Assign Kandidat
                                </button>
                            </div>

                            {/* Psychologist List */}
                            <div className="divide-y divide-gray-100">
                                {psychologists.map(psych => (
                                    <div key={psych.id} className="px-6 py-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold">
                                                {(psych.full_name || psych.username)[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {psych.full_name || psych.username}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                            {psych.assigned_count} kandidat
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Candidates Panel */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                    <Users size={20} />
                                    Daftar Kandidat ({candidates.length})
                                </h3>
                                <span className="text-sm text-gray-500">
                                    Belum di-assign: {unassignedCount}
                                </span>
                            </div>

                            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                                {candidates.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        Tidak ada kandidat untuk ujian ini
                                    </div>
                                ) : (
                                    candidates.map(candidate => {
                                        const assignedPsych = psychologists.find(p => p.id === candidate.assigned_to);
                                        return (
                                            <div key={candidate.id} className="px-6 py-3 flex items-center justify-between">
                                                <div className="text-sm">
                                                    <div className="font-medium text-gray-900">
                                                        {candidate.full_name || candidate.username}
                                                    </div>
                                                </div>
                                                <select
                                                    value={candidate.assigned_to || ''}
                                                    onChange={(e) => {
                                                        const newAssignedTo = e.target.value ? parseInt(e.target.value) : null;
                                                        const newCandidates = candidates.map(c =>
                                                            c.id === candidate.id ? { ...c, assigned_to: newAssignedTo } : c
                                                        );
                                                        setCandidates(newCandidates);
                                                        updateAssignedCounts(newCandidates);
                                                    }}
                                                    className={`text-sm px-3 py-1 border rounded-lg ${candidate.assigned_to
                                                            ? 'border-green-300 bg-green-50 text-green-800'
                                                            : 'border-gray-300 text-gray-600'
                                                        }`}
                                                >
                                                    <option value="">Belum di-assign</option>
                                                    {psychologists.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.full_name || p.username}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {selectedExam && candidates.length > 0 && (
                    <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                        <button
                            onClick={handleResetAssignment}
                            className="flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-300 w-full sm:w-auto"
                        >
                            <RefreshCw size={18} />
                            Reset
                        </button>
                        <button
                            onClick={handleSaveAssignment}
                            disabled={saving}
                            className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 w-full sm:w-auto"
                        >
                            <Save size={18} />
                            {saving ? 'Menyimpan...' : 'Simpan Pembagian'}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
