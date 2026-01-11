'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Users, CheckCircle } from 'lucide-react';

export default function CandidateLoginPage() {
  const router = useRouter();
  const [candidateCode, setCandidateCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        if (!data.profileCompleted) {
          router.push('/candidate/profile-completion');
        } else {
          router.push('/candidate/dashboard');
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

  // Format code input with dashes - 16 characters
  const formatCode = (value: string) => {
    const cleaned = value.replace(/[^A-Z0-9]/g, '').substring(0, 16);
    const parts = cleaned.match(/.{1,4}/g) || [];
    return parts.join('-');
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value.toUpperCase());
    setCandidateCode(formatted);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#E6FBFB] via-[#BEE7F0] to-[#0993A9]/20">
      <div className="w-full max-w-[1100px] min-h-[650px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        {/* Left Side - Hero with Kimia Farma Navy & Teal Theme - Hidden on mobile */}
        <div
          className="relative hidden lg:flex w-full lg:w-1/2 h-64 lg:h-auto bg-cover bg-center flex-col justify-end p-8 lg:p-12 text-white overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(to bottom right, rgba(7, 31, 86, 0.92), rgba(9, 147, 169, 0.85)), url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200')`,
          }}
        >
          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center p-2 overflow-hidden">
                <img src="/kimia-farma.jpg" alt="Kimia Farma" className="h-full w-full object-cover rounded-xl" />
              </div>
              <span className="text-xl font-bold">Kimia Farma Assessment</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
              Selamat Datang di Portal Asesmen
            </h1>
            <p className="text-white/80 text-lg font-light leading-relaxed max-w-md">
              Platform asesmen psikologi profesional untuk mengukur potensi dan kepribadian Anda secara komprehensif.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-[#EF942A]">
              <Users size={20} className="text-[#EF942A]" />
              Portal Khusus Kandidat
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 bg-white p-8 lg:p-16 flex flex-col justify-center">
          {/* Logo for mobile */}
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <div className="h-16 w-16 rounded-xl border border-[#0993A9]/30 flex items-center justify-center p-1 overflow-hidden shadow-sm">
              <img src="/kimia-farma-logo.jpg" alt="Kimia Farma" className="h-full w-full object-cover rounded-lg" />
            </div>
            <h2 className="text-lg font-bold text-[#071F56]">Kimia Farma Assessment</h2>
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
                  value={candidateCode}
                  onChange={handleCodeChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 h-14 px-4 pr-12 text-lg text-[#071F56] placeholder-slate-400 focus:border-[#0993A9] focus:ring-2 focus:ring-[#0993A9]/20 transition-all outline-none font-mono tracking-widest text-center uppercase"
                  placeholder="XXXX - XXXX - XXXX"
                  maxLength={19}
                  required
                />
                <KeyRound size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0993A9]" />
              </div>
              <p className="text-slate-400 text-xs text-center mt-1">
                Format: 16 karakter alfanumerik
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || candidateCode.length < 19}
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
              <span className="text-[#0993A9] font-semibold">Hubungi psikolog atau HRD Anda</span>
            </p>
            <p className="text-slate-400 text-xs font-normal">© 2025 Kimia Farma Assessment. Powered by Asisya.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
