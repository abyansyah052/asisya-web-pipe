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

  // Format code input with dashes
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="w-full max-w-[1100px] min-h-[650px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        {/* Left Side - Hero */}
        <div
          className="relative w-full lg:w-1/2 h-64 lg:h-auto bg-cover bg-center flex flex-col justify-end p-8 lg:p-12 text-white"
          style={{
            backgroundImage: `linear-gradient(to bottom right, rgba(6, 182, 212, 0.9), rgba(37, 99, 235, 0.95)), url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200')`,
          }}
        >
          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex items-center gap-3 mb-2">
              <img src="/asisya.png" alt="Asisya" className="h-12 w-auto brightness-0 invert" />
              <span className="text-xl font-bold">Asisya Consulting</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
              Selamat Datang di Portal Asesmen
            </h1>
            <p className="text-white/80 text-lg font-light leading-relaxed max-w-md">
              Platform asesmen psikologi profesional untuk mengukur potensi dan kepribadian Anda secara komprehensif.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-white/70">
              <Users size={20} className="text-white" />
              Portal Khusus Kandidat
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 bg-white p-8 lg:p-16 flex flex-col justify-center">
          {/* Logo for mobile */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <img src="/asisya.png" alt="Asisya" className="h-10 w-auto" />
            <h2 className="text-xl font-bold text-slate-900">Asisya Consulting</h2>
          </div>

          <div className="mb-8">
            <span className="inline-block py-1.5 px-4 rounded-full bg-cyan-50 text-cyan-600 text-xs font-bold tracking-wide uppercase mb-4">
              Portal Kandidat
            </span>
            <h1 className="text-slate-900 tracking-tight text-3xl font-bold leading-tight mb-2">
              Masuk dengan Kode
            </h1>
            <p className="text-slate-500 text-sm font-normal">
              Masukkan kode akses yang diberikan oleh psikolog atau HRD Anda.
            </p>
          </div>

          <form onSubmit={handleCandidateLogin} className="flex flex-col gap-5 w-full max-w-[400px]">
            <div className="flex flex-col gap-2">
              <label className="text-slate-700 text-sm font-semibold">Kode Akses</label>
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  value={candidateCode}
                  onChange={handleCodeChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 h-14 px-4 pr-12 text-lg text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none font-mono tracking-widest text-center uppercase"
                  placeholder="XXXX-XXXX-XXXX"
                  maxLength={14}
                  required
                />
                <KeyRound size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <p className="text-slate-400 text-xs text-center mt-1">
                Format: 12 karakter alfanumerik
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || candidateCode.length < 14}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white h-12 rounded-xl text-sm font-bold tracking-wide transition-all shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
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
              <span className="text-cyan-600 font-semibold">Hubungi psikolog atau HRD Anda</span>
            </p>
            <p className="text-slate-400 text-xs font-normal">© 2025 Asisya Consulting. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
