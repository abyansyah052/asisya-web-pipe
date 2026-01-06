'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ChevronLeft, ChevronRight, Flag, Save, CheckCircle } from 'lucide-react';

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

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState<any>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<{ [key: number]: number }>({}); // qId -> optId
    const [reviewList, setReviewList] = useState<number[]>([]); // list of qIds
    const [timeLeft, setTimeLeft] = useState(0);
    const [attemptId, setAttemptId] = useState<number | null>(null);
    const [examId, setExamId] = useState<string>('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [alertModal, setAlertModal] = useState<{show: boolean, message: string}>({show: false, message: ''});
    const [confirmModal, setConfirmModal] = useState(false);
    const [showInstructionsModal, setShowInstructionsModal] = useState(false);
    const [examStarted, setExamStarted] = useState(false);
    const [displayMode, setDisplayMode] = useState<DisplayMode>('per_page');
    const intervalRef = useRef<NodeJS.Timeout>(undefined);
    const questionRefs = useRef<{[key: number]: HTMLDivElement | null}>({});

    useEffect(() => {
        params.then(p => setExamId(p.id));
    }, [params]);

    // Auto-save answers to localStorage (backup)
    useEffect(() => {
        if (!examId || !attemptId) return;
        const timer = setTimeout(() => {
            localStorage.setItem(`exam_${examId}_${attemptId}`, JSON.stringify(answers));
        }, 1000);
        return () => clearTimeout(timer);
    }, [answers, examId, attemptId]);

    useEffect(() => {
        if (!examId) return;
        const fetchExam = async () => {
            try {
                const res = await fetch(`/api/candidate/exam/${examId}/questions`);
                if (res.ok) {
                    const data = await res.json();
                    setExam(data.exam);
                    setQuestions(data.questions);
                    setAttemptId(data.attemptId);
                    setTimeLeft(data.exam.duration * 60);
                    setDisplayMode(data.exam.display_mode || 'per_page');
                    
                    // Show instructions modal untuk MMPI 180 atau exam dengan instructions
                    if (data.exam.instructions && data.exam.instructions.trim()) {
                        setShowInstructionsModal(true);
                    } else {
                        setExamStarted(true);
                    }
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

    // Submit exam function - HARUS DIDEFINISIKAN SEBELUM DIGUNAKAN
    const submitExam = useCallback(async (auto = false) => {
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
                // Jangan tampilkan score, hanya success message
                setShowSuccessModal(true);
                setTimeout(() => {
                    router.push('/candidate/dashboard');
                }, 2000);
            } else {
                const error = await res.json();
                setAlertModal({show: true, message: error.error || 'Gagal mengumpulkan ujian'});
            }
        } catch (e) {
            setAlertModal({show: true, message: 'Terjadi kesalahan saat mengumpulkan ujian'});
        }
    }, [attemptId, answers, examId, router, setAlertModal]);

    // Handle confirmed submit
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
                setTimeout(() => {
                    router.push('/candidate/dashboard');
                }, 2000);
            } else {
                const error = await res.json();
                setAlertModal({show: true, message: error.error || 'Gagal mengumpulkan ujian'});
            }
        } catch (e) {
            setAlertModal({show: true, message: 'Terjadi kesalahan saat mengumpulkan ujian'});
        }
    }, [attemptId, answers, examId, router]);

    // Timer with ref untuk prevent memory leaks
    useEffect(() => {
        if (timeLeft <= 0 || !exam || !examStarted) return;
        
        intervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    submitExam(true); // Auto submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [timeLeft, exam, examStarted, submitExam]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    // Memoize progress calculation
    const progress = useMemo(() => {
        if (questions.length === 0) return 0;
        return (Object.keys(answers).length / questions.length) * 100;
    }, [answers, questions.length]);

    const handleSelectOption = useCallback((qId: number, optId: number) => {
        setAnswers(prev => ({ ...prev, [qId]: optId }));
    }, []);

    const toggleReview = useCallback((qId: number) => {
        setReviewList(prev =>
            prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
        );
    }, []);

    const goToNextQuestion = useCallback(() => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(currentIdx + 1);
        }
    }, [currentIdx, questions.length]);

    // Scroll to question for scroll mode
    const scrollToQuestion = useCallback((qId: number) => {
        const ref = questionRefs.current[qId];
        if (ref) {
            ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, []);

    if (loading) return <div className="h-screen flex items-center justify-center">Loading Exam...</div>;
    
    // Jangan tampilkan content jika belum start exam (sedang lihat instruksi)
    if (!examStarted) return <></>;

    const currentQ = questions[currentIdx];

    return (
        <>
            {/* Instructions Modal (2FA) - Muncul sebelum ujian dimulai */}
            {showInstructionsModal && !examStarted && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
                            <h2 className="text-3xl font-bold mb-2">{exam?.title}</h2>
                            <p className="text-blue-100">{exam?.description}</p>
                        </div>

                        {/* Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto px-8 py-6">
                            <div className="prose prose-sm max-w-none">
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-yellow-800">Perhatian Penting!</h3>
                                            <p className="mt-1 text-sm text-yellow-700">
                                                Silakan baca petunjuk berikut dengan teliti sebelum memulai ujian. Timer akan mulai berjalan setelah Anda menekan tombol "Mulai Ujian".
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <Clock className="text-blue-600" size={20} />
                                        <span><strong>Durasi:</strong> {exam?.duration_minutes} menit</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">
                                            {questions.length} Pernyataan
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-6 whitespace-pre-wrap text-gray-700 leading-relaxed">
                                    {exam?.instructions}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 bg-gray-50 border-t flex justify-between items-center">
                            <button
                                onClick={() => router.push('/candidate/dashboard')}
                                className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                Batalkan
                            </button>
                            <button
                                onClick={() => {
                                    setShowInstructionsModal(false);
                                    setExamStarted(true);
                                }}
                                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Saya Mengerti, Mulai Ujian
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Alert Modal */}
            {alertModal.show && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Perhatian</h3>
                        <p className="text-gray-600 mb-6">{alertModal.message}</p>
                        <button
                            onClick={() => setAlertModal({show: false, message: ''})}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl transform animate-[scale-in_0.2s_ease-out]">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={48} className="text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ujian Berhasil Dikumpulkan!</h2>
                        <p className="text-gray-600 mb-6">Hasil ujian Anda sedang diproses. Terima kasih telah mengikuti ujian.</p>
                        <div className="flex gap-2 items-center justify-center text-sm text-gray-500">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                    </div>
                </div>
            )}

            <div className="h-screen flex flex-col bg-gray-50">
                {/* Header */}
                <header className="bg-white border-b px-3 sm:px-6 py-2 sm:py-3 flex justify-between items-center h-14 sm:h-16 fixed w-full z-20">
                    <div className="flex-1 min-w-0">
                        <h1 className="font-bold text-sm sm:text-lg text-gray-800 truncate">{exam?.title}</h1>
                        <div className="text-[10px] sm:text-xs text-gray-500">
                            {Object.keys(answers).length}/{questions.length} ({Math.round(progress)}%)
                        </div>
                    </div>
                    <div className="bg-blue-50 text-blue-700 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-mono font-bold text-sm sm:text-xl flex items-center gap-1 sm:gap-2 shrink-0">
                        <Clock size={16} className="sm:hidden" />
                        <Clock size={20} className="hidden sm:block" /> 
                        {formatTime(timeLeft)}
                    </div>
                </header>

                {/* Main Layout */}
                <div className="flex flex-1 mt-14 sm:mt-16 overflow-hidden">
                    {/* Question Area */}
                    <main className="flex-1 p-4 sm:p-6 md:p-10 overflow-auto pb-32 lg:pb-6">
                        {displayMode === 'scroll' ? (
                            /* SCROLL MODE - Like Google Forms */
                            <div className="max-w-3xl mx-auto space-y-8">
                                {questions.map((q, idx) => {
                                    const isAnswered = answers[q.id] !== undefined;
                                    const isReviewed = reviewList.includes(q.id);
                                    return (
                                        <div
                                            key={q.id}
                                            ref={(el) => { questionRefs.current[q.id] = el; }}
                                            className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all ${
                                                isReviewed ? 'border-yellow-400' : isAnswered ? 'border-green-300' : 'border-gray-200'
                                            }`}
                                        >
                                            {/* Question Header */}
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                                        Soal {idx + 1}
                                                    </span>
                                                    {isAnswered && (
                                                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                                                            ✓ Terjawab
                                                        </span>
                                                    )}
                                                    {isReviewed && (
                                                        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs">
                                                            🚩 Ditandai
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => toggleReview(q.id)}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        isReviewed ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                    }`}
                                                    title={isReviewed ? 'Hapus tanda' : 'Tandai untuk review'}
                                                >
                                                    <Flag size={16} />
                                                </button>
                                            </div>

                                            {/* Question Text */}
                                            <div className="text-base sm:text-lg text-gray-800 font-medium mb-4 leading-relaxed">
                                                {q.text}
                                            </div>

                                            {/* Options */}
                                            <div className="space-y-2">
                                                {q.options.map((opt) => {
                                                    const isSelected = answers[q.id] === opt.id;
                                                    return (
                                                        <label
                                                            key={opt.id}
                                                            className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                                                isSelected
                                                                    ? 'border-blue-600 bg-blue-50'
                                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`q-${q.id}`}
                                                                className="w-4 h-4 text-blue-600 mr-3"
                                                                checked={isSelected}
                                                                onChange={() => handleSelectOption(q.id, opt.id)}
                                                            />
                                                            <span className="text-gray-700">{opt.text}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                {/* Submit Button at bottom for scroll mode */}
                                <div className="flex justify-center pt-6 pb-20 lg:pb-6">
                                    <button
                                        onClick={() => submitExam(false)}
                                        className="flex items-center gap-2 px-8 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg font-bold text-lg"
                                    >
                                        <Save size={20} /> Kumpulkan Ujian
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* PER PAGE MODE - Original single question view */
                            <div className="max-w-3xl mx-auto">
                                {/* Question Info */}
                                <div className="flex justify-between items-center mb-4 sm:mb-6">
                                    <span className="text-gray-500 font-medium text-xs sm:text-sm">Soal {currentIdx + 1}/{questions.length}</span>
                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs sm:text-sm">Nilai: {currentQ?.marks}</span>
                                </div>

                                {/* Question Text */}
                                <div className="text-base sm:text-lg md:text-xl text-gray-800 font-medium mb-6 sm:mb-8 leading-relaxed">
                                    {currentQ?.text}
                                </div>

                                {/* Options */}
                                <div className="space-y-3 sm:space-y-4">
                                    {currentQ?.options.map((opt) => {
                                        const isSelected = answers[currentQ.id] === opt.id;
                                        return (
                                            <label
                                                key={opt.id}
                                                className={`flex items-center p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all touch-manipulation ${isSelected
                                                        ? 'border-blue-600 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-white active:bg-gray-50'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`q-${currentQ.id}`}
                                                    className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 focus:ring-blue-500 mr-3 sm:mr-4 shrink-0"
                                                    checked={isSelected}
                                                    onChange={() => handleSelectOption(currentQ.id, opt.id)}
                                                />
                                                <span className="text-gray-700 text-sm sm:text-base md:text-lg">{opt.text}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </main>

                    {/* Sidebar - For per_page mode only on desktop */}
                    {displayMode === 'per_page' && (
                    <aside className="hidden lg:flex lg:w-80 bg-white border-l flex-col">
                        <div className="p-6 border-b">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">P</div>
                                <div>
                                    <div className="font-bold text-gray-800">Candidate</div>
                                    <div className="text-xs text-gray-500">ID: {attemptId}</div>
                                </div>
                            </div>
                        </div>

                        {/* Palette */}
                        <div className="flex-1 p-6 overflow-auto">
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-6">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div> Answered</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-400 rounded-full"></div> Marked</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 border border-gray-300 rounded-full"></div> Not Visited</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-blue-600 rounded-full"></div> Current</div>
                            </div>

                            <div className="grid grid-cols-5 gap-2">
                                {questions.map((q, i) => {
                                    const isAnswered = answers[q.id] !== undefined;
                                    const isReview = reviewList.includes(q.id);
                                    const isCurrent = i === currentIdx;

                                    let baseClass = "h-10 w-full rounded flex items-center justify-center font-medium border text-sm transition-colors ";

                                    if (isCurrent) baseClass += "border-2 border-blue-600 z-10 ";
                                    else if (isReview) baseClass += "bg-yellow-400 text-white border-yellow-500 ";
                                    else if (isAnswered) baseClass += "bg-green-500 text-white border-green-600 ";
                                    else baseClass += "border-gray-200 text-gray-600 hover:bg-gray-50 ";

                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => setCurrentIdx(i)}
                                            className={baseClass}
                                        >
                                            {i + 1}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-6 border-t bg-gray-50 space-y-3">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                                    disabled={currentIdx === 0}
                                    className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 disabled:opacity-50 hover:bg-white"
                                >
                                    <ChevronLeft className="mx-auto" size={20} />
                                </button>
                                <button
                                    onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))}
                                    disabled={currentIdx === questions.length - 1}
                                    className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 disabled:opacity-50 hover:bg-white"
                                >
                                    <ChevronRight className="mx-auto" size={20} />
                                </button>
                            </div>

                            <button
                                onClick={() => toggleReview(currentQ.id)}
                                className="w-full flex items-center justify-center gap-2 py-2 border border-yellow-400 text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100"
                            >
                                <Flag size={18} /> {reviewList.includes(currentQ.id) ? "Unmark Review" : "Mark for Review"}
                            </button>

                            {/* Tombol Submit hanya muncul di soal terakhir, selain itu Next */}
                            {currentIdx === questions.length - 1 ? (
                                <button
                                    onClick={() => submitExam(false)}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm font-bold mt-2"
                                >
                                    <Save size={18} /> Kumpulkan Ujian
                                </button>
                            ) : (
                                <button
                                    onClick={goToNextQuestion}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-bold mt-2"
                                >
                                    Selanjutnya <ChevronRight size={18} />
                                </button>
                            )}
                        </div>
                    </aside>
                    )}

                    {/* Mobile Bottom Navigation - Only visible on mobile for per_page mode */}
                    {displayMode === 'per_page' && (
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-30 safe-area-pb">
                        <div className="px-4 py-3 space-y-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                                    disabled={currentIdx === 0}
                                    className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 disabled:opacity-30 active:bg-gray-50 font-medium touch-manipulation flex items-center justify-center gap-1"
                                >
                                    <ChevronLeft size={18} /> Sebelumnya
                                </button>
                                <button
                                    onClick={() => toggleReview(currentQ.id)}
                                    className="py-3 px-4 border border-yellow-400 text-yellow-700 bg-yellow-50 rounded-lg active:bg-yellow-100 touch-manipulation"
                                    title={reviewList.includes(currentQ.id) ? "Hapus Penanda" : "Tandai"}
                                >
                                    <Flag size={18} />
                                </button>
                                {currentIdx === questions.length - 1 ? (
                                    <button
                                        onClick={() => submitExam(false)}
                                        className="flex-1 py-3 bg-green-600 text-white rounded-lg active:bg-green-700 font-bold touch-manipulation flex items-center justify-center gap-1"
                                    >
                                        <Save size={18} /> Kumpulkan
                                    </button>
                                ) : (
                                    <button
                                        onClick={goToNextQuestion}
                                        className="flex-1 py-3 bg-blue-600 text-white rounded-lg active:bg-blue-700 font-bold touch-manipulation flex items-center justify-center gap-1"
                                    >
                                        Selanjutnya <ChevronRight size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    )}
                </div>
            </div>

            {/* Confirm Modal */}
            {confirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-scale-in">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                                <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Konfirmasi Pengumpulan</h3>
                            <p className="text-gray-600 mb-6">Apakah Anda yakin ingin mengumpulkan ujian? Anda tidak dapat mengubah jawaban setelah dikumpulkan.</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmModal(false)}
                                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleConfirmSubmit}
                                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                                >
                                    Ya, Kumpulkan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

