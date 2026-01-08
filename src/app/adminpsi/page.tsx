'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Eye, EyeOff, Shield } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect berdasarkan role dari server
        router.push(data.redirect || '/psychologist/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Internal server error: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="w-full max-w-[1100px] min-h-[650px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        {/* Left Side - Hero */}
        <div
          className="relative w-full lg:w-1/2 h-64 lg:h-auto bg-cover bg-center flex flex-col justify-end p-8 lg:p-12 text-white"
          style={{
            backgroundImage: `linear-gradient(to bottom right, rgba(37, 99, 235, 0.9), rgba(15, 23, 42, 0.95)), url('https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1200')`,
          }}
        >
          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center p-2 overflow-hidden">
                <img src="/asisya.png" alt="Asisya" className="h-full w-full object-contain" />
              </div>
              <span className="text-xl font-bold">Asisya Consulting</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
              Professional Assessment Solutions
            </h1>
            <p className="text-white/80 text-lg font-light leading-relaxed max-w-md">
              Dedicated portal for Admins and Psychologists to manage psychological assessments with efficiency and precision.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-white/70">
              <Shield size={20} className="text-white" />
              Secure & Confidential Platform
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 bg-white p-8 lg:p-16 flex flex-col justify-center">
          {/* Logo for mobile */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl border border-blue-200 flex items-center justify-center p-1.5 overflow-hidden">
              <img src="/asisya.png" alt="Asisya" className="h-full w-full object-contain" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Asisya Consulting</h2>
          </div>

          <div className="mb-8">
            <span className="inline-block py-1.5 px-4 rounded-full bg-blue-50 text-blue-600 text-xs font-bold tracking-wide uppercase mb-4">
              Admin & Psychologist Portal
            </span>
            <h1 className="text-slate-900 tracking-tight text-3xl font-bold leading-tight mb-2">
              Welcome Back
            </h1>
            <p className="text-slate-500 text-sm font-normal">
              Please enter your credentials to access the dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5 w-full max-w-[400px]">
            <div className="flex flex-col gap-2">
              <label className="text-slate-700 text-sm font-semibold">Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 h-12 px-4 pr-12 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                  placeholder="Enter your username"
                  required
                />
                <User size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-slate-700 text-sm font-semibold">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 h-12 px-4 pr-12 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-sm font-bold tracking-wide transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'LOGGING IN...' : 'LOGIN'}
            </button>
          </form>

          <div className="mt-auto pt-8 text-center lg:text-left space-y-2">
            <p className="text-slate-500 text-sm">
              Belum punya akun?{' '}
              <button
                onClick={() => router.push('/register')}
                className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
              >
                Daftar sebagai Psikolog
              </button>
            </p>
            <p className="text-slate-400 text-xs font-normal">© 2025 Asisya Consulting. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
