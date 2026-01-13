'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';

interface SRQ29Answer {
  [key: number]: 'Y' | 'T'; // Y=Ya, T=Tidak
}

interface SRQ29Result {
  anxiety: boolean; // 5+ jawaban YA di Q1-20
  substance: boolean; // 1+ jawaban YA di Q21
  psychotic: boolean; // 1+ jawaban YA di Q22-24
  ptsd: boolean; // 1+ jawaban YA di Q25-29
  conclusion: string; // hasil kategorisasi
}

interface Props {
  examId: string;
  onSubmit: (answers: SRQ29Answer, result: SRQ29Result) => void;
  onBack: () => void;
}

const SRQ29_QUESTIONS = [
  "Apakah Anda sering merasa sakit kepala?",
  "Apakah Anda kehilangan nafsu makan?",
  "Apakah tidur anda tidak nyenyak?",
  "Apakah anda mudah merasa takut?",
  "Apakah anda merasa cemas, tegang, atau khawatir?",
  "Apakah tangan anda gemetar?",
  "Apakah anda mengalami gangguan pencernaan?",
  "Apakah anda merasa sulit berpikir jernih?",
  "Apakah anda merasa tidak Bahagia?",
  "Apakah anda lebih sering menangis?",
  "Apakah anda merasa sulit untuk menikmati aktivitas sehari-hari?",
  "Apakah anda mengalami kesulitan untuk mengambil keputusan?",
  "Apakah aktivitas/tugas sehari-hari anda terbengkalai?",
  "Apakah anda merasa tidak mampu berperan dalam kehidupan ini?",
  "Apakah anda kehilangan minat terhadap banyak hal?",
  "Apakah anda merasa tidak berharga?",
  "Apakah anda mempunyai pikiran untuk mengakhiri hidup anda?",
  "Apakah anda merasa Lelah sepanjang waktu?",
  "Apakah anda merasa tidak enak di perut?",
  "Apakah anda mudah Lelah?",
  "Apakah anda minum alcohol lebih banyak dari biasanya atau apakah anda menggunakan narkoba?",
  "Apakah anda yakin bahwa seseorang mencoba mencelakai anda dengan cara tertentu?",
  "Apakah ada yang mengganggu atau hal yang tidak biasa dalam pikiran anda?",
  "Apakah anda pernah mendengar suara tanpa tahu sumbernya atau yang orang lain tidak dapat mendengar?",
  "Apakah anda mengalami mimpi yang mengganggu tentang suatu bencana/musibah atau adakah saat-saat anda seolah mengalami Kembali bencana itu?",
  "Apakah anda menghindari kegiatan, tempat, orang atau pikiran yang mengingatkan anda akan bencana tersebut?",
  "Apakah minat anda terhadap teman dan kegiatan yang biasa anda lakukan berkurang?",
  "Apakah anda merasa sangat terganggu jika berada dalam situasi yang mengingatkan anda akan bencana atau jika anda berpikir tentang bencana itu?",
  "Apakah anda kesulitan memahami atau mengekspresikan perasaan anda?"
];

export default function SRQ29Exam({ examId, onSubmit, onBack }: Props) {
  const [showInstructions, setShowInstructions] = useState(true);
  const [answers, setAnswers] = useState<SRQ29Answer>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SRQ29Result | null>(null);

  const handleAnswer = (value: 'Y' | 'T') => {
    setAnswers({
      ...answers,
      [currentQuestion + 1]: value
    });
  };

  const calculateResult = (): SRQ29Result => {
    // Count YA answers in different ranges
    let count1_20 = 0;
    for (let i = 1; i <= 20; i++) {
      if (answers[i] === 'Y') count1_20++;
    }

    const substance = answers[21] === 'Y';
    
    let psychotic = false;
    for (let i = 22; i <= 24; i++) {
      if (answers[i] === 'Y') {
        psychotic = true;
        break;
      }
    }

    let ptsd = false;
    for (let i = 25; i <= 29; i++) {
      if (answers[i] === 'Y') {
        ptsd = true;
        break;
      }
    }

    const anxiety = count1_20 >= 5;

    // Determine conclusion
    let conclusion = '';
    if (!anxiety && !substance && !psychotic && !ptsd) {
      conclusion = 'Normal';
    } else if (ptsd && !anxiety && !substance && !psychotic) {
      conclusion = 'Tidak Normal - PTSD Only';
    } else if (anxiety && !substance && !psychotic && !ptsd) {
      conclusion = 'Tidak Normal - Cemas & Depresi';
    } else if (psychotic && !anxiety && !substance && !ptsd) {
      conclusion = 'Tidak Normal - Episode Psikotik Only';
    } else if (psychotic && ptsd && !anxiety && !substance) {
      conclusion = 'Tidak Normal - PTSD + Psikotik';
    } else if (anxiety && ptsd && !psychotic && !substance) {
      conclusion = 'Tidak Normal - Cemas, Depresi, PTSD';
    } else if (anxiety && psychotic && !ptsd && !substance) {
      conclusion = 'Tidak Normal - Cemas, Depresi, Psikotik';
    } else if (anxiety && psychotic && ptsd) {
      conclusion = 'Tidak Normal - All Symptoms';
    }

    return { anxiety, substance, psychotic, ptsd, conclusion };
  };

  const handleSubmit = () => {
    // Check if all questions answered
    if (Object.keys(answers).length !== SRQ29_QUESTIONS.length) {
      alert('Harap jawab semua pertanyaan terlebih dahulu!');
      return;
    }

    const calcResult = calculateResult();
    setResult(calcResult);
    setSubmitted(true);
    onSubmit(answers, calcResult);
  };

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 border-l-4 border-orange-600">
          <div className="flex items-start gap-4 mb-6">
            <AlertCircle className="w-8 h-8 text-orange-600 flex-shrink-0 mt-1" />
            <h1 className="text-3xl font-bold text-gray-900">Self Reporting Questionare (SRQ-29)</h1>
          </div>

          <div className="bg-orange-50 p-6 rounded-lg border border-orange-200 mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Bacalah petunjuk ini seluruhnya sebelum mulai mengisi.</h2>
            <div className="space-y-3 text-gray-800 text-sm">
              <p>Pertanyaan berikut berhubungan dengan masalah yang mungkin mengganggu anda selama 30 hari terakhir.</p>
              <p>Apabila Anda menganggap pertanyaan itu anda alami dalam 30 hari terakhir, berilah jawaban <strong>Ya</strong> (berarti Ya).</p>
              <p>Apabila Anda menganggap pertanyaan itu Tidak anda alami dalam 30 hari terakhir, berilah jawaban <strong>Tidak</strong> (berarti Tidak).</p>
              <p>Jika anda tidak yakin dengan jawabannya, berilah jawaban yang paling sesuai diantara Y dan T.</p>
              <p className="pt-3 border-t border-orange-200">Kami tegaskan bahwa jawaban Anda bersifat rahasia dan akan digunakan hanya untuk membantu pemecahan masalah anda.</p>
            </div>
          </div>

          <button
            onClick={() => setShowInstructions(false)}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 transition"
          >
            Mulai Menjawab
          </button>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    const resultTexts: Record<string, string> = {
      'Normal': 'Normal. Tidak terdapat gejala psikologis seperti cemas dan depresi. Tidak terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik, gejala PTSD/gejala stress setelah trauma',
      'Tidak Normal - PTSD Only': 'Tidak Normal. Terdapat gejala PTSD/gejala stress setelah trauma. Namun, tidak terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, dan gejala episode psikotik.',
      'Tidak Normal - Cemas & Depresi': 'Tidak Normal. Terdapat gejala psikologis seperti cemas dan depresi. Namun tidak terdapat penggunaan zat psikoaktif/narkoba, gejala episode psikotik dan gejala PTSD/gejala stress setelah trauma',
      'Tidak Normal - Episode Psikotik Only': 'Tidak Normal. Terdapat gejala episode psikotik. Namun tidak terdapat gejala psikologis seperti cemas dan depresi, penggunaan zat psikoaktif/narkoba, dan gejala PTSD/gejala stress setelah trauma',
      'Tidak Normal - PTSD + Psikotik': 'Tidak Normal. Terdapat gejala episode psikotik dan gejala PTSD/stress setelah trauma. Namun tidak terdapat gejala cemas/depresi dan penggunaan zat adiktif/narkoba',
      'Tidak Normal - Cemas, Depresi, PTSD': 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi dan PTSD. Namun tidak terdapat gejala episode psikotik dan penggunaan zat psikoaktif/narkoba',
      'Tidak Normal - Cemas, Depresi, Psikotik': 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi dan gejala episode psikotik. Namun tidak terdapat gejala PTSD dan penggunaan zat psikoaktif/narkoba',
      'Tidak Normal - All Symptoms': 'Tidak Normal. Terdapat gejala psikologis seperti cemas, depresi, gejala episode psikotik, dan PTSD/gejala stress setelah trauma. Namun, tidak terdapat penggunaan zat adiktif/narkoba'
    };

    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Selesai!</h2>
          
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <p className="text-gray-600 mb-2 text-center">Hasil Anda:</p>
            <p className="text-xl font-semibold text-center text-gray-900 mb-4">{result.conclusion}</p>
            <div className="border-t border-blue-200 pt-4 text-sm text-gray-700">
              <p className="mb-3">{resultTexts[result.conclusion]}</p>
            </div>
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
            <span>Pertanyaan {currentQuestion + 1} dari {SRQ29_QUESTIONS.length}</span>
            <span>{Math.round((currentQuestion + 1) / SRQ29_QUESTIONS.length * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-600 h-2 rounded-full transition-all"
              style={{ width: `${(currentQuestion + 1) / SRQ29_QUESTIONS.length * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow p-8 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Pertanyaan {currentQuestion + 1}: {SRQ29_QUESTIONS[currentQuestion]}
          </h3>

          {/* Answer Options */}
          <div className="space-y-3">
            {[
              { value: 'Y', label: 'Ya', desc: 'Saya alami dalam 30 hari terakhir' },
              { value: 'T', label: 'Tidak', desc: 'Saya tidak alami dalam 30 hari terakhir' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => handleAnswer(option.value as 'Y' | 'T')}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  answers[currentQuestion + 1] === option.value
                    ? 'border-orange-600 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.desc}</div>
                  </div>
                  <input
                    type="radio"
                    checked={answers[currentQuestion + 1] === option.value}
                    onChange={() => handleAnswer(option.value as 'Y' | 'T')}
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

          {currentQuestion === SRQ29_QUESTIONS.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={!isAnswered}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Selesai & Kirim
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion(Math.min(SRQ29_QUESTIONS.length - 1, currentQuestion + 1))}
              disabled={!isAnswered}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
