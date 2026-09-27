'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { GraduationCap, Mail, ArrowRight, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your account email address.');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post(
        '/api/v1/auth/forgot-password',
        { email: email.trim() },
        { requireAuth: false }
      );
      // Always show generic success message for enumeration protection
      setSubmitted(true);
    } catch (err: any) {
      // Even if server error occurs, present generic response or soft error
      setSubmitted(true);
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
          <p className="text-xs text-[#D2AD36] font-medium mt-1">Password Recovery</p>
        </div>

        {submitted ? (
          <div className="space-y-6 text-center animate-fadeIn py-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#039771]/10 border border-[#039771]/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-[#039771]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Instructions Sent</h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                If an account with email <span className="font-semibold text-[#D2AD36]">{email}</span> exists in our system, password reset instructions have been sent.
              </p>
              <p className="text-[11px] text-slate-400 mt-2">
                Please check your inbox and spam folder for your password reset link.
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <Link
                href="/login"
                className="w-full py-3 px-4 bg-[#D2AD36] hover:bg-[#c19c2b] text-[#0A192E] font-bold rounded-2xl shadow-lg transition duration-200 flex items-center justify-center gap-2 text-sm"
              >
                Return to Sign In
                <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                onClick={() => { setSubmitted(false); setEmail(''); }}
                className="text-xs text-slate-400 hover:text-slate-200 transition"
              >
                Try a different email address
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center mb-2">
              <h2 className="text-lg font-bold text-slate-100">Forgot your password?</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your registered email address and we will send you instructions to reset your password.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Account Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#070B14] border border-[#1E3A5F] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#D2AD36] focus:ring-1 focus:ring-[#D2AD36] text-sm transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#D2AD36] hover:bg-[#c19c2b] disabled:opacity-50 text-[#0A192E] font-bold rounded-2xl shadow-lg shadow-[#D2AD36]/20 transition duration-200 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending Instructions...
                </>
              ) : (
                'Send Reset Instructions'
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="text-xs text-slate-400 hover:text-[#D2AD36] transition inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
