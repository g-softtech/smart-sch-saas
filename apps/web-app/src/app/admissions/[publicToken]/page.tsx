"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api-client';

interface FormConfig {
  title: string;
  academicYear?: string;
  targetClass?: string;
  applicationFee?: number | string;
  currency?: string;
  fieldsSchema?: Record<string, { type: string; label?: string; required?: boolean; options?: string[]; maxLength?: number; minLength?: number }>;
}

interface TrackingInfo {
  trackingToken: string;
  status: string;
  currentStageLabel: string | null;
  formTitle: string | null;
  submittedAt: string;
  payment: { status: string; amount: string | number; currency: string } | null;
  exam: { examDate: string; venue: string; score: number | null; status: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  PENDING_PAYMENT: { label: 'Payment Pending', color: 'text-yellow-600', description: 'Your application is awaiting payment.' },
  SUBMITTED: { label: 'Submitted', color: 'text-blue-600', description: 'Your application has been submitted and is awaiting review.' },
  UNDER_REVIEW: { label: 'Under Review', color: 'text-indigo-600', description: 'Your application is being reviewed by the admissions team.' },
  APPROVED: { label: 'Approved', color: 'text-green-600', description: 'Congratulations! Your application has been approved.' },
  REJECTED: { label: 'Not Successful', color: 'text-red-600', description: 'Unfortunately, your application was not successful at this time.' },
  WAITLISTED: { label: 'Waitlisted', color: 'text-orange-600', description: 'Your application has been placed on the waiting list.' },
  ENROLLED: { label: 'Enrolled', color: 'text-purple-600', description: 'You have been successfully enrolled.' },
};

const EXAM_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  ABSENT: 'Absent',
  CANCELLED: 'Cancelled',
};

// View states
type ViewState = 'form' | 'payment_pending' | 'success' | 'tracking';

export default function PublicAdmissionsPage() {
  const params = useParams();
  const publicToken = params.publicToken as string;

  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  // Core Applicant State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('MALE');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Dynamic Form Data State
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // View & Result State
  const [viewState, setViewState] = useState<ViewState>('form');
  const [trackingToken, setTrackingToken] = useState<string | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);

  // Payment verification state
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Tracking view state
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const fetchFormConfig = useCallback(async () => {
    setLoadingConfig(true);
    setConfigError(null);
    try {
      const res = await apiClient.get(`public/admissions/forms/${publicToken}`, { requireAuth: false });
      const config = res as FormConfig;
      if (config) {
        setFormConfig(config);
      } else {
        setConfigError('Form configuration not found.');
      }
    } catch (err: unknown) {
      setConfigError(err instanceof ApiError && err.status === 404 ? 'This admission form does not exist or has been closed.' : 'Failed to load admission form.');
    } finally {
      setLoadingConfig(false);
    }
  }, [publicToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFormConfig();
  }, [fetchFormConfig]);

  const handleDynamicChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await apiClient.post(`public/admissions/applications/${publicToken}`, {
        applicant: { firstName, lastName, email, gender, dateOfBirth },
        formData
      }, { requireAuth: false });

      const result = res as { trackingToken: string; payment?: { authorizationUrl: string; reference: string } };

      if (!result?.trackingToken) {
        throw new Error('Failed to generate tracking token.');
      }

      setTrackingToken(result.trackingToken);

      if (result.payment?.authorizationUrl) {
        // Paid application — show payment redirect UI
        setAuthorizationUrl(result.payment.authorizationUrl);
        setPaymentReference(result.payment.reference);
        setViewState('payment_pending');
      } else {
        // Free application — submitted directly
        setViewState('success');
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!trackingToken || !paymentReference) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await apiClient.post('public/admissions/payments/verify', {
        trackingToken,
        reference: paymentReference,
      }, { requireAuth: false });

      const result = res as { status: string };
      if (result?.status === 'SUBMITTED') {
        setViewState('success');
      } else {
        setVerifyError('Payment verification indicates the payment has not yet completed. Please try again or contact support.');
      }
    } catch (err: unknown) {
      setVerifyError(err instanceof Error ? err.message : 'Payment verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleTrackApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingInput.trim()) return;
    setTrackingLoading(true);
    setTrackingError(null);
    setTrackingInfo(null);
    try {
      const res = await apiClient.get(`public/admissions/tracking/${trackingInput.trim()}`, { requireAuth: false });
      const result = res as TrackingInfo;
      if (result) {
        setTrackingInfo(result);
      } else {
        setTrackingError('No application found for this tracking token.');
      }
    } catch (err: unknown) {
      setTrackingError(err instanceof ApiError && err.status === 404 ? 'No application found for this tracking token. Please check and try again.' : 'Failed to retrieve application status.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const hasFee = formConfig && Number(formConfig.applicationFee ?? 0) > 0;

  // ─── Loading ───────────────────────────────────────────────────────
  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading form...</p>
        </div>
      </div>
    );
  }

  // ─── Config Error ──────────────────────────────────────────────────
  if (configError || !formConfig) {
    return (
      <div className="min-h-screen bg-[#0A192F] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#112240] shadow-xl rounded-xl p-8 text-center border border-[#1d3a6e]">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-900/30 mb-4">
            <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Form Unavailable</h2>
          <p className="text-sm text-gray-400">{configError}</p>
        </div>
      </div>
    );
  }

  // ─── Payment Pending ───────────────────────────────────────────────
  if (viewState === 'payment_pending') {
    return (
      <div className="min-h-screen bg-[#0A192F] flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-lg w-full">
          <div className="bg-[#112240] rounded-xl shadow-2xl border border-[#1d3a6e] overflow-hidden">
            <div className="bg-yellow-600/20 border-b border-yellow-600/30 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Payment Required</h2>
                  <p className="text-sm text-yellow-300/80">Your application is reserved — complete payment to submit.</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 space-y-5">
              <div className="bg-[#0A192F] rounded-lg p-4 border border-[#1d3a6e]">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Application Fee</p>
                <p className="text-2xl font-bold text-white">{formConfig.currency} {Number(formConfig.applicationFee).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">For: {formConfig.title}</p>
              </div>

              <div className="bg-[#0A192F] rounded-lg p-4 border border-[#1d3a6e]">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Your Tracking Token</p>
                <code className="text-sm font-mono text-[#D4AF37] break-all">{trackingToken}</code>
                <p className="text-xs text-gray-500 mt-2">Save this token — you can use it to check your application status.</p>
              </div>

              {verifyError && (
                <div className="rounded-md bg-red-900/20 border border-red-700/40 p-3 text-sm text-red-300">
                  {verifyError}
                </div>
              )}

              <div className="space-y-3">
                {authorizationUrl && (
                  <a
                    href={authorizationUrl}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#D4AF37] hover:bg-[#B3932E] text-brand-navy font-bold text-sm transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Pay Now via Paystack
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleVerifyPayment}
                  disabled={verifying}
                  className="w-full flex items-center justify-center py-3 px-4 rounded-lg border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {verifying ? 'Verifying Payment...' : 'I have paid — verify my payment'}
                </button>
              </div>

              <p className="text-xs text-center text-gray-500">
                Do not close this page. After completing payment on Paystack, click the verification button above.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Success ───────────────────────────────────────────────────────
  if (viewState === 'success') {
    return (
      <div className="min-h-screen bg-[#0A192F] flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-lg w-full bg-[#112240] shadow-2xl rounded-xl overflow-hidden border border-[#1d3a6e]">
          <div className="bg-emerald-600 px-6 py-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/50 mb-4 border-4 border-emerald-400">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Application Submitted!</h2>
            <p className="text-emerald-100">Thank you for applying to {formConfig.title}.</p>
          </div>
          <div className="px-8 py-8 text-center space-y-4">
            <p className="text-sm text-gray-400">Save your unique tracking token below to check your application status at any time.</p>
            <div className="bg-[#0A192F] p-4 rounded-lg border border-[#1d3a6e]">
              <code className="text-base font-mono font-bold text-[#D4AF37] break-all">{trackingToken}</code>
            </div>

            <button
              type="button"
              onClick={() => { setTrackingInput(trackingToken ?? ''); setViewState('tracking'); }}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] text-sm font-medium hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 transition-colors"
            >
              Track My Application Status
            </button>

            <p className="text-xs text-gray-500 pt-2">
              You may now close this window. We will be in touch once the review begins.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Tracking View ──────────────────────────────────────────────────
  if (viewState === 'tracking') {
    return (
      <div className="min-h-screen bg-[#0A192F] flex flex-col py-12 px-4 font-sans">
        <div className="max-w-xl w-full mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-white">Track Your Application</h1>
            <p className="mt-2 text-sm text-gray-400">Enter your tracking token to check your current application status.</p>
          </div>

          <div className="bg-[#112240] rounded-xl border border-[#1d3a6e] p-6">
            <form onSubmit={handleTrackApplication} className="flex gap-3">
              <input
                type="text"
                value={trackingInput}
                onChange={e => setTrackingInput(e.target.value)}
                placeholder="trk_xxxxxxxx..."
                className="flex-1 px-3 py-2 rounded-lg border border-[#1d3a6e] bg-[#0A192F] text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 font-mono"
              />
              <button
                type="submit"
                disabled={trackingLoading || !trackingInput.trim()}
                className="px-4 py-2 bg-[#D4AF37] text-brand-navy font-bold rounded-lg text-sm hover:bg-[#B3932E] disabled:opacity-50 transition-colors"
              >
                {trackingLoading ? '...' : 'Track'}
              </button>
            </form>

            {trackingError && (
              <div className="mt-4 rounded-md bg-red-900/20 border border-red-700/40 p-3 text-sm text-red-300">
                {trackingError}
              </div>
            )}

            {trackingInfo && (
              <div className="mt-6 space-y-4">
                <div className="border-t border-[#1d3a6e] pt-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Application For</p>
                  <p className="text-white font-medium">{trackingInfo.formTitle}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current Status</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${STATUS_CONFIG[trackingInfo.status]?.color ?? 'text-gray-300'}`}>
                      {STATUS_CONFIG[trackingInfo.status]?.label ?? trackingInfo.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{STATUS_CONFIG[trackingInfo.status]?.description ?? ''}</p>
                </div>

                {trackingInfo.currentStageLabel && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current Stage</p>
                    <p className="text-sm text-indigo-300 font-medium">{trackingInfo.currentStageLabel}</p>
                  </div>
                )}

                {trackingInfo.payment && (
                  <div className="bg-[#0A192F] rounded-lg p-3 border border-[#1d3a6e]">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Payment</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">{trackingInfo.payment.currency} {Number(trackingInfo.payment.amount).toLocaleString()}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trackingInfo.payment.status === 'SUCCESS' ? 'bg-green-900/30 text-green-300' : 'bg-yellow-900/30 text-yellow-300'}`}>
                        {trackingInfo.payment.status}
                      </span>
                    </div>
                  </div>
                )}

                {trackingInfo.exam && (
                  <div className="bg-[#0A192F] rounded-lg p-3 border border-[#1d3a6e]">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Entrance Exam</p>
                    <div className="space-y-1 text-sm text-gray-300">
                      <p>Date: <span className="text-white">{new Date(trackingInfo.exam.examDate).toLocaleString()}</span></p>
                      <p>Venue: <span className="text-white">{trackingInfo.exam.venue}</span></p>
                      <p>Status: <span className="text-white font-medium">{EXAM_STATUS_LABELS[trackingInfo.exam.status] ?? trackingInfo.exam.status}</span></p>
                      {trackingInfo.exam.score !== null && (
                        <p>Score: <span className="text-[#D4AF37] font-bold">{trackingInfo.exam.score}</span></p>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  Submitted: {new Date(trackingInfo.submittedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setViewState('form'); setTrackingInfo(null); setTrackingInput(''); }}
              className="text-sm text-[#D4AF37]/70 hover:text-[#D4AF37] underline"
            >
              ← Back to Application Form
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Application Form ──────────────────────────────────────────────
  const dynamicFields = formConfig.fieldsSchema || {};

  return (
    <div className="min-h-screen bg-[#0A192F] flex flex-col py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl w-full mx-auto space-y-8">

        {/* Header Section */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            {formConfig.title}
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            {formConfig.academicYear && formConfig.targetClass
              ? `Admissions for ${formConfig.academicYear} - ${formConfig.targetClass}`
              : 'Please complete the application form below'}
          </p>
          {hasFee && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-600/20 border border-yellow-500/30 text-yellow-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">
                Application Fee: {formConfig.currency} {Number(formConfig.applicationFee).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Track existing application */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setViewState('tracking')}
            className="text-sm text-[#D4AF37]/70 hover:text-[#D4AF37] underline"
          >
            Already applied? Track your application status →
          </button>
        </div>

        {/* Form Container */}
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border-t-4 border-[#D4AF37]">
          <form className="space-y-6" onSubmit={handleSubmit}>

            {submitError && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <h3 className="text-sm font-medium text-red-800">Submission Error</h3>
                <div className="mt-2 text-sm text-red-700"><p>{submitError}</p></div>
              </div>
            )}

            {hasFee && (
              <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
                <div className="flex gap-2">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Payment Required</p>
                    <p className="text-sm text-amber-700">
                      This application requires a fee of <strong>{formConfig.currency} {Number(formConfig.applicationFee).toLocaleString()}</strong>. You will be directed to Paystack after submitting your details.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Applicant Demographics */}
            <div>
              <h3 className="text-lg leading-6 font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                Applicant Demographics
              </h3>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
                  <input id="firstName" type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
                    className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm" />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name <span className="text-red-500">*</span></label>
                  <input id="lastName" type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                    className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm" />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address <span className="text-red-500">*</span></label>
                  <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm" />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender <span className="text-red-500">*</span></label>
                  <select id="gender" required value={gender} onChange={e => setGender(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm">
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <input id="dateOfBirth" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)}
                    className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm" />
                </div>
              </div>
            </div>

            {/* Dynamic Fields */}
            {Object.keys(dynamicFields).length > 0 && (
              <div className="pt-4">
                <h3 className="text-lg leading-6 font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                  Additional Information
                </h3>
                <div className="grid grid-cols-1 gap-y-6">
                  {Object.entries(dynamicFields).map(([key, config]) => (
                    <div key={key}>
                      <label htmlFor={key} className="block text-sm font-medium text-gray-700">
                        {config.label || key}
                        {config.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <div className="mt-1">
                        {config.type === 'select' ? (
                          <select id={key} required={config.required} value={formData[key] || ''} onChange={e => handleDynamicChange(key, e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm">
                            <option value="">Select an option</option>
                            {config.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : config.type === 'boolean' ? (
                          <div className="flex items-center h-full pt-2">
                            <input id={key} type="checkbox" required={config.required}
                              checked={formData[key] === 'true'} onChange={e => handleDynamicChange(key, e.target.checked ? 'true' : 'false')}
                              className="h-4 w-4 text-[#D4AF37] focus:ring-[#D4AF37] border-gray-300 rounded" />
                            <span className="ml-2 text-sm text-gray-500">Yes</span>
                          </div>
                        ) : (
                          <input id={key} type={config.type === 'date' ? 'date' : config.type === 'number' ? 'number' : 'text'}
                            required={config.required} maxLength={config.maxLength} minLength={config.minLength}
                            value={formData[key] || ''} onChange={e => handleDynamicChange(key, e.target.value)}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-6">
              <button type="submit" disabled={submitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-[#0A192F] bg-[#D4AF37] hover:bg-[#B3932E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting
                  ? 'Submitting...'
                  : hasFee
                    ? `Submit & Pay ${formConfig.currency} ${Number(formConfig.applicationFee).toLocaleString()}`
                    : 'Submit Application'}
              </button>
              <p className="mt-3 text-center text-xs text-gray-500">
                By submitting this application, you agree to the institution&apos;s admission policies.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
