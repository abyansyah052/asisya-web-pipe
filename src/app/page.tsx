'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Users, CheckCircle, X, User } from 'lucide-react';

export default function CandidateLoginPage() {
  const router = useRouter();
  const [candidateCode, setCandidateCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Confirmation modal state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [profileCompleted, setProfileCompleted] = useState(false);

  const handleCandidateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/candidate-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: candidateCode.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (res.ok) {
        // If there's a candidate name, show confirmation popup
        if (data.candidateName) {
          setCandidateName(data.candidateName);
          setProfileCompleted(data.profileCompleted);
          setShowConfirmation(true);
        } else {
          // No name available, proceed directly
          if (!data.profileCompleted) {
            router.push('/candidate/profile-completion');
          } else {
            router.push('/candidate/dashboard');
          }
        }
      } else {
        setError(data.error || 'Kode tidak valid');
      }
    } catch (err) {
      setError('Internal server error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmProceed = () => {
    if (!profileCompleted) {
      router.push('/candidate/profile-completion');
    } else {
      router.push('/candidate/dashboard');
    }
  };

  const handleCancelConfirmation = async () => {
    // Logout the candidate since they cancelled
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout errors
    }
    setShowConfirmation(false);
    setCandidateName('');
  };

  // Format code input with dashes - 12 characters
  const formatCode = (value: string) => {
    const cleaned = value.replace(/[^A-Z0-9]/g, '').substring(0, 12);
    const parts = cleaned.match(/.{1,4}/g) || [];
    return parts.join('-');
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value.toUpperCase());
    setCandidateCode(formatted);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#E6FBFB] via-[#D5F4F8] to-[#C8EEF5]">
      <div className="w-full max-w-[1100px] min-h-[650px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        {/* Left Side - Hero with Kimia Farma Navy & Teal Theme - Hidden on mobile */}
        <div
          className="relative hidden lg:flex w-full lg:w-1/2 h-64 lg:h-auto bg-cover bg-center flex-col justify-between p-8 lg:p-10 text-white overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(to bottom right, rgba(7, 31, 86, 0.92), rgba(9, 147, 169, 0.85)), url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200')`,
          }}
        >
          {/* Main Content - Top */}
          <div className="relative z-10 flex flex-col gap-4">
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
              Selamat Datang di<br />Portal Assessment
            </h1>
            <p className="text-white/80 text-base lg:text-lg font-light leading-relaxed max-w-md">
              Platform asesmen psikologi profesional untuk mengukur potensi dan kepribadian Anda secara komprehensif.
            </p>
          </div>

          {/* Logo + Title + Portal Info - Bottom */}
          <div className="relative z-10 mt-2 pt-4 border-t border-white/20 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-lg lg:text-xl font-semibold">Kimia Farma Mental Health Test</span>
              <div className="flex items-center gap-2 text-sm font-medium text-[#EF942A] mt-1">
                <Users size={16} className="text-[#EF942A]" />
                Portal Khusus Peserta
              </div>
            </div>
            <img
              src="/kimia-farma-logo.jpg"
              alt="Kimia Farma"
              className="h-12 lg:h-14 w-auto rounded-xl shadow-xl shadow-black/30"
            />
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 bg-white p-8 lg:p-16 flex flex-col justify-center">
          {/* Logo for mobile */}
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <div className="h-16 w-16 rounded-xl border border-[#0993A9]/30 flex items-center justify-center p-1 overflow-hidden shadow-sm">
              <img src="/kimia-farma-logo.jpg" alt="Kimia Farma" className="h-full w-full object-cover rounded-lg" />
            </div>
            <h2 className="text-lg font-bold text-[#071F56]">Kimia Farma Mental Health Test</h2>
          </div>

          <div className="mb-8">
            <span className="inline-block py-1.5 px-4 rounded-full bg-[#0993A9]/10 text-[#0993A9] text-xs font-bold tracking-wide uppercase mb-4">
              Portal Peserta
            </span>
            <h1 className="text-[#071F56] tracking-tight text-3xl font-bold leading-tight mb-2">
              Masuk dengan Kode
            </h1>
            <p className="text-slate-500 text-sm font-normal">
              Silakan masukkan kode akses untuk memulai.
            </p>
          </div>

          <form onSubmit={handleCandidateLogin} className="flex flex-col gap-5 w-full max-w-[400px]">
            <div className="flex flex-col gap-2">
              <label className="text-[#071F56] text-sm font-semibold">Kode Akses</label>
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={candidateCode}
                  onChange={handleCodeChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 h-14 px-4 pr-12 text-lg text-[#071F56] placeholder-slate-400 focus:border-[#0993A9] focus:ring-2 focus:ring-[#0993A9]/20 transition-all outline-none font-mono tracking-widest text-center uppercase"
                  placeholder="XXXX - XXXX - XXXX"
                  maxLength={14}
                  required
                />
                <KeyRound size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0993A9]" />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || candidateCode.length < 14}
              className="w-full bg-gradient-to-r from-[#071F56] to-[#0993A9] hover:from-[#0a2a70] hover:to-[#0ba8c2] text-white h-12 rounded-xl text-sm font-bold tracking-wide transition-all shadow-lg shadow-[#0993A9]/25 hover:shadow-xl hover:shadow-[#0993A9]/30 disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>MEMVERIFIKASI...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>MASUK</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-auto pt-8 text-center lg:text-left space-y-2">
            <p className="text-slate-500 text-sm">
              Belum punya kode akses?{' '}
              <span className="text-[#0993A9] font-semibold">Hubungi Psikolog atau HRD Anda</span>
            </p>
            <p className="text-slate-400 text-xs font-normal">© 2025 Kimia Farma Mental Health Test. Powered by Asisya.</p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#071F56] to-[#0993A9] p-6 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-bold">Konfirmasi Identitas</h2>
            </div>
            
            {/* Content */}
            <div className="p-6 text-center">
              <p className="text-slate-600 mb-4">Apakah Anda bernama:</p>
              <div className="bg-gradient-to-r from-[#E6FBFB] to-[#D5F4F8] rounded-xl p-4 mb-6">
                <p className="text-2xl font-bold text-[#071F56]">{candidateName}</p>
              </div>
              <p className="text-sm text-slate-500">
                Pastikan nama di atas sesuai dengan identitas Anda sebelum melanjutkan.
              </p>
            </div>
            
            {/* Actions */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={handleCancelConfirmation}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} />
                Bukan Saya
              </button>
              <button
                onClick={handleConfirmProceed}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#071F56] to-[#0993A9] text-white rounded-xl hover:from-[#0a2a70] hover:to-[#0ba8c2] font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} />
                Ya, Benar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
