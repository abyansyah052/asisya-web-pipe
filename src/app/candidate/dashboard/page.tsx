'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, CheckCircle, LogOut, ArrowRight, History, X, BookOpen, FileText, Timer, AlertTriangle } from 'lucide-react';

// Default instructions for specific exam types
const EXAM_TYPE_INSTRUCTIONS: Record<string, { title: string; instructions: string; warning: string }> = {
    pss: {
        title: 'Perceived Stress Scale (PSS)',
        warning: 'Pastikan Anda menjawab semua pertanyaan dengan jujur berdasarkan perasaan dan pikiran Anda selama satu bulan terakhir.',
        instructions: `Petunjuk Pengisian:

1. Bacalah pertanyaan dan pernyataan berikut dengan baik
2. Anda diperbolehkan bertanya kepada peneliti jika ada pertanyaan/pernyataan yang tidak dimengerti
3. Berikan tanda centang pada salah satu pilihan jawaban yang paling sesuai dengan perasaan dan pikiran Anda selama SATU BULAN TERAKHIR

Keterangan Pilihan Jawaban:
• 0 : Tidak pernah
• 1 : Hampir tidak pernah (1-2 kali)
• 2 : Kadang-kadang (3-4 kali)
• 3 : Hampir sering (5-6 kali)
• 4 : Sangat sering (lebih dari 6 kali)

Selamat mengisi dan terima kasih atas kerjasamanya.`
    },
    srq29: {
        title: 'Self-Reporting Questionnaire (SRQ-29)',
        warning: 'Jawaban Anda bersifat RAHASIA dan hanya akan digunakan untuk membantu pemecahan masalah Anda.',
        instructions: `Petunjuk Pengisian:

1. Bacalah petunjuk ini seluruhnya sebelum mulai mengisi
2. Pertanyaan berikut berhubungan dengan masalah yang mungkin mengganggu Anda selama 30 HARI TERAKHIR
3. Apabila Anda menganggap pertanyaan itu Anda alami dalam 30 hari terakhir, berilah jawaban YA
4. Apabila Anda menganggap pertanyaan itu TIDAK Anda alami dalam 30 hari terakhir, berilah jawaban TIDAK
5. Jika Anda tidak yakin dengan jawabannya, berilah jawaban yang paling sesuai diantara Ya dan Tidak

Kami tegaskan bahwa jawaban Anda bersifat rahasia dan akan digunakan hanya untuk membantu pemecahan masalah Anda.`
    },
    mmpi: {
        title: 'Minnesota Multiphasic Personality Inventory (MMPI)',
        warning: 'Pastikan koneksi internet stabil. Jawab dengan jujur sesuai kondisi diri Anda yang sebenarnya.',
        instructions: `Petunjuk Pengisian:

1. Di hadapan Anda akan disajikan 183 pernyataan yang harus Anda jawab
2. Bacalah setiap pernyataan dengan cermat
3. Jawablah setiap pernyataan dengan memilih salah satu pilihan: Ya atau Tidak
4. Tidak ada jawaban yang benar atau salah, jawablah sesuai dengan kondisi diri Anda yang sebenarnya
5. Pastikan semua pernyataan terjawab sebelum menyelesaikan tes

Selamat mengerjakan!`
    }
};

interface Exam {
    id: number;
    title: string;
    duration_minutes: number;
    created_at: string;
    description?: string;
    instructions?: string;
    exam_type?: string;
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
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [showInstructionsModal, setShowInstructionsModal] = useState(false);

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

    const handleStartExam = (exam: Exam) => {
        // Show instructions modal if exam has instructions OR has special exam_type (PSS, SRQ29, MMPI)
        const hasCustomInstructions = exam.instructions && exam.instructions.trim();
        const hasDefaultInstructions = exam.exam_type && EXAM_TYPE_INSTRUCTIONS[exam.exam_type];
        
        if (hasCustomInstructions || hasDefaultInstructions) {
            setSelectedExam(exam);
            setShowInstructionsModal(true);
        } else {
            router.push(`/candidate/exam/${exam.id}`);
        }
    };

    // Get instructions content for the modal
    const getInstructionsContent = (exam: Exam) => {
        // If exam has custom instructions, use those
        if (exam.instructions && exam.instructions.trim()) {
            return {
                instructions: exam.instructions,
                warning: 'Timer akan mulai setelah menekan "Mulai Ujian". Pastikan koneksi internet stabil.'
            };
        }
        // Otherwise use default instructions based on exam_type
        const defaultInstr = exam.exam_type ? EXAM_TYPE_INSTRUCTIONS[exam.exam_type] : null;
        if (defaultInstr) {
            return {
                instructions: defaultInstr.instructions,
                warning: defaultInstr.warning
            };
        }
        return { instructions: '', warning: '' };
    };

    const handleConfirmStartExam = () => {
        if (selectedExam) {
            router.push(`/candidate/exam/${selectedExam.id}`);
        }
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
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#E6FBFB] to-slate-50">
            {/* Instructions Modal - Kimia Farma Navy & Teal Theme */}
            {showInstructionsModal && selectedExam && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4">
                    <div className="bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden">
                        {/* Modal Header with Navy & Teal Gradient */}
                        <div className="shrink-0 relative bg-gradient-to-br from-[#071F56] via-[#0993A9] to-[#2A8D9B] px-4 sm:px-8 py-5 sm:py-8 text-white overflow-hidden">
                            {/* Decorative circles */}
                            <div className="absolute -top-10 -right-10 w-32 sm:w-40 h-32 sm:h-40 bg-white/10 rounded-full"></div>
                            <div className="absolute -bottom-20 -left-10 w-48 sm:w-60 h-48 sm:h-60 bg-white/5 rounded-full"></div>
                            
                            <button
                                onClick={() => setShowInstructionsModal(false)}
                                className="absolute top-3 sm:top-4 right-3 sm:right-4 p-3 rounded-full hover:bg-white/20 transition-colors text-gray-900 bg-white/80"
                                aria-label="Tutup"
                            >
                                <X size={24} className="sm:w-6 sm:h-6" />
                            </button>
                            
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg sm:rounded-xl">
                                        <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/20 rounded-full text-xs sm:text-sm font-medium">
                                        Petunjuk Pengerjaan
                                    </span>
                                </div>
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 pr-8">{selectedExam.title}</h2>
                                <p className="text-[#BEE7F0] text-xs sm:text-sm md:text-base line-clamp-2">{selectedExam.description}</p>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 min-h-0">
                            {/* Info Cards */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
                                <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-[#E6FBFB] to-[#BEE7F0]/50 rounded-xl sm:rounded-2xl border border-[#0993A9]/20">
                                    <div className="p-1.5 sm:p-2 bg-[#0993A9] rounded-lg sm:rounded-xl text-white shrink-0">
                                        <Timer className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] sm:text-xs text-[#0993A9] font-medium">Durasi</p>
                                        <p className="text-sm sm:text-lg font-bold text-[#071F56]">{selectedExam.duration_minutes} Menit</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-[#EF942A]/10 to-[#EF942A]/5 rounded-xl sm:rounded-2xl border border-[#EF942A]/20">
                                    <div className="p-1.5 sm:p-2 bg-[#EF942A] rounded-lg sm:rounded-xl text-white shrink-0">
                                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] sm:text-xs text-[#EF942A] font-medium">Jenis</p>
                                        <p className="text-sm sm:text-lg font-bold text-[#071F56]">Psikotes</p>
                                    </div>
                                </div>
                            </div>

                            {/* Warning Box */}
                            <div className="flex gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-r from-red-50 to-[#EF942A]/10 rounded-xl sm:rounded-2xl border border-red-100 mb-4 sm:mb-6">
                                <div className="p-1.5 sm:p-2 bg-red-500 rounded-lg sm:rounded-xl text-white shrink-0 h-fit">
                                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-red-800 text-sm sm:text-base mb-0.5 sm:mb-1">Perhatian Penting!</h4>
                                    <p className="text-xs sm:text-sm text-red-700">
                                        {getInstructionsContent(selectedExam).warning || 'Timer akan mulai setelah menekan "Mulai Ujian". Pastikan koneksi internet stabil.'}
                                    </p>
                                </div>
                            </div>

                            {/* Instructions Content */}
                            <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200">
                                <h4 className="font-bold text-[#071F56] mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                                    <BookOpen className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#0993A9]" />
                                    Petunjuk Pengerjaan
                                </h4>
                                <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
                                    {getInstructionsContent(selectedExam).instructions}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer - Fixed at bottom */}
                        <div className="shrink-0 px-4 sm:px-8 py-4 sm:py-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-between sm:items-center sticky bottom-0">
                            <button
                                onClick={() => setShowInstructionsModal(false)}
                                className="px-4 sm:px-6 py-2.5 sm:py-3 text-slate-600 font-semibold hover:bg-slate-200 rounded-xl transition-colors order-2 sm:order-1 text-sm sm:text-base"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirmStartExam}
                                className="flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-[#071F56] to-[#0993A9] hover:from-[#0a2a70] hover:to-[#0ba8c2] text-white font-bold rounded-xl shadow-lg shadow-[#0993A9]/30 transition-all transform hover:scale-[1.02] active:scale-95 order-1 sm:order-2 text-sm sm:text-base"
                            >
                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="hidden sm:inline">Saya Mengerti, </span>Mulai Ujian
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header - Kimia Farma Branding */}
            <header className="sticky top-0 z-50 w-full border-b border-[#0993A9]/20 bg-white shadow-sm">
                <div className="px-3 sm:px-4 md:px-8 lg:px-40 flex h-14 sm:h-16 items-center justify-between max-w-[1440px] mx-auto">
                    <div className="flex items-center gap-2 sm:gap-3 text-slate-900 min-w-0">
                        <img src="/kimia-farma-logo.jpg" alt="Kimia Farma" className="h-10 sm:h-14 w-auto shrink-0" />
                        <h2 className="text-xs sm:text-base font-bold tracking-tight truncate text-[#071F56]">Kimia Farma Mental Health Test</h2>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-lg px-3 sm:px-4 py-2 text-sm font-medium text-slate-600 hover:bg-[#0993A9]/10 transition-colors shrink-0"
                    >
                        <LogOut size={18} className="sm:w-5 sm:h-5" />
                        <span className="hidden sm:block">Keluar</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 px-3 sm:px-4 md:px-8 lg:px-40 py-4 sm:py-8 w-full max-w-[1440px] mx-auto">
                <div className="flex flex-col gap-4 sm:gap-8 max-w-5xl mx-auto">
                    {/* Welcome Section */}
                    <div className="flex flex-col gap-1">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#071F56]">
                            Selamat Datang{user?.full_name ? `, ${user.full_name}` : ''}
                        </h1>
                        <p className="text-sm sm:text-base text-slate-500">
                            Silakan cek jadwal ujian Anda dan selesaikan sebelum batas waktu.
                        </p>
                    </div>

                    {/* Stats Cards - Teal Theme */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-6">
                        <div className="rounded-xl border border-[#0993A9]/20 bg-white p-4 sm:p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs sm:text-sm font-medium text-slate-500">Ujian Tersedia</p>
                                    <p className="mt-1 sm:mt-2 text-2xl sm:text-4xl font-bold text-[#0993A9] tracking-tight">{todoExams.length}</p>
                                </div>
                                <div className="flex size-10 sm:size-14 items-center justify-center rounded-full bg-[#0993A9]/10 text-[#0993A9]">
                                    <Calendar className="w-5 h-5 sm:w-7 sm:h-7" />
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs sm:text-sm font-medium text-slate-500">Selesai</p>
                                    <p className="mt-1 sm:mt-2 text-2xl sm:text-4xl font-bold text-emerald-600 tracking-tight">{completedExams.length}</p>
                                </div>
                                <div className="flex size-10 sm:size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                    <CheckCircle className="w-5 h-5 sm:w-7 sm:h-7" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex flex-col gap-4 sm:gap-6">
                        <div className="border-b border-slate-200">
                            <div className="flex gap-4 sm:gap-8">
                                <button
                                    onClick={() => setActiveTab('todo')}
                                    className={`relative flex items-center gap-1.5 sm:gap-2 pb-2 sm:pb-3 pt-2 text-xs sm:text-sm font-semibold transition-colors ${activeTab === 'todo' ? 'text-[#0993A9]' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Calendar className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                                    <span>Jadwal Ujian</span>
                                    {activeTab === 'todo' && (
                                        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-[#0993A9] rounded-full" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('completed')}
                                    className={`relative flex items-center gap-1.5 sm:gap-2 pb-2 sm:pb-3 pt-2 text-xs sm:text-sm font-semibold transition-colors ${activeTab === 'completed' ? 'text-[#0993A9]' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <History className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                                    <span>Riwayat & Hasil</span>
                                    {activeTab === 'completed' && (
                                        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-[#0993A9] rounded-full" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0993A9]"></div>
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
                                                    className="group relative flex flex-col sm:flex-row overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-[#0993A9]/30"
                                                >
                                                    {/* Image placeholder with gradient - Left side on desktop */}
                                                    <div
                                                        className="w-full sm:w-40 md:w-56 h-32 sm:h-auto bg-gradient-to-br from-[#071F56] to-[#0993A9] shrink-0 flex items-center justify-center"
                                                    >
                                                        <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-white/50" />
                                                    </div>

                                                    <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 md:p-6">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span className="inline-flex items-center rounded-full bg-[#0993A9]/10 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-[#0993A9] ring-1 ring-inset ring-[#0993A9]/20">
                                                                            Psikotes
                                                                        </span>
                                                                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium text-slate-600">
                                                                            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                                            {exam.duration_minutes} Menit
                                                                        </span>
                                                                    </div>
                                                                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-[#071F56] group-hover:text-[#0993A9] transition-colors line-clamp-2">
                                                                        {exam.title}
                                                                    </h3>
                                                                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-2">
                                                                        {exam.description || 'Tes psikologi untuk mengukur kemampuan dan kepribadian Anda.'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="mt-1 sm:mt-2 flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500">
                                                                <div className="flex items-center gap-1 sm:gap-1.5">
                                                                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                                                                    <span>
                                                                        Dibuat: {new Date(exam.created_at).toLocaleDateString('id-ID', {
                                                                            day: 'numeric',
                                                                            month: 'short',
                                                                            year: 'numeric',
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 sm:mt-6 flex items-center justify-end border-t border-slate-100 pt-3 sm:pt-4 md:border-0 md:pt-0">
                                                            <button
                                                                onClick={() => handleStartExam(exam)}
                                                                className="flex w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#071F56] to-[#0993A9] hover:from-[#0a2a70] hover:to-[#0ba8c2] text-white px-4 sm:px-6 py-2.5 sm:py-3 text-sm font-bold shadow-lg shadow-[#0993A9]/25 transition-all active:scale-95"
                                                            >
                                                                Mulai Ujian
                                                                <ArrowRight className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {activeTab === 'completed' && (
                                    <div className="flex flex-col gap-3 sm:gap-4">
                                        {completedExams.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center bg-white rounded-xl border border-slate-200">
                                                <div className="rounded-full bg-slate-100 p-4 sm:p-6">
                                                    <History className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                                                </div>
                                                <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-semibold text-slate-900">Belum ada riwayat ujian</h3>
                                                <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-sm px-4">
                                                    Anda belum menyelesaikan ujian apapun. Ujian yang telah diselesaikan akan muncul di sini.
                                                </p>
                                            </div>
                                        ) : (
                                            completedExams.map((exam) => (
                                                <div
                                                    key={exam.attempt_id}
                                                    className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                            <div className="flex size-10 sm:size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shrink-0">
                                                                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">{exam.title}</h3>
                                                                <p className="text-xs sm:text-sm text-slate-500">
                                                                    {new Date(exam.date).toLocaleDateString('id-ID', {
                                                                        day: 'numeric',
                                                                        month: 'short',
                                                                        year: 'numeric',
                                                                    })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0">
                                                            <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-bold">
                                                                <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                                <span className="hidden xs:inline">Selesai</span>
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

            {/* Footer - Kimia Farma */}
            <footer className="mt-auto border-t border-[#0993A9]/20 bg-white py-4 sm:py-6">
                <div className="px-3 sm:px-4 md:px-8 lg:px-40 max-w-[1440px] mx-auto flex flex-col items-center justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-slate-500">
                    <p className="text-center">© 2025 Kimia Farma Mental Health Test Platform. Powered by Asisya.</p>
                    <div className="flex gap-4 sm:gap-6">
                        <a className="hover:text-[#0993A9] transition-colors" href="#">Bantuan</a>
                        <a className="hover:text-[#0993A9] transition-colors" href="#">Privasi</a>
                        <a className="hover:text-[#0993A9] transition-colors" href="#">Syarat</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
