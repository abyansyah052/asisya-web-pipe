'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loginMode, setLoginMode] = useState<'staff' | 'candidate'>('staff');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [candidateCode, setCandidateCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Staff login handler (psychologist, admin, super_admin)
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Role-based redirect
        if (data.role === 'super_admin') {
          router.push('/superadmin/dashboard');
        } else if (data.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (data.role === 'psychologist') {
          router.push('/psychologist/dashboard');
        } else {
          setError('Unauthorized role. Kandidat harus login menggunakan kode akses.');
        }
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Internal server error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Candidate login with code
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
        // 🔴 NEW: Check if code was already used
        if (data.codeUsed) {
          // Code sudah dipakai - redirect ke view results, bukan exam
          setError('Kode sudah digunakan. Anda dapat melihat hasil ujian Anda.');
          setTimeout(() => {
            router.push('/candidate/dashboard?view=results');
          }, 1500);
          return;
        }

        // Check if profile completed
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white p-8 pb-0 text-center flex flex-col items-center">
          <div className="mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/asisya.png"
              alt="Asisya Consulting"
              className="h-20 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-blue-800 mb-1">Asisya Consulting</h1>
          <p className="text-gray-500 text-sm">Online Assessment Portal</p>
        </div>

        {/* Login Mode Toggle */}
        <div className="px-8 pt-6">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setLoginMode('staff'); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                loginMode === 'staff'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Staff Login
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('candidate'); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                loginMode === 'candidate'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Kandidat
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-8 pt-6">
          {loginMode === 'staff' ? (
            <form onSubmit={handleStaffLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username/Email</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-black placeholder-gray-400"
                  placeholder="Masukkan username atau email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-black placeholder-gray-400 pr-10"
                    placeholder="Masukkan password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <span>Loading...</span> : <span>Sign In</span>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCandidateLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kode Akses</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={candidateCode}
                    onChange={(e) => setCandidateCode(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-black placeholder-gray-400 uppercase tracking-widest font-mono"
                    placeholder="XXXX-XXXX-XXXX"
                    maxLength={14}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Masukkan kode akses yang diberikan oleh psikolog/admin Anda
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <span>Loading...</span> : (
                  <>
                    <KeyRound className="h-5 w-5" />
                    <span>Masuk dengan Kode</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 text-center text-xs text-gray-400">
            &copy; 2025 Asisya Consulting. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
