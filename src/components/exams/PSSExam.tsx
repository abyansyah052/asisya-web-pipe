'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';

interface PSSAnswer {
  [key: number]: number; // question number: score (0-4)
}

interface Props {
  examId: string;
  onSubmit: (answers: PSSAnswer, score: number, category: string) => void;
  onBack: () => void;
}

const PSS_QUESTIONS = [
  "Selama sebulan terakhir, seberapa sering anda marah karena sesuatu yang tidak terduga",
  "Selama sebulan terakhir, seberapa sering anda merasa tidakmampu mengontrol hal-hal yang penting dalam kehidupan anda",
  "Selama sebulan terakhir, seberapa sering anda merasa gelisah dan tertekan",
  "Selama sebulan terakhir, seberapa sering anda merasa yakin terhadap kemampuan diri untuk mengatasi masalah pribadi", // reverse
  "Selama sebulan terakhir, seberapa sering anda merasa segala sesuatu yang terjadi sesuai dengan harapan anda", // reverse
  "Selama sebulan terakhir, seberapa sering anda merasa tidak mampu menyelesaikan hal-hal yang harus dikerjakan",
  "Selama sebulan terakhir, seberapa sering anda mampu mengontrol rasa mudah tersinggung dalam kehidupan anda", // reverse
  "Selama sebulan terakhir, seberapa sering anda merasa lebih mampu mengatasi masalah jika dibandingkan dengan orang lain", // reverse
  "Selama sebulan terakhir, seberapa sering anda marah karena adanya masalah yang tidak dapat anda kendalikan",
  "Selama sebulan terakhir, seberapa sering anda merasakan kesulitan yang menumpuk sehingga anda tidak mampu untuk mengatasinya"
];

const REVERSE_QUESTIONS = [4, 5, 7, 8]; // 1-indexed

export default function PSSExam({ examId, onSubmit, onBack }: Props) {
  const [showInstructions, setShowInstructions] = useState(true);
  const [answers, setAnswers] = useState<PSSAnswer>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; category: string } | null>(null);

  const handleAnswer = (value: number) => {
    setAnswers({
      ...answers,
      [currentQuestion + 1]: value
    });
  };

  const calculateScore = () => {
    let total = 0;

    for (let i = 1; i <= PSS_QUESTIONS.length; i++) {
      let score = answers[i] || 0;
      // Reverse scoring for questions 4, 5, 7, 8
      if (REVERSE_QUESTIONS.includes(i)) {
        score = 4 - score;
      }
      total += score;
    }

    let category = '';
    if (total >= 1 && total <= 13) {
      category = 'Stres Ringan';
    } else if (total >= 14 && total <= 26) {
      category = 'Stres Sedang';
    } else {
      category = 'Stres Berat';
    }

    return { score: total, category };
  };

  const handleSubmit = () => {
    // Check if all questions answered
    const allAnswered = PSS_QUESTIONS.length === Object.keys(answers).length;
    if (!allAnswered) {
      alert('Harap jawab semua pertanyaan terlebih dahulu!');
      return;
    }

    const { score, category } = calculateScore();
    setResult({ score, category });
    setSubmitted(true);
    onSubmit(answers, score, category);
  };

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 border-l-4 border-blue-600">
          <div className="flex items-start gap-4 mb-6">
            <AlertCircle className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
            <h1 className="text-3xl font-bold text-gray-900">Perceived Stress Scale (PSS)</h1>
          </div>

          <div className="space-y-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h2 className="font-bold text-gray-900 mb-4 text-lg">Petunjuk Pengisian:</h2>
              <ol className="space-y-3 text-gray-800">
                <li>1. Bacalah pertanyaan dan pernyataan berikut dengan baik</li>
                <li>2. Anda sebagai responden diperbolehkan bertanya kepada peneliti, jika ada pertanyaan / pernyataan yang tidak dimengerti</li>
                <li>3. Lengkapilah identitas terlebih dahulu</li>
                <li>4. Berikan tanda centang (✓) pada salah satu pilihan jawaban yang paling sesuai dengan perasaan dan pikiran anda selama satu bulan terakhir</li>
                <li>5. Jumlahkan skor total dari semua pertanyaan / pernyataan</li>
                <li>6. Berikan kode sesuai hasil skor anda</li>
                <li>7. Untuk pertanyaan positif (4,5,7,8) bernilai kebalikannya (0=4, 1=3, 2=2, 3=1, 4=0)</li>
                <li>8. Selamat mengisi dan terima kasih atas kerjasamanya</li>
              </ol>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-4">Keterangan Skor:</h3>
              <div className="space-y-2 text-gray-800">
                <p><strong>0</strong> : Tidak pernah</p>
                <p><strong>1</strong> : Hampir tidak pernah (1-2 kali)</p>
                <p><strong>2</strong> : Kadang-kadang (3-4 kali)</p>
                <p><strong>3</strong> : Hampir sering (5-6 kali)</p>
                <p><strong>4</strong> : Sangat sering (lebih dari 6 kali)</p>
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="font-bold text-gray-900 mb-3">Kategori Hasil:</h3>
              <ul className="space-y-2 text-gray-800">
                <li><strong>Kode 1</strong> (Skor 1-13): Stres Ringan</li>
                <li><strong>Kode 2</strong> (Skor 14-26): Stres Sedang</li>
                <li><strong>Kode 3</strong> (Skor 27-40): Stres Berat</li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => setShowInstructions(false)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
          >
            Mulai Menjawab
          </button>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Selesai!</h2>
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <p className="text-gray-600 mb-2">Skor Total Anda:</p>
            <p className="text-4xl font-bold text-blue-600 mb-4">{result.score}</p>
            <p className="text-lg font-semibold text-gray-900">{result.category}</p>
          </div>
          <button
            onClick={onBack}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const isAnswered = answers[currentQuestion + 1] !== undefined;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Pertanyaan {currentQuestion + 1} dari {PSS_QUESTIONS.length}</span>
            <span>{Math.round((currentQuestion + 1) / PSS_QUESTIONS.length * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(currentQuestion + 1) / PSS_QUESTIONS.length * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow p-8 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {currentQuestion + 1}. {PSS_QUESTIONS[currentQuestion]}
          </h3>

          {/* Answer Options */}
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map(score => (
              <button
                key={score}
                onClick={() => handleAnswer(score)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  answers[currentQuestion + 1] === score
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Pilihan {score}</div>
                    <div className="text-sm text-gray-600">
                      {score === 0 && 'Tidak pernah'}
                      {score === 1 && 'Hampir tidak pernah (1-2 kali)'}
                      {score === 2 && 'Kadang-kadang (3-4 kali)'}
                      {score === 3 && 'Hampir sering (5-6 kali)'}
                      {score === 4 && 'Sangat sering (lebih dari 6 kali)'}
                    </div>
                  </div>
                  <input
                    type="radio"
                    checked={answers[currentQuestion + 1] === score}
                    onChange={() => handleAnswer(score)}
                    className="w-5 h-5"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={18} />
            Sebelumnya
          </button>

          {currentQuestion === PSS_QUESTIONS.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={!isAnswered}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Selesai & Kirim
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion(Math.min(PSS_QUESTIONS.length - 1, currentQuestion + 1))}
              disabled={!isAnswered}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Selanjutnya
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
