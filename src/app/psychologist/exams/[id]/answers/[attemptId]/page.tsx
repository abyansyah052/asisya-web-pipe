'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, User, Clock, FileText, AlertTriangle, Activity } from 'lucide-react';

// SRQ Result Text mapping sesuai update.md
const SRQ_RESULT_TEXTS: Record<string, string> = {
    'Normal': 'Normal. Tidak terdapat gejala psikologis seperti cemas dan depresi. Tidak terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik, gejala PTSD/gejala stress setelah trauma',
    'Tidak Normal - PTSD Only': 'Tidak Normal. Terdapat gejala PTSD/gejala stress setelah trauma. Namun, tidak terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, dan gejala episode psikotik.',
    'Tidak Normal - Cemas & Depresi': 'Tidak Normal. Terdapat gejala psikologis seperti cemas dan depresi. Namun tidak terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik dan gejala PTSD/gejala stress setelah trauma',
    'Tidak Normal - Episode Psikotik Only': 'Tidak Normal. Terdapat gejala episode psikotik. Namun tidak terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, dan gejala PTSD/gejala stress setelah trauma',
    'Tidak Normal - PTSD + Psikotik': 'Tidak Normal. Terdapat gejala episode psikotik dan gejala PTSD/stress setelah trauma. Namun tidak terdapat gejala cemas/depresi dan penggunaan zat adiktif/narkoba',
    'Tidak Normal - Cemas, Depresi, PTSD': 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi dan PTSD. Namun tidak terdapat gejala episode psikotik dan penggunaan zat psikoaktif/narkoba',
    'Tidak Normal - Cemas, Depresi, Psikotik': 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi dan gejala episode psikotik. Namun tidak terdapat gejala PTSD dan penggunaan zat psikoaktif/narkoba',
    'Tidak Normal - All Symptoms': 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi, gejala episode psikotik, dan PTSD/gejala stress setelah trauma. Namun, tidak terdapat penggunaan zat adiktif/narkoba'
};

export default function PsychologistExamAnswersDetailPage({ 
    params 
}: { 
    params: Promise<{ id: string; attemptId: string }> 
}) {
    const router = useRouter();
    const [attempt, setAttempt] = useState<any>(null);
    const [answers, setAnswers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [attemptId, setAttemptId] = useState<string>('');
    const [examId, setExamId] = useState<string>('');
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [answeredQuestions, setAnsweredQuestions] = useState(0);
    const [isAssignedToMe, setIsAssignedToMe] = useState(true);
    // PSS/SRQ specific state
    const [examType, setExamType] = useState<string>('general');
    const [pssResult, setPssResult] = useState<any>(null);
    const [pssCategory, setPssCategory] = useState<string | null>(null);
    const [srqResult, setSrqResult] = useState<any>(null);
    const [srqConclusion, setSrqConclusion] = useState<string | null>(null);

    useEffect(() => {
        params.then(p => {
            setAttemptId(p.attemptId);
            setExamId(p.id);
        });
    }, [params]);

    useEffect(() => {
        if (!attemptId) return;
        const fetchAnswers = async () => {
            try {
                const res = await fetch(`/api/admin/exams/answers/${attemptId}`);
                if (res.status === 401 || res.status === 403) {
                    router.push('/adminpsi');
                    return;
                }
                if (res.ok) {
                    const data = await res.json();
                    setAttempt(data.attempt);
                    setAnswers(data.answers);
                    setTotalQuestions(data.totalQuestions || 0);
                    setAnsweredQuestions(data.answeredQuestions || data.answers.length);
                    setIsAssignedToMe(data.isAssignedToMe !== false);
                    // PSS/SRQ specific
                    setExamType(data.examType || 'general');
                    setPssResult(data.pssResult);
                    setPssCategory(data.pssCategory);
                    setSrqResult(data.srqResult);
                    setSrqConclusion(data.srqConclusion);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchAnswers();
    }, [attemptId, router]);

    if (loading) return <div className="p-8">Loading...</div>;
    if (!attempt) return <div className="p-8">Data tidak ditemukan</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-3 sm:p-6 font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <img src="/asisya.png" alt="Asisya" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg" />
                    <button
                        onClick={() => router.push(`/psychologist/exams/${examId}`)}
                        className="flex items-center text-gray-500 hover:text-gray-800 text-sm sm:text-base"
                    >
                        <ArrowLeft size={16} className="mr-1 sm:mr-2 sm:w-5 sm:h-5" /> Kembali
                    </button>
                </div>

                {/* Header Card */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{attempt.exam_title}</h1>
                                {!isAssignedToMe && (
                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                        Bukan Bagian Anda
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-500 mb-3 text-sm sm:text-base">Detail Jawaban Kandidat</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-gray-400 sm:w-4 sm:h-4" />
                                    <span className="font-medium text-gray-700">{attempt.full_name}</span>
                                    {attempt.gender && (
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                            {attempt.gender}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-gray-400 sm:w-4 sm:h-4" />
                                    <span className="text-gray-600">
                                        {new Date(attempt.end_time).toLocaleDateString('id-ID', { 
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FileText size={14} className="text-gray-400 sm:w-4 sm:h-4" />
                                    <span className="text-gray-600">
                                        {answeredQuestions} dari {totalQuestions} soal dijawab
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-left lg:text-right">
                            {/* PSS Result Display */}
                            {examType === 'pss' && pssCategory ? (
                                <div>
                                    <div className="text-xs sm:text-sm text-gray-500 mb-1">Skor Total</div>
                                    <div className="text-3xl sm:text-4xl font-bold text-blue-600">{attempt.score}</div>
                                    <div className={`mt-2 inline-block text-sm px-3 py-1.5 rounded-full font-medium ${
                                        pssCategory === 'Stres Ringan' ? 'bg-green-100 text-green-700' :
                                        pssCategory === 'Stres Sedang' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {pssCategory}
                                    </div>
                                </div>
                            ) : examType === 'srq29' && srqConclusion ? (
                                <div>
                                    <div className="text-xs sm:text-sm text-gray-500 mb-1">Total Jawaban Ya</div>
                                    <div className="text-3xl sm:text-4xl font-bold text-blue-600">{attempt.score}</div>
                                    <div className={`mt-2 inline-block text-sm px-3 py-1.5 rounded-full font-medium ${
                                        srqConclusion === 'Normal' ? 'bg-green-100 text-green-700' :
                                        'bg-orange-100 text-orange-700'
                                    }`}>
                                        {srqConclusion}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-xs sm:text-sm text-gray-500 mb-1">Nilai Akhir</div>
                                    <div className="text-3xl sm:text-4xl font-bold text-blue-600">{attempt.score}</div>
                                    <div className="mt-2 flex gap-2">
                                        <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 sm:px-3 py-1 rounded-full text-xs font-bold">
                                            <CheckCircle size={12} /> {answers.filter(a => a.is_correct).length} Benar
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 sm:px-3 py-1 rounded-full text-xs font-bold">
                                            <XCircle size={12} /> {answers.filter(a => !a.is_correct).length} Salah
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* SRQ-29 Detailed Result Card */}
                {examType === 'srq29' && srqResult && (
                    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="text-orange-500" size={20} />
                            <h2 className="text-lg font-bold text-gray-800">Hasil Analisis SRQ-29</h2>
                        </div>
                        
                        {/* Interpretasi */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                            <div className={`p-3 rounded-lg border ${srqResult.result?.anxiety ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                <div className="text-xs text-gray-500 mb-1">Cemas & Depresi (No. 1-20)</div>
                                <div className={`font-bold ${srqResult.result?.anxiety ? 'text-red-700' : 'text-green-700'}`}>
                                    {srqResult.result?.anxiety ? 'Terdeteksi (≥5 Ya)' : 'Normal (<5 Ya)'}
                                </div>
                            </div>
                            <div className={`p-3 rounded-lg border ${srqResult.result?.substance ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                <div className="text-xs text-gray-500 mb-1">Zat Psikoaktif (No. 21)</div>
                                <div className={`font-bold ${srqResult.result?.substance ? 'text-red-700' : 'text-green-700'}`}>
                                    {srqResult.result?.substance ? 'Terdeteksi' : 'Normal'}
                                </div>
                            </div>
                            <div className={`p-3 rounded-lg border ${srqResult.result?.psychotic ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                <div className="text-xs text-gray-500 mb-1">Episode Psikotik (No. 22-24)</div>
                                <div className={`font-bold ${srqResult.result?.psychotic ? 'text-red-700' : 'text-green-700'}`}>
                                    {srqResult.result?.psychotic ? 'Terdeteksi' : 'Normal'}
                                </div>
                            </div>
                            <div className={`p-3 rounded-lg border ${srqResult.result?.ptsd ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                <div className="text-xs text-gray-500 mb-1">PTSD (No. 25-29)</div>
                                <div className={`font-bold ${srqResult.result?.ptsd ? 'text-red-700' : 'text-green-700'}`}>
                                    {srqResult.result?.ptsd ? 'Terdeteksi' : 'Normal'}
                                </div>
                            </div>
                        </div>
                        
                        {/* Kesimpulan lengkap */}
                        <div className={`p-4 rounded-lg ${srqConclusion === 'Normal' ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                            <div className="text-xs text-gray-500 mb-1">Kesimpulan</div>
                            <p className={`text-sm ${srqConclusion === 'Normal' ? 'text-green-800' : 'text-orange-800'}`}>
                                {SRQ_RESULT_TEXTS[srqConclusion || ''] || srqResult.result?.resultText || srqConclusion}
                            </p>
                        </div>
                    </div>
                )}

                {/* PSS Detailed Result Card */}
                {examType === 'pss' && pssResult && (
                    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="text-blue-500" size={20} />
                            <h2 className="text-lg font-bold text-gray-800">Hasil Analisis PSS</h2>
                        </div>
                        
                        <div className={`p-4 rounded-lg ${
                            pssCategory === 'Stres Ringan' ? 'bg-green-50 border border-green-200' :
                            pssCategory === 'Stres Sedang' ? 'bg-yellow-50 border border-yellow-200' :
                            'bg-red-50 border border-red-200'
                        }`}>
                            <div className="text-xs text-gray-500 mb-1">Kategori Stres</div>
                            <p className={`text-sm font-medium ${
                                pssCategory === 'Stres Ringan' ? 'text-green-800' :
                                pssCategory === 'Stres Sedang' ? 'text-yellow-800' :
                                'text-red-800'
                            }`}>
                                {pssCategory === 'Stres Ringan' && 'Skor 0-13: Tingkat stres yang dialami tergolong ringan. Individu mampu mengelola tekanan sehari-hari dengan baik.'}
                                {pssCategory === 'Stres Sedang' && 'Skor 14-26: Tingkat stres yang dialami tergolong sedang. Perlu perhatian dan mungkin memerlukan strategi pengelolaan stres yang lebih baik.'}
                                {pssCategory === 'Stres Berat' && 'Skor 27-40: Tingkat stres yang dialami tergolong berat. Disarankan untuk konsultasi lebih lanjut dengan profesional kesehatan mental.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Answers List */}
                <div className="space-y-3 sm:space-y-4">
                    {answers.map((answer) => (
                        <div 
                            key={answer.id} 
                            className={`bg-white p-4 sm:p-6 rounded-xl shadow-sm border-2 ${
                                answer.is_correct ? 'border-green-200' : 'border-red-200'
                            }`}
                        >
                            <div className="flex items-start gap-3 sm:gap-4">
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white text-base sm:text-lg font-bold flex-shrink-0 ${
                                    answer.is_correct ? 'bg-green-500' : 'bg-red-500'
                                }`}>
                                    {answer.question_number}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-3 gap-2">
                                        <h3 className="text-gray-800 font-medium flex-1 text-sm sm:text-base">{answer.question_text}</h3>
                                        {answer.is_correct ? (
                                            <CheckCircle size={20} className="text-green-500 flex-shrink-0 sm:w-6 sm:h-6" />
                                        ) : (
                                            <XCircle size={20} className="text-red-500 flex-shrink-0 sm:w-6 sm:h-6" />
                                        )}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {answer.options?.map((option: {id: number; text: string; is_correct: boolean}, idx: number) => {
                                            const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D
                                            const isSelected = option.id === answer.selected_option_id;
                                            const isCorrect = option.is_correct;
                                            
                                            let bgColor = 'bg-gray-50';
                                            let textColor = 'text-gray-700';
                                            let borderColor = 'border-gray-200';
                                            
                                            if (isSelected && isCorrect) {
                                                bgColor = 'bg-green-100';
                                                textColor = 'text-green-800';
                                                borderColor = 'border-green-400';
                                            } else if (isSelected && !isCorrect) {
                                                bgColor = 'bg-red-100';
                                                textColor = 'text-red-800';
                                                borderColor = 'border-red-400';
                                            } else if (!isSelected && isCorrect) {
                                                bgColor = 'bg-green-50';
                                                textColor = 'text-green-700';
                                                borderColor = 'border-green-300';
                                            }
                                            
                                            return (
                                                <div 
                                                    key={option.id}
                                                    className={`p-2.5 sm:p-3 rounded-lg border-2 ${bgColor} ${borderColor}`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <span className={`font-bold ${textColor} w-5 sm:w-6 shrink-0 text-sm sm:text-base`}>{optionLabel}.</span>
                                                        <span className={`${textColor} flex-1 text-sm sm:text-base`}>{option.text}</span>
                                                        {isSelected && (
                                                            <span className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded shrink-0 ${
                                                                isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                                                            }`}>
                                                                Jawaban
                                                            </span>
                                                        )}
                                                        {!isSelected && isCorrect && (
                                                            <span className="text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-green-200 text-green-800 shrink-0">
                                                                Benar
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {answers.length === 0 && (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak Ada Jawaban</h3>
                        <p className="text-gray-500">Kandidat belum menjawab soal apapun untuk ujian ini.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
