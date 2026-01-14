'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ChevronLeft, ChevronRight, Flag, Save, CheckCircle, X, Grid3X3, HelpCircle } from 'lucide-react';

// Petunjuk untuk setiap tipe ujian
const EXAM_INSTRUCTIONS: Record<string, string> = {
    pss: `Petunjuk Pengisian:

1. Bacalah pertanyaan dan pernyataan berikut dengan baik
2. Anda diperbolehkan bertanya kepada peneliti jika ada pertanyaan/pernyataan yang tidak dimengerti
3. Berikan tanda centang pada salah satu pilihan jawaban yang paling sesuai dengan perasaan dan pikiran Anda selama SATU BULAN TERAKHIR

Keterangan Pilihan Jawaban:
• 0 : Tidak pernah
• 1 : Hampir tidak pernah (1-2 kali)
• 2 : Kadang-kadang (3-4 kali)
• 3 : Hampir sering (5-6 kali)
• 4 : Sangat sering (lebih dari 6 kali)`,
    srq29: `Bacalah petunjuk ini seluruhnya sebelum mulai mengisi.

Pertanyaan berikut berhubungan dengan masalah yang mungkin mengganggu Anda selama 30 hari terakhir.

• Apabila Anda menganggap pertanyaan itu Anda alami dalam 30 hari terakhir, berilah jawaban YA
• Apabila Anda menganggap pertanyaan itu TIDAK Anda alami dalam 30 hari terakhir, berilah jawaban TIDAK
• Jika Anda tidak yakin dengan jawabannya, berilah jawaban yang paling sesuai

Kami tegaskan bahwa jawaban Anda bersifat RAHASIA dan akan digunakan hanya untuk membantu pemecahan masalah Anda.`,
    mmpi: `Petunjuk Pengisian:

1. Di hadapan Anda akan disajikan pernyataan yang harus Anda jawab
2. Bacalah setiap pernyataan dengan cermat
3. Jawablah setiap pernyataan dengan memilih: YA atau TIDAK
4. Tidak ada jawaban yang benar atau salah
5. Jawablah sesuai dengan kondisi diri Anda yang sebenarnya`,
    general: `Petunjuk Pengisian:

1. Bacalah setiap soal dengan cermat
2. Pilih jawaban yang paling tepat
3. Pastikan semua soal terjawab sebelum mengumpulkan`
};

interface Option {
    id: number;
    text: string;
}

interface Question {
    id: number;
    text: string;
    marks: number;
    options: Option[];
}

type DisplayMode = 'per_page' | 'scroll';
type ExamType = 'general' | 'mmpi' | 'pss' | 'srq29';

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState<any>(null);
    const [examType, setExamType] = useState<ExamType>('general');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<{ [key: number]: number }>({});
    const [reviewList, setReviewList] = useState<number[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [attemptId, setAttemptId] = useState<number | null>(null);
    const [examId, setExamId] = useState<string>('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [alertModal, setAlertModal] = useState<{ show: boolean, message: string }>({ show: false, message: '' });
    const [confirmModal, setConfirmModal] = useState(false);
    const [examStarted, setExamStarted] = useState(false);
    const [displayMode, setDisplayMode] = useState<DisplayMode>('per_page');
    const [showNavigator, setShowNavigator] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [requireAllAnswers, setRequireAllAnswers] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout>(undefined);
    const questionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

    useEffect(() => {
        params.then(p => setExamId(p.id));
    }, [params]);

    // ✅ Save answers to server - IMMEDIATE save with throttle (not debounce)
    const lastSavedRef = useRef<string>('');
    const isSavingRef = useRef(false);

    // Save function
    const saveAnswersToServer = useCallback(async (currentAnswers: { [key: number]: number }) => {
        if (!examId || !attemptId || isSavingRef.current) return;

        const answersStr = JSON.stringify(currentAnswers);
        if (answersStr === lastSavedRef.current || answersStr === '{}') return;

        isSavingRef.current = true;
        try {
            const res = await fetch(`/api/candidate/exam/${examId}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attemptId, answers: currentAnswers })
            });
            if (res.ok) {
                lastSavedRef.current = answersStr;
                console.log('Answers saved to server');
            }
        } catch (e) {
            console.error('Failed to save answers:', e);
        } finally {
            isSavingRef.current = false;
        }
        // Also save to localStorage as backup
        localStorage.setItem(`exam_${examId}_${attemptId}`, answersStr);
    }, [examId, attemptId]);

    // ✅ Save immediately when answers change (with 1 second throttle)
    useEffect(() => {
        if (!examId || !attemptId) return;

        const answersStr = JSON.stringify(answers);
        if (answersStr === lastSavedRef.current || answersStr === '{}') return;

        // Save after 1 second to batch rapid changes
        const timer = setTimeout(() => {
            saveAnswersToServer(answers);
        }, 1000);

        return () => clearTimeout(timer);
    }, [answers, examId, attemptId, saveAnswersToServer]);

    // ✅ Save before page unload (refresh, close, navigate away)
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (examId && attemptId && Object.keys(answers).length > 0) {
                // Use sendBeacon for reliable save before unload
                const data = JSON.stringify({ attemptId, answers });
                navigator.sendBeacon(`/api/candidate/exam/${examId}/save`, data);
                // Also save to localStorage
                localStorage.setItem(`exam_${examId}_${attemptId}`, JSON.stringify(answers));
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [examId, attemptId, answers]);

    useEffect(() => {
        if (!examId) return;
        const fetchExam = async () => {
            try {
                const res = await fetch(`/api/candidate/exam/${examId}/questions`);
                if (res.ok) {
                    const data = await res.json();

                    // ✅ Use server-calculated remaining time (persists across refresh)
                    const remaining = data.remainingSeconds ?? data.exam.duration * 60;

                    // ✅ If time expired, redirect immediately (backend will auto-submit)
                    if (remaining <= 0) {
                        alert("Waktu ujian sudah habis");
                        router.push('/candidate/dashboard');
                        return;
                    }

                    setExam(data.exam);
                    setExamType(data.exam.exam_type || 'general');
                    setQuestions(data.questions);
                    setAttemptId(data.attemptId);
                    setTimeLeft(remaining);
                    setDisplayMode(data.exam.display_mode || 'per_page');
                    setRequireAllAnswers(data.exam.require_all_answers || false);

                    // ✅ Load saved answers from server (persist across reconnect)
                    if (data.savedAnswers && Object.keys(data.savedAnswers).length > 0) {
                        setAnswers(data.savedAnswers);
                    }

                    setExamStarted(true);
                } else {
                    alert("Failed to load exam or already completed.");
                    router.push('/candidate/dashboard');
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchExam();
    }, [examId, router]);

    const submitExam = useCallback(async (auto = false) => {
        // Check if require_all_answers is enabled and not all questions answered (only for manual submit)
        if (!auto && requireAllAnswers) {
            const answeredCount = Object.keys(answers).length;
            const totalQuestions = questions.length;
            if (answeredCount < totalQuestions) {
                const unanswered = totalQuestions - answeredCount;
                setAlertModal({ 
                    show: true, 
                    message: `Anda harus menjawab semua soal sebelum mengumpulkan. Masih ada ${unanswered} soal yang belum dijawab.` 
                });
                return;
            }
        }
        
        if (!auto) {
            setConfirmModal(true);
            return;
        }
        try {
            const res = await fetch(`/api/candidate/exam/${examId}/submit`, {
                method: 'POST',
                body: JSON.stringify({ attemptId, answers }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                setShowSuccessModal(true);
                setTimeout(() => router.push('/candidate/dashboard'), 2000);
            } else {
                const error = await res.json();
                setAlertModal({ show: true, message: error.error || 'Gagal mengumpulkan ujian' });
            }
        } catch (e) {
            setAlertModal({ show: true, message: 'Terjadi kesalahan saat mengumpulkan ujian' });
        }
    }, [attemptId, answers, examId, router, requireAllAnswers, questions.length]);

    const handleConfirmSubmit = useCallback(async () => {
        setConfirmModal(false);
        try {
            const res = await fetch(`/api/candidate/exam/${examId}/submit`, {
                method: 'POST',
                body: JSON.stringify({ attemptId, answers }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                setShowSuccessModal(true);
                setTimeout(() => router.push('/candidate/dashboard'), 2000);
            } else {
                const error = await res.json();
                setAlertModal({ show: true, message: error.error || 'Gagal mengumpulkan ujian' });
            }
        } catch (e) {
            setAlertModal({ show: true, message: 'Terjadi kesalahan saat mengumpulkan ujian' });
        }
    }, [attemptId, answers, examId, router]);

    useEffect(() => {
        if (timeLeft <= 0 || !exam || !examStarted) return;
        intervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    submitExam(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [timeLeft, exam, examStarted, submitExam]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    const progress = useMemo(() => {
        if (questions.length === 0) return 0;
        return (Object.keys(answers).length / questions.length) * 100;
    }, [answers, questions.length]);

    const handleSelectOption = useCallback((qId: number, optId: number) => {
        setAnswers(prev => ({ ...prev, [qId]: optId }));
    }, []);

    const toggleReview = useCallback((qId: number) => {
        setReviewList(prev => prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]);
    }, []);

    const goToNextQuestion = useCallback(() => {
        if (currentIdx < questions.length - 1) setCurrentIdx(currentIdx + 1);
    }, [currentIdx, questions.length]);

    const scrollToQuestion = useCallback((qId: number, idx: number) => {
        setCurrentIdx(idx);
        // Only scroll in scroll mode
        if (displayMode === 'scroll') {
            // Use setTimeout to ensure state update completes first
            setTimeout(() => {
                const ref = questionRefs.current[qId];
                if (ref) {
                    ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 50);
        }
        setShowNavigator(false);
    }, [displayMode]);

    if (loading) return <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#E6FBFB] to-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0993A9]"></div></div>;
    if (!examStarted) return <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#E6FBFB] to-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0993A9]"></div></div>;

    // PSS dan SRQ-29 sekarang menggunakan UI standard yang sama dengan MMPI
    // Ini membuat timer dan auto-save berfungsi dengan benar

    const currentQ = questions[currentIdx];

    // Question Navigator Component - 6 columns for better visibility
    const QuestionNavigator = ({ isFloating = false }: { isFloating?: boolean }) => (
        <div className={`${isFloating ? '' : 'p-4 sm:p-6'}`}>
            {!isFloating && (
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-4">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div> Terjawab</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-400 rounded-full"></div> Ditandai</div>
                </div>
            )}
            <div className={`grid ${isFloating ? 'grid-cols-8 sm:grid-cols-10' : 'grid-cols-6'} gap-1.5 sm:gap-2`}>
                {questions.map((q, i) => {
                    const isAnswered = answers[q.id] !== undefined;
                    const isReview = reviewList.includes(q.id);
                    const isCurrent = i === currentIdx;
                    let baseClass = "h-8 w-full sm:h-9 rounded-lg flex items-center justify-center font-medium text-xs sm:text-sm transition-all ";
                    if (isCurrent) baseClass += "ring-2 ring-[#0993A9] ring-offset-1 bg-[#0993A9] text-white ";
                    else if (isReview) baseClass += "bg-yellow-400 text-white ";
                    else if (isAnswered) baseClass += "bg-green-500 text-white ";
                    else baseClass += "bg-gray-100 text-gray-600 hover:bg-gray-200 ";
                    return (
                        <button key={q.id} onClick={() => scrollToQuestion(q.id, i)} className={baseClass}>
                            {i + 1}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <>
            {/* Alert Modal */}
            {alertModal.show && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Perhatian</h3>
                        <p className="text-gray-600 mb-6 text-sm sm:text-base">{alertModal.message}</p>
                        <button onClick={() => setAlertModal({ show: false, message: '' })} className="w-full py-3 bg-[#0993A9] text-white rounded-xl font-semibold hover:bg-[#0ba8c2]">OK</button>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={40} className="text-green-600 sm:w-12 sm:h-12" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Ujian Berhasil Dikumpulkan!</h2>
                        <p className="text-gray-600 mb-6 text-sm sm:text-base">Hasil ujian Anda sedang diproses.</p>
                        <div className="flex gap-2 items-center justify-center">
                            <div className="w-2 h-2 bg-[#0993A9] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                            <div className="w-2 h-2 bg-[#0993A9] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-[#0993A9] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            {confirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-yellow-100 mb-4">
                                <svg className="h-7 w-7 sm:h-8 sm:w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Konfirmasi Pengumpulan</h3>
                            <p className="text-gray-600 mb-4 text-sm sm:text-base">
                                Terjawab: <span className="font-bold text-green-600">{Object.keys(answers).length}</span> / {questions.length}
                            </p>
                            <p className="text-gray-500 mb-6 text-sm">Anda tidak dapat mengubah jawaban setelah dikumpulkan.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmModal(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Batal</button>
                                <button onClick={handleConfirmSubmit} className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700">Ya, Kumpulkan</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Question Navigator Modal */}
            {showNavigator && (
                <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setShowNavigator(false)}>
                    <div className="bg-white w-full sm:w-auto sm:min-w-[400px] sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[70vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
                            <h3 className="font-bold text-gray-800">Navigasi Soal</h3>
                            <button 
                                onClick={() => setShowNavigator(false)} 
                                className="p-2.5 hover:bg-gray-200 rounded-lg transition-colors"
                                aria-label="Tutup"
                            >
                                <X size={22} className="text-gray-900" />
                            </button>
                        </div>
                        <div className="p-4 overflow-auto max-h-[50vh]">
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-4">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div> Terjawab</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-400 rounded-full"></div> Ditandai</div>
                            </div>
                            <QuestionNavigator isFloating />
                        </div>
                        <div className="p-4 border-t bg-slate-50">
                            <button onClick={() => submitExam(false)} className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700">
                                <Save size={18} /> Kumpulkan Ujian ({Object.keys(answers).length}/{questions.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Instructions Modal */}
            {showInstructions && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowInstructions(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-[#071F56] to-[#0993A9] text-white">
                            <h3 className="font-bold flex items-center gap-2">
                                <HelpCircle size={20} />
                                Petunjuk Pengerjaan
                            </h3>
                            <button 
                                onClick={() => setShowInstructions(false)} 
                                className="p-2.5 hover:bg-white/20 rounded-lg transition-colors"
                                aria-label="Tutup"
                            >
                                <X size={22} />
                            </button>
                        </div>
                        <div className="p-4 overflow-auto max-h-[55vh]">
                            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                                {EXAM_INSTRUCTIONS[examType] || EXAM_INSTRUCTIONS.general}
                            </pre>
                        </div>
                        <div className="p-4 border-t bg-slate-50">
                            <button onClick={() => setShowInstructions(false)} className="w-full py-3 bg-[#0993A9] text-white rounded-xl font-semibold hover:bg-[#0ba8c2] text-base">
                                Mengerti
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#E6FBFB] to-slate-50">
                {/* Header - Fixed */}
                <header className="bg-white border-b px-3 sm:px-6 py-2 sm:py-3 flex justify-between items-center h-14 sm:h-16 fixed w-full z-30 shadow-sm">
                    <div className="flex-1 min-w-0">
                        <h1 className="font-bold text-sm sm:text-lg text-gray-800 truncate">{exam?.title}</h1>
                        <div className="text-[10px] sm:text-xs text-gray-500">
                            {Object.keys(answers).length}/{questions.length} terjawab
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowInstructions(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 hover:text-[#0993A9] transition-colors text-sm font-medium"
                            title="Lihat Petunjuk"
                        >
                            <HelpCircle size={16} />
                            <span>Petunjuk</span>
                        </button>
                        <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-mono font-bold text-sm sm:text-xl flex items-center gap-1.5 sm:gap-2 ${timeLeft < 300 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-[#0993A9]/10 text-[#0993A9]'}`}>
                            <Clock size={16} className="sm:hidden" />
                            <Clock size={20} className="hidden sm:block" />
                            {formatTime(timeLeft)}
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex flex-1 mt-14 sm:mt-16">
                    {/* Questions Area - add right padding for fixed sidebar on desktop */}
                    <main className="flex-1 overflow-auto pb-24 lg:pb-6 lg:mr-80">
                        {displayMode === 'scroll' ? (
                            /* SCROLL MODE */
                            <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                                {questions.map((q, idx) => {
                                    const isAnswered = answers[q.id] !== undefined;
                                    const isReviewed = reviewList.includes(q.id);
                                    return (
                                        <div
                                            key={q.id}
                                            ref={(el) => { questionRefs.current[q.id] = el; }}
                                            className={`bg-white rounded-2xl shadow-sm border-2 transition-all ${isReviewed ? 'border-yellow-400 bg-yellow-50/30' : isAnswered ? 'border-green-400 bg-green-50/30' : 'border-slate-200'
                                                }`}
                                        >
                                            {/* Question Header */}
                                            <div className="flex justify-between items-center px-4 sm:px-6 py-3 border-b border-slate-100">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="bg-gradient-to-r from-[#071F56] to-[#0993A9] text-white px-3 py-1 rounded-full text-sm font-bold">
                                                        {idx + 1}
                                                    </span>
                                                    {isAnswered && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">✓ Terjawab</span>}
                                                    {isReviewed && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">🚩 Ditandai</span>}
                                                </div>
                                                <button
                                                    onClick={() => toggleReview(q.id)}
                                                    className={`p-2 rounded-xl transition-all ${isReviewed ? 'bg-yellow-100 text-yellow-600' : 'hover:bg-slate-100 text-slate-400'}`}
                                                >
                                                    <Flag size={18} />
                                                </button>
                                            </div>

                                            {/* Question Content */}
                                            <div className="px-4 sm:px-6 py-4 sm:py-5">
                                                <p className="text-base sm:text-lg text-gray-800 font-medium leading-relaxed mb-4">{q.text}</p>
                                                <div className="space-y-2">
                                                    {q.options.map((opt) => {
                                                        const isSelected = answers[q.id] === opt.id;
                                                        return (
                                                            <label
                                                                key={opt.id}
                                                                onClick={() => handleSelectOption(q.id, opt.id)}
                                                                className={`flex items-center p-3 sm:p-4 rounded-xl cursor-pointer transition-all border-2 ${isSelected
                                                                        ? 'border-[#0993A9] bg-[#0993A9]/10 shadow-sm'
                                                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                                    }`}
                                                            >
                                                                <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center shrink-0 ${isSelected ? 'border-[#0993A9] bg-[#0993A9]' : 'border-slate-300'
                                                                    }`}>
                                                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                                </div>
                                                                <span className={`text-sm sm:text-base ${isSelected ? 'text-[#071F56] font-medium' : 'text-gray-700'}`}>{opt.text}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* PER PAGE MODE */
                            <div className="max-w-3xl mx-auto p-4 sm:p-6 md:p-10">
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                    {/* Question Header */}
                                    <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[#071F56] to-[#0993A9] text-white">
                                        <span className="font-bold text-sm sm:text-base">Soal {currentIdx + 1} dari {questions.length}</span>
                                        <button
                                            onClick={() => toggleReview(currentQ.id)}
                                            className={`p-2 rounded-lg transition-all ${reviewList.includes(currentQ.id) ? 'bg-yellow-400 text-yellow-900' : 'bg-white/20 hover:bg-white/30'}`}
                                        >
                                            <Flag size={18} />
                                        </button>
                                    </div>

                                    {/* Question Content */}
                                    <div className="p-4 sm:p-6 md:p-8">
                                        <p className="text-base sm:text-lg md:text-xl text-gray-800 font-medium leading-relaxed mb-6">{currentQ?.text}</p>
                                        <div className="space-y-3">
                                            {currentQ?.options.map((opt) => {
                                                const isSelected = answers[currentQ.id] === opt.id;
                                                return (
                                                    <label
                                                        key={opt.id}
                                                        onClick={() => handleSelectOption(currentQ.id, opt.id)}
                                                        className={`flex items-center p-4 sm:p-5 rounded-xl cursor-pointer transition-all border-2 ${isSelected
                                                                ? 'border-[#0993A9] bg-[#0993A9]/10 shadow-md'
                                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 mr-4 flex items-center justify-center shrink-0 ${isSelected ? 'border-[#0993A9] bg-[#0993A9]' : 'border-slate-300'
                                                            }`}>
                                                            {isSelected && <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-full"></div>}
                                                        </div>
                                                        <span className={`text-sm sm:text-base md:text-lg ${isSelected ? 'text-[#071F56] font-medium' : 'text-gray-700'}`}>{opt.text}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </main>

                    {/* Desktop Sidebar - For per_page mode - STICKY */}
                    {displayMode === 'per_page' && (
                        <aside className="hidden lg:flex lg:w-80 bg-white border-l flex-col fixed right-0 top-16 bottom-0 z-20">
                            <div className="p-6 border-b">
                                <h3 className="font-bold text-gray-800 mb-1">Progress Anda</h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-600">{Math.round(progress)}%</span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <QuestionNavigator />
                            </div>
                            <div className="p-4 border-t bg-slate-50 space-y-3">
                                <div className="flex gap-2">
                                    <button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}
                                        className="flex-1 py-2.5 border border-slate-200 rounded-xl text-gray-600 disabled:opacity-30 hover:bg-white font-medium"><ChevronLeft className="mx-auto" size={20} /></button>
                                    <button onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))} disabled={currentIdx === questions.length - 1}
                                        className="flex-1 py-2.5 border border-slate-200 rounded-xl text-gray-600 disabled:opacity-30 hover:bg-white font-medium"><ChevronRight className="mx-auto" size={20} /></button>
                                </div>
                                <button onClick={() => submitExam(false)} className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold">
                                    <Save size={18} /> Kumpulkan Ujian
                                </button>
                            </div>
                        </aside>
                    )}

                    {/* Desktop Sidebar - For scroll mode - STICKY */}
                    {displayMode === 'scroll' && (
                        <aside className="hidden lg:flex lg:w-80 bg-white border-l flex-col fixed right-0 top-16 bottom-0 z-20">
                            <div className="p-6 border-b">
                                <h3 className="font-bold text-gray-800 mb-1">Progress Anda</h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-600">{Math.round(progress)}%</span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <QuestionNavigator />
                            </div>
                            <div className="p-4 border-t bg-slate-50">
                                <button onClick={() => submitExam(false)} className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold">
                                    <Save size={18} /> Kumpulkan Ujian
                                </button>
                            </div>
                        </aside>
                    )}
                </div>

                {/* Mobile/Tablet Floating Bottom Bar */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl z-30 safe-area-pb">
                    <div className="px-3 sm:px-4 py-2 sm:py-3">
                        {/* Progress Bar */}
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="text-xs font-medium text-gray-500">{Object.keys(answers).length}/{questions.length}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            {displayMode === 'per_page' && (
                                <>
                                    <button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}
                                        className="p-3 border border-slate-200 rounded-xl text-gray-600 disabled:opacity-30 active:bg-slate-100">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button onClick={goToNextQuestion} disabled={currentIdx === questions.length - 1}
                                        className="p-3 border border-slate-200 rounded-xl text-gray-600 disabled:opacity-30 active:bg-slate-100">
                                        <ChevronRight size={20} />
                                    </button>
                                </>
                            )}
                            <button onClick={() => setShowNavigator(true)} className="p-3 border border-slate-200 rounded-xl text-gray-600 active:bg-slate-100">
                                <Grid3X3 size={20} />
                            </button>
                            {displayMode === 'per_page' && (
                                <button onClick={() => toggleReview(currentQ.id)}
                                    className={`p-3 rounded-xl ${reviewList.includes(currentQ.id) ? 'bg-yellow-100 text-yellow-600 border border-yellow-300' : 'border border-slate-200 text-gray-600'}`}>
                                    <Flag size={20} />
                                </button>
                            )}
                            <button onClick={() => submitExam(false)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-bold active:bg-green-700">
                                <Save size={18} /> Kumpulkan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

