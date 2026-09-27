'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient, ApiError } from '@/lib/api-client';
import {
  GraduationCap,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  Clock,
  ArrowLeft,
} from 'lucide-react';

interface ResetTokenValidation {
  valid: boolean;
  message: string;
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [validating, setValidating] = useState(false);
  const [validationInfo, setValidationInfo] = useState<ResetTokenValidation | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetCompleted, setResetCompleted] = useState(false);

  // Password Policy Checks (Authoritative Backend Policy: 8-64 chars, letter + number)
  const hasMinLength = newPassword.length >= 8 && newPassword.length <= 64;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && hasLetter && hasNumber && passwordsMatch;

  useEffect(() => {
    async function validateResetToken(rawToken: string) {
      if (!rawToken.trim()) {
        setValidationInfo(null);
        return;
      }
      setValidating(true);
      setError(null);

      try {
        const res = await apiClient.get<ResetTokenValidation>(
          `/api/v1/auth/validate-reset-token?token=${encodeURIComponent(rawToken.trim())}`,
          { requireAuth: false }
        );
        setValidationInfo(res);
      } catch (err: any) {
        setValidationInfo({
          valid: false,
          message: err.message || 'Invalid or expired password reset link.',
        });
      } finally {
        setValidating(false);
      }
    }

    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      validateResetToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError('Reset token is required.');
      return;
    }

    if (!isFormValid) {
      setError('Please satisfy all password complexity requirements.');
      return;
    }

    setSubmitting(true);

    try {
      await apiClient.post(
        '/api/v1/auth/reset-password',
        { token: token.trim(), newPassword },
        { requireAuth: false }
      );
      setResetCompleted(true);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Password reset failed.');
      } else {
        setError(err.message || 'An unexpected error occurred while resetting password.');
      }
    } finally {
      setSubmitting(false);
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
          <p className="text-xs text-[#D2AD36] font-medium mt-1">Set New Account Password</p>
        </div>

        {/* Loading Token Pre-validation */}
        {validating && (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#D2AD36]" />
            <p className="text-sm font-medium">Validating password reset link...</p>
          </div>
        )}

        {/* Success Reset State */}
        {!validating && resetCompleted && (
          <div className="space-y-6 text-center animate-fadeIn py-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#039771]/10 border border-[#039771]/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-[#039771]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Password Reset Complete!</h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Your password has been updated successfully. You may now sign in with your new password.
              </p>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3.5 px-4 bg-[#D2AD36] hover:bg-[#c19c2b] text-[#0A192E] font-bold rounded-2xl shadow-lg shadow-[#D2AD36]/20 transition duration-200 flex items-center justify-center gap-2"
            >
              Sign In to Your Account
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Invalid or Expired Token State */}
        {!validating && !resetCompleted && validationInfo && !validationInfo.valid && (
          <div className="space-y-6 text-center">
            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <Clock className="h-10 w-10 text-amber-400 mx-auto" />
              <h3 className="text-lg font-bold text-amber-300">Invalid or Expired Reset Link</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {validationInfo.message || 'This password reset link is invalid, expired, or has already been used.'}
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <Link
                href="/forgot-password"
                className="w-full py-3 px-4 bg-[#D2AD36] hover:bg-[#c19c2b] text-[#0A192E] font-bold rounded-xl shadow-lg transition duration-200 flex items-center justify-center gap-2 text-sm"
              >
                Request New Reset Link
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="text-xs text-slate-400 hover:text-slate-200 transition inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* Password Reset Form (when token is valid) */}
        {!validating && !resetCompleted && validationInfo && validationInfo.valid && (
          <form onSubmit={handleReset} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                New Password
              </label>
              <div className="relative">
                <Shield className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
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

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Shield className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#070B14] border border-[#1E3A5F] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#D2AD36] focus:ring-1 focus:ring-[#D2AD36] text-sm transition"
                />
              </div>
            </div>

            {/* Password Policy Requirements */}
            <div className="p-3.5 rounded-xl bg-[#070B14]/80 border border-[#1E3A5F]/60 space-y-1.5 text-[11px]">
              <span className="block font-semibold text-slate-400 mb-1 uppercase tracking-wider text-[10px]">
                Password Requirements
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-[#039771]' : 'text-slate-500'}`}>
                  <CheckCircle2 className="h-3 w-3" />
                  <span>8–64 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-[#039771]' : 'text-slate-500'}`}>
                  <CheckCircle2 className="h-3 w-3" />
                  <span>At least one letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-[#039771]' : 'text-slate-500'}`}>
                  <CheckCircle2 className="h-3 w-3" />
                  <span>At least one number</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-[#039771]' : 'text-slate-500'}`}>
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Passwords match</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !isFormValid}
              className="w-full py-3.5 px-4 bg-[#D2AD36] hover:bg-[#c19c2b] disabled:opacity-40 text-[#0A192E] font-bold rounded-2xl shadow-lg shadow-[#D2AD36]/20 transition duration-200 flex items-center justify-center gap-2 mt-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                'Save New Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070B14] flex items-center justify-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-[#D2AD36]" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
