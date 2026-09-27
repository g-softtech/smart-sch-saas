'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient, ApiError } from '@/lib/api-client';
import {
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  GraduationCap,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  Mail,
  Clock,
  Ban,
  HelpCircle,
} from 'lucide-react';

interface TokenValidationResult {
  valid: boolean;
  status: 'PENDING' | 'EXPIRED' | 'CONSUMED' | 'REVOKED' | 'INVALID';
  message: string;
  recipientName?: string;
  schoolName?: string;
  maskedEmail?: string;
  targetType?: 'STUDENT' | 'GUARDIAN';
}

function ActivateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login: authLogin } = useAuth();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [validating, setValidating] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenValidationResult | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ accessToken?: string; redirectUrl?: string; email?: string } | null>(null);

  // Password Policy Checks (Authoritative Backend Policy: 8-64 chars, letter + number)
  const hasMinLength = password.length >= 8 && password.length <= 64;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = hasMinLength && hasLetter && hasNumber && passwordsMatch;

  // Validate Token on mount or when token string changes
  useEffect(() => {
    async function validate(rawToken: string) {
      if (!rawToken.trim()) {
        setTokenInfo(null);
        return;
      }
      setValidating(true);
      setError(null);

      try {
        const res = await apiClient.get<TokenValidationResult>(
          `/api/v1/portal/account/validate-token?token=${encodeURIComponent(rawToken.trim())}`,
          { requireAuth: false }
        );
        setTokenInfo(res);
      } catch (err: any) {
        setTokenInfo({
          valid: false,
          status: 'INVALID',
          message: err.message || 'Failed to validate invitation token.',
        });
      } finally {
        setValidating(false);
      }
    }

    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      validate(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleManualValidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      router.push(`/activate?token=${encodeURIComponent(token.trim())}`);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError('Activation token is required.');
      return;
    }

    if (!isFormValid) {
      setError('Please satisfy all password complexity requirements.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await apiClient.post<any>(
        '/api/v1/portal/account/activate',
        { token: token.trim(), password },
        { requireAuth: false }
      );

      setSuccessData(res);

      // Store access token immediately in client auth context
      if (res?.accessToken) {
        authLogin(res.accessToken);
      }

      // Auto-redirect to designated portal dashboard after 2.5s
      const destination = res?.redirectUrl || '/login';
      setTimeout(() => {
        router.push(destination);
      }, 2500);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Activation failed.');
      } else {
        setError(err.message || 'An unexpected error occurred during account activation.');
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
          <p className="text-xs text-[#D2AD36] font-medium mt-1">Portal Account Onboarding</p>
        </div>

        {/* Loading Token Validation */}
        {validating && (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#D2AD36]" />
            <p className="text-sm font-medium">Validating activation invitation...</p>
          </div>
        )}

        {/* Success State */}
        {!validating && successData && (
          <div className="space-y-6 text-center animate-fadeIn py-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#039771]/10 border border-[#039771]/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-[#039771]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Account Successfully Activated!</h2>
              <p className="text-sm text-slate-400 mt-2">
                Your portal account is active. Redirecting you to your portal dashboard...
              </p>
            </div>
            <button
              onClick={() => router.push(successData.redirectUrl || '/login')}
              className="w-full py-3.5 px-4 bg-[#D2AD36] hover:bg-[#c19c2b] text-[#0A192E] font-bold rounded-2xl shadow-lg shadow-[#D2AD36]/20 transition duration-200 flex items-center justify-center gap-2"
            >
              Enter Portal Now
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Non-valid Token States */}
        {!validating && !successData && tokenInfo && !tokenInfo.valid && (
          <div className="space-y-6">
            {tokenInfo.status === 'EXPIRED' && (
              <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3">
                <Clock className="h-10 w-10 text-amber-400 mx-auto" />
                <h3 className="text-lg font-bold text-amber-300">Invitation Link Expired</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  This portal activation token has passed its 72-hour validity window. Please request a new invitation from your school administrator.
                </p>
              </div>
            )}

            {tokenInfo.status === 'CONSUMED' && (
              <div className="p-6 rounded-2xl bg-[#039771]/10 border border-[#039771]/30 text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 text-[#039771] mx-auto" />
                <h3 className="text-lg font-bold text-slate-100">Invitation Already Activated</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  This invitation has already been used to activate a portal account. You may sign in with your credentials directly.
                </p>
                <button
                  onClick={() => router.push('/login')}
                  className="mt-2 w-full py-3 px-4 bg-[#D2AD36] hover:bg-[#c19c2b] text-[#0A192E] font-bold rounded-xl text-sm transition"
                >
                  Proceed to Sign In
                </button>
              </div>
            )}

            {tokenInfo.status === 'REVOKED' && (
              <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
                <Ban className="h-10 w-10 text-rose-400 mx-auto" />
                <h3 className="text-lg font-bold text-rose-300">Invitation Revoked</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  This portal invitation has been revoked by your school administration. Please contact your school administrator if you require access.
                </p>
              </div>
            )}

            {tokenInfo.status === 'INVALID' && (
              <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
                <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
                <h3 className="text-lg font-bold text-rose-300">Invalid Activation Link</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {tokenInfo.message || 'The activation token provided is invalid or corrupted. Please check your invitation email or contact your school administrator.'}
                </p>
              </div>
            )}

            <div className="pt-2 text-center">
              <button
                onClick={() => { setTokenInfo(null); setToken(''); }}
                className="text-xs text-[#D2AD36] hover:underline flex items-center justify-center gap-1 mx-auto"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Enter a different activation token
              </button>
            </div>
          </div>
        )}

        {/* Manual Token Entry (when no token in URL and no token validated yet) */}
        {!validating && !successData && !tokenInfo && !tokenFromUrl && (
          <form onSubmit={handleManualValidate} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Activation Token Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your 64-character activation token"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#070B14] border border-[#1E3A5F] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#D2AD36] focus:ring-1 focus:ring-[#D2AD36] text-sm transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#D2AD36] hover:bg-[#c19c2b] text-[#0A192E] font-bold rounded-xl shadow-lg transition duration-200 flex items-center justify-center gap-2"
            >
              Verify Token
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* Account Password Setup Form (Only when token is PENDING / Valid) */}
        {!validating && !successData && tokenInfo && tokenInfo.valid && (
          <form onSubmit={handleActivate} className="space-y-5">
            {/* Safe Recipient Context Card */}
            <div className="p-4 rounded-2xl bg-[#070B14] border border-[#1E3A5F] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-[#D2AD36]" />
                  Account Holder:
                </span>
                <span className="font-bold text-slate-100">{tokenInfo.recipientName || 'Authorized User'}</span>
              </div>
              {tokenInfo.schoolName && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-[#D2AD36]" />
                    School:
                  </span>
                  <span className="font-semibold text-[#D2AD36]">{tokenInfo.schoolName}</span>
                </div>
              )}
              {tokenInfo.maskedEmail && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-[#D2AD36]" />
                    Account Email:
                  </span>
                  <span className="font-mono text-slate-300">{tokenInfo.maskedEmail}</span>
                </div>
              )}
              {tokenInfo.targetType && (
                <div className="flex items-center justify-between pt-1 border-t border-[#1E3A5F]/60">
                  <span className="text-slate-400 font-medium">Portal Type:</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#D2AD36]/10 text-[#D2AD36] font-semibold text-[10px] border border-[#D2AD36]/20 uppercase">
                    {tokenInfo.targetType === 'STUDENT' ? 'Student Portal' : 'Parent / Guardian Portal'}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Set Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Create Account Password
              </label>
              <div className="relative">
                <Shield className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set your account password"
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

            {/* Confirm Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Confirm Account Password
              </label>
              <div className="relative">
                <Shield className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#070B14] border border-[#1E3A5F] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#D2AD36] focus:ring-1 focus:ring-[#D2AD36] text-sm transition"
                />
              </div>
            </div>

            {/* Password Policy Requirements Checklist */}
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
                  Activating Portal Account...
                </>
              ) : (
                'Activate Account'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070B14] flex items-center justify-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-[#D2AD36]" />
        </div>
      }
    >
      <ActivateContent />
    </Suspense>
  );
}
