'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, CheckCircle, LogOut, ArrowRight, History } from 'lucide-react';

interface Exam {
    id: number;
    title: string;
    duration_minutes: number;
    created_at: string;
    description?: string;
}

interface CompletedExam {
    attempt_id: number;
    title: string;
    date: string;
    score: number;
}

export default function CandidateDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'todo' | 'completed'>('todo');
    const [todoExams, setTodoExams] = useState<Exam[]>([]);
    const [completedExams, setCompletedExams] = useState<CompletedExam[]>([]);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const res = await fetch('/api/candidate/dashboard');
            if (res.status === 401) {
                router.push('/');
                return;
            }
            if (res.ok) {
                const data = await res.json();

                if (data.inProgress) {
                    router.push(`/candidate/exam/${data.inProgress.exam_id}`);
                    return;
                }

                setTodoExams(data.todo);
                setCompletedExams(data.completed);
                setUser(data.user);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleStartExam = (id: number) => {
        router.push(`/candidate/exam/${id}`);
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
    }

    const _averageScore = useMemo(() => {
        if (completedExams.length === 0) return 0;
        return Math.round(completedExams.reduce((sum, e) => sum + e.score, 0) / completedExams.length);
    }, [completedExams]);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
                <div className="px-4 md:px-8 lg:px-40 flex h-16 items-center justify-between max-w-[1440px] mx-auto">
                    <div className="flex items-center gap-3 text-slate-900">
                        <img src="/asisya.png" alt="Asisya" className="h-10 w-auto" />
                        <h2 className="text-lg font-bold tracking-tight">Asisya Ujian Portal</h2>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="hidden sm:block">Keluar</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 px-4 md:px-8 lg:px-40 py-8 w-full max-w-[1440px] mx-auto">
                <div className="flex flex-col gap-8 max-w-5xl mx-auto">
                    {/* Welcome Section */}
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                            Selamat Datang{user?.full_name ? `, ${user.full_name}` : ''}
                        </h1>
                        <p className="text-slate-500">
                            Silakan cek jadwal ujian Anda dan selesaikan sebelum batas waktu.
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Ujian Tersedia</p>
                                    <p className="mt-2 text-4xl font-bold text-blue-600 tracking-tight">{todoExams.length}</p>
                                </div>
                                <div className="flex size-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                    <Calendar size={28} />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Selesai Dikerjakan</p>
                                    <p className="mt-2 text-4xl font-bold text-emerald-600 tracking-tight">{completedExams.length}</p>
                                </div>
                                <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                    <CheckCircle size={28} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex flex-col gap-6">
                        <div className="border-b border-slate-200">
                            <div className="flex gap-8">
                                <button
                                    onClick={() => setActiveTab('todo')}
                                    className={`relative flex items-center gap-2 pb-3 pt-2 text-sm font-semibold transition-colors ${activeTab === 'todo' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Calendar size={18} />
                                    <span>Jadwal Ujian</span>
                                    {activeTab === 'todo' && (
                                        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-blue-600 rounded-full" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('completed')}
                                    className={`relative flex items-center gap-2 pb-3 pt-2 text-sm font-semibold transition-colors ${activeTab === 'completed' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <History size={18} />
                                    <span>Riwayat & Hasil</span>
                                    {activeTab === 'completed' && (
                                        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-blue-600 rounded-full" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'todo' && (
                                    <div className="flex flex-col gap-4">
                                        {todoExams.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-200">
                                                <div className="rounded-full bg-slate-100 p-6">
                                                    <Calendar size={40} className="text-slate-400" />
                                                </div>
                                                <h3 className="mt-4 text-lg font-semibold text-slate-900">Tidak Ada Ujian Tersedia</h3>
                                                <p className="mt-2 text-sm text-slate-500 max-w-sm">
                                                    Saat ini tidak ada ujian yang dapat dikerjakan.
                                                </p>
                                            </div>
                                        ) : (
                                            todoExams.map((exam) => (
                                                <div
                                                    key={exam.id}
                                                    className="group relative flex flex-col md:flex-row overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-blue-200"
                                                >
                                                    {/* Image placeholder with gradient */}
                                                    <div
                                                        className="w-full md:w-56 h-40 md:h-auto bg-gradient-to-br from-blue-500 to-blue-700 shrink-0 flex items-center justify-center"
                                                    >
                                                        <Calendar size={48} className="text-white/50" />
                                                    </div>

                                                    <div className="flex flex-1 flex-col justify-between p-5 md:p-6">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex justify-between items-start">
                                                                <div className="space-y-2">
                                                                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                                        Psikotes
                                                                    </span>
                                                                    <h3 className="text-lg md:text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                                        {exam.title}
                                                                    </h3>
                                                                    <p className="text-sm text-slate-500 line-clamp-2">
                                                                        {exam.description || 'Tes psikologi untuk mengukur kemampuan dan kepribadian Anda.'}
                                                                    </p>
                                                                </div>
                                                                <div className="hidden md:flex flex-col items-end gap-1">
                                                                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                                                                        <Clock size={14} />
                                                                        {exam.duration_minutes} Menit
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Calendar size={16} className="text-slate-400" />
                                                                    <span>
                                                                        Dibuat: {new Date(exam.created_at).toLocaleDateString('id-ID', {
                                                                            day: 'numeric',
                                                                            month: 'long',
                                                                            year: 'numeric',
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="mt-6 flex items-center justify-end border-t border-slate-100 pt-4 md:border-0 md:pt-0">
                                                            <button
                                                                onClick={() => handleStartExam(exam.id)}
                                                                className="flex w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-sm font-bold shadow-lg shadow-blue-500/25 transition-all"
                                                            >
                                                                Mulai Ujian
                                                                <ArrowRight size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {activeTab === 'completed' && (
                                    <div className="flex flex-col gap-4">
                                        {completedExams.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-200">
                                                <div className="rounded-full bg-slate-100 p-6">
                                                    <History size={40} className="text-slate-400" />
                                                </div>
                                                <h3 className="mt-4 text-lg font-semibold text-slate-900">Belum ada riwayat ujian</h3>
                                                <p className="mt-2 text-sm text-slate-500 max-w-sm">
                                                    Anda belum menyelesaikan ujian apapun. Hasil ujian Anda akan muncul di sini setelah selesai.
                                                </p>
                                            </div>
                                        ) : (
                                            completedExams.map((exam) => (
                                                <div
                                                    key={exam.attempt_id}
                                                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                                                <CheckCircle size={24} />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-slate-900">{exam.title}</h3>
                                                                <p className="text-sm text-slate-500">
                                                                    Selesai: {new Date(exam.date).toLocaleDateString('id-ID', {
                                                                        day: 'numeric',
                                                                        month: 'long',
                                                                        year: 'numeric',
                                                                    })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                                                                <CheckCircle size={14} />
                                                                Selesai
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-auto border-t border-slate-200 bg-white py-6">
                <div className="px-4 md:px-8 lg:px-40 max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
                    <p>© 2025 Asisya Consulting. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a className="hover:text-blue-600 transition-colors" href="#">Bantuan</a>
                        <a className="hover:text-blue-600 transition-colors" href="#">Privasi</a>
                        <a className="hover:text-blue-600 transition-colors" href="#">Syarat & Ketentuan</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
