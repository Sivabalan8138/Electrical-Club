'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Cpu, Lock, Eye, EyeOff } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('ELECTRICALCLUB-105');
  const [password, setPassword] = useState('vsb105club');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Password Reset state
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [tempToken, setTempToken] = useState('');

  useEffect(() => {
    // If token exists, direct to dashboard
    const token = localStorage.getItem('adminToken');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.isFirstLogin) {
          setTempToken(data.token);
          setIsFirstLogin(true);
        } else {
          localStorage.setItem('adminToken', data.token);
          router.push('/dashboard');
        }
      } else {
        setErrorMessage(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setErrorMessage('Server connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters.');
      return;
    }

    setResetLoading(true);
    setResetError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/admin/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      if (res.ok) {
        // Save token and login
        localStorage.setItem('adminToken', tempToken);
        router.push('/dashboard');
      } else {
        const data = await res.json();
        setResetError(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setResetError('Connection issue.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      {!isFirstLogin ? (
        /* STANDARD LOGIN FORM */
        <div className="glass-panel rounded-2xl border border-[#00D4FF]/20 p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <Cpu className="h-10 w-10 text-[#00FFFF] mx-auto filter drop-shadow-[0_0_8px_#00FFFF] animate-pulse" />
            <h2 className="text-xl font-bold tracking-wide">Admin Control Console</h2>
            <p className="text-xs text-gray-400">Electrical Club Event Administration</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 font-semibold uppercase">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ELECTRICALCLUB-105"
                className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00FFFF]"
              />
            </div>

            <div className="space-y-1 relative">
              <label className="block text-[10px] text-gray-400 font-semibold uppercase">Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#081B33] border border-[#00D4FF]/20 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-[#00FFFF]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-7.5 text-gray-500 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>

            {errorMessage && <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs font-semibold text-center">{errorMessage}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#00D4FF] to-[#00FFFF] text-[#081B33] font-bold rounded-xl text-sm hover:opacity-95 shadow-[0_0_12px_rgba(0,212,255,0.3)] transition-all cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      ) : (
        /* FORCED PASSWORD CHANGE */
        <div className="glass-panel border-2 border-yellow-500/30 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <Lock className="h-10 w-10 text-yellow-500 mx-auto animate-bounce" />
            <h2 className="text-xl font-bold text-white">First-Time Setup</h2>
            <p className="text-xs text-gray-400">For security reasons, you must change the default admin password.</p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 font-semibold uppercase">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-[#081B33] border border-[#00D4FF]/25 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00FFFF]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 font-semibold uppercase">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-[#081B33] border border-[#00D4FF]/25 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00FFFF]"
              />
            </div>

            {resetError && <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs font-semibold text-center">{resetError}</div>}

            <button
              type="submit"
              disabled={resetLoading}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-bold rounded-xl text-sm hover:opacity-95 shadow-md transition-all cursor-pointer"
            >
              {resetLoading ? 'Saving...' : 'Update Password & Access'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
