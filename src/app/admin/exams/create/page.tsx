'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

interface Option {
    text: string;
    isCorrect: boolean;
}

interface Question {
    text: string;
    marks: number;
    options: Option[];
}

export default function CreateExamPage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState(60);
    const [displayMode, setDisplayMode] = useState<'per_page' | 'scroll'>('per_page');
    const [questions, setQuestions] = useState<Question[]>([{
        text: '',
        marks: 1,
        options: [
            { text: '', isCorrect: true },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
        ]
    }]);
    const [saving, setSaving] = useState(false);
    const [alertModal, setAlertModal] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({show: false, message: '', type: 'error'});

    const addQuestion = () => {
        setQuestions([...questions, {
            text: '',
            marks: 1,
            options: [
                { text: '', isCorrect: true },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false }
            ]
        }]);
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], [field]: value };
        setQuestions(updated);
    };

    const updateOption = (qIndex: number, oIndex: number, field: keyof Option, value: any) => {
        const updated = [...questions];
        const options = [...updated[qIndex].options];
        
        if (field === 'isCorrect' && value) {
            // Only one correct answer
            options.forEach((opt, i) => opt.isCorrect = i === oIndex);
        } else {
            options[oIndex] = { ...options[oIndex], [field]: value };
        }
        
        updated[qIndex].options = options;
        setQuestions(updated);
    };

    const addOption = (qIndex: number) => {
        const updated = [...questions];
        updated[qIndex].options.push({ text: '', isCorrect: false });
        setQuestions(updated);
    };

    const removeOption = (qIndex: number, oIndex: number) => {
        const updated = [...questions];
        if (updated[qIndex].options.length > 2) {
            updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== oIndex);
            setQuestions(updated);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            alert('Judul ujian harus diisi!');
            return;
        }

        const emptyQuestions = questions.filter(q => !q.text.trim());
        if (emptyQuestions.length > 0) {
            alert('Semua pertanyaan harus diisi!');
            return;
        }

        const invalidQuestions = questions.filter(q => 
            !q.text.trim() ||
            q.options.length < 2 || 
            q.options.some(o => !o.text.trim()) ||
            !q.options.some(o => o.isCorrect)
        );

        if (invalidQuestions.length > 0) {
            setAlertModal({show: true, message: 'Setiap pertanyaan harus memiliki teks soal, minimal 2 opsi dengan teks yang terisi, dan 1 jawaban benar!', type: 'error'});
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/admin/exams/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    duration_minutes: duration,
                    display_mode: displayMode,
                    questions
                })
            });

            if (res.ok) {
                setAlertModal({show: true, message: 'Ujian berhasil dibuat!', type: 'success'});
                setTimeout(() => router.back(), 1500);
            } else {
                const err = await res.json();
                setAlertModal({show: true, message: 'Gagal membuat ujian: ' + err.error, type: 'error'});
            }
        } catch (e) {
            setAlertModal({show: true, message: 'Terjadi kesalahan saat menyimpan', type: 'error'});
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {/* Alert Modal */}
            {alertModal.show && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
                        <div className={`w-16 h-16 ${alertModal.type === 'success' ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                            {alertModal.type === 'success' ? (
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{alertModal.type === 'success' ? 'Berhasil' : 'Perhatian'}</h3>
                        <p className="text-gray-600 mb-6">{alertModal.message}</p>
                        <button
                            onClick={() => setAlertModal({show: false, message: '', type: 'error'})}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <button 
                        onClick={() => router.back()} 
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-medium">Kembali</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <img src="/asisya.png" alt="Asisya" className="w-8 h-8 rounded-lg" />
                        <h1 className="text-xl font-bold text-gray-800">Buat Ujian Baru</h1>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-md"
                    >
                        <Save size={18} />
                        {saving ? 'Menyimpan...' : 'Simpan Ujian'}
                    </button>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto p-6">
                {/* Exam Info */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Informasi Ujian</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Judul Ujian <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                placeholder="Contoh: Tes Potensi Akademik 2024"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                rows={3}
                                placeholder="Deskripsi singkat tentang ujian ini..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Durasi (menit) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value))}
                                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                min={1}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mode Tampilan Soal
                            </label>
                            <div className="flex gap-4">
                                <label className={`flex-1 flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${displayMode === 'per_page' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="displayMode"
                                        value="per_page"
                                        checked={displayMode === 'per_page'}
                                        onChange={() => setDisplayMode('per_page')}
                                        className="w-4 h-4 text-blue-600"
                                    />
                                    <div>
                                        <div className="font-medium text-gray-900">1 Soal per Halaman</div>
                                        <div className="text-sm text-gray-500">Tampilkan satu soal pada satu waktu dengan navigasi next/prev</div>
                                    </div>
                                </label>
                                <label className={`flex-1 flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${displayMode === 'scroll' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        name="displayMode"
                                        value="scroll"
                                        checked={displayMode === 'scroll'}
                                        onChange={() => setDisplayMode('scroll')}
                                        className="w-4 h-4 text-blue-600"
                                    />
                                    <div>
                                        <div className="font-medium text-gray-900">Scroll (seperti Google Form)</div>
                                        <div className="text-sm text-gray-500">Semua soal ditampilkan dalam satu halaman yang bisa di-scroll</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Questions */}
                <div className="space-y-6">
                    {questions.map((q, qIdx) => (
                        <div key={qIdx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-bold text-gray-800">Soal #{qIdx + 1}</h3>
                                {questions.length > 1 && (
                                    <button
                                        onClick={() => removeQuestion(qIdx)}
                                        className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm"
                                    >
                                        <Trash2 size={16} />
                                        Hapus
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Pertanyaan <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={q.text}
                                        onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                        rows={2}
                                        placeholder="Tulis pertanyaan di sini..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Bobot Nilai</label>
                                    <input
                                        type="number"
                                        value={q.marks}
                                        onChange={(e) => updateQuestion(qIdx, 'marks', parseInt(e.target.value))}
                                        className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                        min={1}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                        Opsi Jawaban <span className="text-red-500">*</span>
                                    </label>
                                    <div className="space-y-2">
                                        {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} className="flex items-center gap-3">
                                                <input
                                                    type="radio"
                                                    name={`correct-${qIdx}`}
                                                    checked={opt.isCorrect}
                                                    onChange={() => updateOption(qIdx, oIdx, 'isCorrect', true)}
                                                    className="w-5 h-5 text-green-600 focus:ring-green-500"
                                                    title="Tandai sebagai jawaban benar"
                                                />
                                                <input
                                                    type="text"
                                                    value={opt.text}
                                                    onChange={(e) => updateOption(qIdx, oIdx, 'text', e.target.value)}
                                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                                    placeholder={`Opsi ${String.fromCharCode(65 + oIdx)}`}
                                                />
                                                {q.options.length > 2 && (
                                                    <button
                                                        onClick={() => removeOption(qIdx, oIdx)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => addOption(qIdx)}
                                        className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        + Tambah Opsi
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add Question Button */}
                <button
                    onClick={addQuestion}
                    className="w-full mt-6 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center gap-2 font-medium"
                >
                    <Plus size={20} />
                    Tambah Pertanyaan Baru
                </button>
            </main>
        </div>
        </>
    );
}
