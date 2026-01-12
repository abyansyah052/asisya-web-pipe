'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, FileText, User, Clock, AlertTriangle, Activity, Brain } from 'lucide-react';

export default function ExamAnswersDetailPage({
    params
}: {
    params: Promise<{ id: string; attemptId: string }>
}) {
    const router = useRouter();
    const [attempt, setAttempt] = useState<any>(null);
    const [answers, setAnswers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [attemptId, setAttemptId] = useState<string>('');
    // PSS/SRQ specific data
    const [examType, setExamType] = useState<string>('');
    const [pssResult, setPssResult] = useState<any>(null);
    const [pssCategory, setPssCategory] = useState<string>('');
    const [srqResult, setSrqResult] = useState<any>(null);
    const [srqConclusion, setSrqConclusion] = useState<string>('');

    useEffect(() => {
        params.then(p => setAttemptId(p.attemptId));
    }, [params]);

    useEffect(() => {
        if (!attemptId) return;
        const fetchAnswers = async () => {
            try {
                const res = await fetch(`/api/admin/exams/answers/${attemptId}`);
                if (res.ok) {
                    const data = await res.json();
                    setAttempt(data.attempt);
                    setAnswers(data.answers);
                    setExamType(data.examType || '');
                    setPssResult(data.pssResult);
                    setPssCategory(data.pssCategory || '');
                    setSrqResult(data.srqResult);
                    setSrqConclusion(data.srqConclusion || '');
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchAnswers();
    }, [attemptId]);

    if (loading) return <div className="p-8">Loading...</div>;
    if (!attempt) return <div className="p-8">Data tidak ditemukan</div>;

    // PSS Result Summary Component
    const PSSResultSummary = () => {
        if (!pssResult || !pssCategory) return null;
        
        const categoryColor = pssCategory === 'Stres Ringan' ? 'green' :
                             pssCategory === 'Stres Sedang' ? 'yellow' : 'red';
        
        return (
            <div className={`bg-white p-4 sm:p-6 rounded-xl shadow-sm border-2 border-${categoryColor}-200 mb-4 sm:mb-6`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-full bg-${categoryColor}-100 flex items-center justify-center`}>
                        <Brain className={`w-6 h-6 text-${categoryColor}-600`} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Hasil PSS (Perceived Stress Scale)</h2>
                        <p className="text-sm text-gray-500">Skala Persepsi Stres</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{attempt.score}</div>
                        <div className="text-xs text-blue-600 font-medium">Total Skor</div>
                    </div>
                    <div className={`bg-${categoryColor}-50 p-3 rounded-lg text-center`}>
                        <div className={`text-lg font-bold text-${categoryColor}-700`}>{pssCategory}</div>
                        <div className={`text-xs text-${categoryColor}-600 font-medium`}>Kategori</div>
                    </div>
                </div>
                
                {/* Score Range Indicator */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>0 (Ringan)</span>
                        <span>13</span>
                        <span>26</span>
                        <span>40 (Berat)</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
                        <div className="w-[33%] bg-green-400"></div>
                        <div className="w-[33%] bg-yellow-400"></div>
                        <div className="w-[34%] bg-red-400"></div>
                    </div>
                    <div className="relative h-4 mt-1">
                        <div 
                            className="absolute -top-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow"
                            style={{ left: `${Math.min((attempt.score / 40) * 100, 100)}%`, transform: 'translateX(-50%)' }}
                        ></div>
                    </div>
                </div>
                
                <div className="text-sm text-gray-600">
                    <strong>Interpretasi:</strong>
                    <ul className="mt-2 space-y-1 text-xs">
                        <li className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-400"></span> 0-13: Stres Ringan</li>
                        <li className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-400"></span> 14-26: Stres Sedang</li>
                        <li className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-400"></span> 27-40: Stres Berat</li>
                    </ul>
                </div>
            </div>
        );
    };

    // SRQ-29 Result Summary Component
    const SRQResultSummary = () => {
        if (!srqResult || !srqConclusion) return null;
        
        const isNormal = srqConclusion === 'Normal';
        
        return (
            <div className={`bg-white p-4 sm:p-6 rounded-xl shadow-sm border-2 ${isNormal ? 'border-green-200' : 'border-orange-200'} mb-4 sm:mb-6`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-full ${isNormal ? 'bg-green-100' : 'bg-orange-100'} flex items-center justify-center`}>
                        <Activity className={`w-6 h-6 ${isNormal ? 'text-green-600' : 'text-orange-600'}`} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Hasil SRQ-29</h2>
                        <p className="text-sm text-gray-500">Self-Reporting Questionnaire</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{attempt.score}</div>
                        <div className="text-xs text-blue-600 font-medium">Total "Ya"</div>
                    </div>
                    <div className={`${isNormal ? 'bg-green-50' : 'bg-orange-50'} p-3 rounded-lg text-center`}>
                        <div className={`text-sm font-bold ${isNormal ? 'text-green-700' : 'text-orange-700'}`}>{srqConclusion.split(' - ')[0]}</div>
                        <div className={`text-xs ${isNormal ? 'text-green-600' : 'text-orange-600'} font-medium`}>Status</div>
                    </div>
                </div>
                
                {/* Category breakdown if available */}
                {srqResult && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-100">
                        {srqResult.neurosis !== undefined && (
                            <div className={`p-2 rounded-lg text-center ${srqResult.neurosis >= 6 ? 'bg-red-50' : 'bg-gray-50'}`}>
                                <div className={`text-lg font-bold ${srqResult.neurosis >= 6 ? 'text-red-600' : 'text-gray-700'}`}>{srqResult.neurosis}/20</div>
                                <div className="text-[10px] text-gray-500">Neurosis</div>
                                {srqResult.neurosis >= 6 && <span className="text-[8px] text-red-500 font-medium">≥6</span>}
                            </div>
                        )}
                        {srqResult.psychosis !== undefined && (
                            <div className={`p-2 rounded-lg text-center ${srqResult.psychosis >= 1 ? 'bg-red-50' : 'bg-gray-50'}`}>
                                <div className={`text-lg font-bold ${srqResult.psychosis >= 1 ? 'text-red-600' : 'text-gray-700'}`}>{srqResult.psychosis}/4</div>
                                <div className="text-[10px] text-gray-500">Psikosis</div>
                                {srqResult.psychosis >= 1 && <span className="text-[8px] text-red-500 font-medium">≥1</span>}
                            </div>
                        )}
                        {srqResult.ptsd !== undefined && (
                            <div className={`p-2 rounded-lg text-center ${srqResult.ptsd >= 1 ? 'bg-red-50' : 'bg-gray-50'}`}>
                                <div className={`text-lg font-bold ${srqResult.ptsd >= 1 ? 'text-red-600' : 'text-gray-700'}`}>{srqResult.ptsd}/2</div>
                                <div className="text-[10px] text-gray-500">PTSD</div>
                                {srqResult.ptsd >= 1 && <span className="text-[8px] text-red-500 font-medium">≥1</span>}
                            </div>
                        )}
                        {srqResult.substanceUse !== undefined && (
                            <div className={`p-2 rounded-lg text-center ${srqResult.substanceUse >= 1 ? 'bg-red-50' : 'bg-gray-50'}`}>
                                <div className={`text-lg font-bold ${srqResult.substanceUse >= 1 ? 'text-red-600' : 'text-gray-700'}`}>{srqResult.substanceUse}/3</div>
                                <div className="text-[10px] text-gray-500">Zat</div>
                                {srqResult.substanceUse >= 1 && <span className="text-[8px] text-red-500 font-medium">≥1</span>}
                            </div>
                        )}
                    </div>
                )}
                
                <div className="text-sm text-gray-600 mt-4 pt-4 border-t border-gray-100">
                    <strong>Interpretasi:</strong>
                    <ul className="mt-2 space-y-1 text-xs">
                        <li>• Neurosis (Q1-20): ≥6 = indikasi gangguan</li>
                        <li>• Psikosis (Q21-24): ≥1 = indikasi gangguan</li>
                        <li>• PTSD (Q25-26): ≥1 = indikasi gangguan</li>
                        <li>• Penggunaan Zat (Q27-29): ≥1 = indikasi gangguan</li>
                    </ul>
                </div>
            </div>
        );
    };

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

                {/* Header Card */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">{attempt.exam_title}</h1>
                            <p className="text-gray-500 mb-3 text-sm sm:text-base">Detail Jawaban Kandidat</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-gray-400 sm:w-4 sm:h-4" />
                                    <span className="font-medium text-gray-700">{attempt.full_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-gray-400 sm:w-4 sm:h-4" />
                                    <span className="text-gray-600">
                                        {attempt.end_time ? new Date(attempt.end_time).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }) : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-left lg:text-right">
                            <div className="text-xs sm:text-sm text-gray-500 mb-1">Nilai Akhir</div>
                            <div className="text-3xl sm:text-4xl font-bold text-blue-600">{attempt.score}</div>
                            {/* Show correct/incorrect only for non-PSS/SRQ exams */}
                            {examType !== 'pss' && examType !== 'srq29' && (
                                <div className="mt-2 flex gap-2">
                                    <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 sm:px-3 py-1 rounded-full text-xs font-bold">
                                        <CheckCircle size={12} /> {answers.filter(a => a.is_correct).length} Benar
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 sm:px-3 py-1 rounded-full text-xs font-bold">
                                        <XCircle size={12} /> {answers.filter(a => !a.is_correct).length} Salah
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* PSS Result Summary - Show BEFORE answers */}
                {examType === 'pss' && <PSSResultSummary />}
                
                {/* SRQ Result Summary - Show BEFORE answers */}
                {examType === 'srq29' && <SRQResultSummary />}

                {/* Answers List */}
                <div className="space-y-3 sm:space-y-4">
                    {answers.map((answer, index) => (
                        <div
                            key={answer.id}
                            className={`bg-white p-4 sm:p-6 rounded-xl shadow-sm border-2 ${answer.is_correct ? 'border-green-200' : 'border-red-200'
                                }`}
                        >
                            <div className="flex items-start gap-3 sm:gap-4">
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white text-base sm:text-lg font-bold flex-shrink-0 ${answer.is_correct ? 'bg-green-500' : 'bg-red-500'
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
                                        {answer.options && answer.options.map((option: any, optIdx: number) => {
                                            const optionLetter = String.fromCharCode(65 + optIdx); // A, B, C, D...
                                            const isSelected = answer.selected_option_id === option.id;
                                            const isCorrect = option.is_correct;

                                            // ✅ Only highlight selected answers
                                            // For MMPI: no "correct/incorrect" concept, just show what was selected
                                            let bgColor = 'bg-gray-50';
                                            let textColor = 'text-gray-700';
                                            let borderColor = 'border-gray-200';

                                            if (isSelected) {
                                                // Highlight selected answer based on whether it's correct
                                                if (isCorrect) {
                                                    bgColor = 'bg-green-100';
                                                    textColor = 'text-green-800';
                                                    borderColor = 'border-green-400';
                                                } else {
                                                    bgColor = 'bg-red-100';
                                                    textColor = 'text-red-800';
                                                    borderColor = 'border-red-400';
                                                }
                                            }
                                            // ✅ Removed: no longer highlight non-selected "correct" options

                                            return (
                                                <div
                                                    key={option.id}
                                                    className={`p-2.5 sm:p-3 rounded-lg border-2 ${bgColor} ${borderColor}`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <span className={`font-bold ${textColor} w-5 sm:w-6 shrink-0 text-sm sm:text-base`}>{optionLetter}.</span>
                                                        <span className={`${textColor} flex-1 text-sm sm:text-base`}>{option.text}</span>
                                                        {isSelected && (
                                                            <span className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded shrink-0 ${isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                                                                }`}>
                                                                Jawaban
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
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center text-gray-500">
                        Tidak ada jawaban yang ditemukan
                    </div>
                )}
            </div>
        </div>
    );
}
