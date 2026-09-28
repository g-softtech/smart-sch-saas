'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient, ApiError } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { GraduationCap, Mail, Shield, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      apiClient
        .get<any>('api/v1/auth/me')
        .then((res) => {
          const identity = res?.data || res;
          if (identity?.tenantId) localStorage.setItem('x-tenant-id', identity.tenantId);
          if (identity?.schoolId) localStorage.setItem('x-school-id', identity.schoolId);

          if (identity?.redirectUrl) {
            router.push(identity.redirectUrl);
          } else {
            router.push('/workspaces');
          }
        })
        .catch(() => {
          router.push('/workspaces');
        });
    }
  }, [isAuthLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post<any>(
        'api/v1/auth/login',
        { email: email.trim(), password },
        { requireAuth: false }
      );

      const token = response?.accessToken || response?.data?.accessToken;
      if (token) {
        authLogin(token);
        // Fetch authoritative server-side identity context
        try {
          const meRes = await apiClient.get<any>('api/v1/auth/me');
          const identity = meRes?.data || meRes;
          if (identity?.tenantId) localStorage.setItem('x-tenant-id', identity.tenantId);
          if (identity?.schoolId) localStorage.setItem('x-school-id', identity.schoolId);

          if (identity?.redirectUrl) {
            router.push(identity.redirectUrl);
            return;
          }
        } catch {
          // Fallback to workspaces
        }
        router.push('/workspaces');
      } else {
        setError('Invalid response from authentication server.');
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || 'Login failed. Please check your credentials.');
      } else {
        setError('An unexpected error occurred during sign in.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-[#0A192E]/95 border border-[#1E3A5F] rounded-3xl shadow-2xl backdrop-blur-xl p-8">
        {/* SchoolOS Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-[#D2AD36]/10 border border-[#D2AD36]/30 flex items-center justify-center mb-3 shadow-inner">
            <GraduationCap className="h-7 w-7 text-[#D2AD36]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            School<span className="text-[#D2AD36]">OS</span>
          </h1>
          <p className="text-xs text-[#D2AD36] font-medium mt-1">Unified Portal & Authentication</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@school.com"
                className="w-full pl-10 pr-4 py-2.5 bg-[#070B14] border border-[#1E3A5F] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#D2AD36] focus:ring-1 focus:ring-[#D2AD36] text-sm transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#D2AD36] hover:underline transition"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Shield className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-10 py-2.5 bg-[#070B14] border border-[#1E3A5F] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#D2AD36] focus:ring-1 focus:ring-[#D2AD36] text-sm transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#D2AD36] hover:bg-[#c19c2b] disabled:opacity-50 text-[#0A192E] font-bold rounded-2xl shadow-lg shadow-[#D2AD36]/20 transition duration-200 flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#1E3A5F] text-center">
          <p className="text-xs text-slate-400">
            Have an activation code for a new Student or Parent account?
          </p>
          <Link
            href="/activate"
            className="mt-2 text-xs font-semibold text-[#D2AD36] hover:underline inline-flex items-center gap-1"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Activate Invitation Token
          </Link>
        </div>
      </div>
    </div>
  );
}
