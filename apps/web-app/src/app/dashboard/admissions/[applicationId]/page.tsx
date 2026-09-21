"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api-client';

interface WorkflowStage {
  key: string;
  label: string;
}

interface PaymentInfo {
  status: string;
  amount: number | string;
  currency: string;
  reference?: string;
  createdAt: string;
}

interface ExamInfo {
  examDate: string;
  venue: string;
  score: number | null;
  status: string;
}

interface Application {
  id: string;
  status: string;
  currentStageKey: string | null;
  trackingToken: string;
  formData: Record<string, unknown>;
  createdAt: string;
  applicant: {
    firstName: string;
    lastName: string;
    email?: string;
    gender?: string;
    dateOfBirth?: string;
  };
  publishedForm: {
    title: string;
    workflowStages: WorkflowStage[];
    applicationFee?: number | string;
    currency?: string;
  };
  payments?: PaymentInfo[];
  exam?: ExamInfo | null;
}

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  WAITLISTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  ENROLLED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  PENDING_PAYMENT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const EXAM_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  ABSENT: 'Absent',
  CANCELLED: 'Cancelled',
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.applicationId as string;

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [decision, setDecision] = useState<'STAGE_PASS' | 'STAGE_FAIL' | 'WAITLIST'>('STAGE_PASS');
  const [comments, setComments] = useState('');

  // Exam Modal State
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examDate, setExamDate] = useState('');
  const [examVenue, setExamVenue] = useState('');
  const [examLoading, setExamLoading] = useState(false);
  const [examError, setExamError] = useState<string | null>(null);

  // Update Exam State
  const [isUpdateExamModalOpen, setIsUpdateExamModalOpen] = useState(false);
  const [updateExamScore, setUpdateExamScore] = useState('');
  const [updateExamStatus, setUpdateExamStatus] = useState('');
  const [updateExamLoading, setUpdateExamLoading] = useState(false);
  const [updateExamError, setUpdateExamError] = useState<string | null>(null);

  const fetchApplication = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`api/v1/admissions/applications/${applicationId}`);
      if (res) {
        setApplication(res);
      } else {
        setError('Application not found');
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 404) setError('Application not found.');
        else if (err.status === 401) setError('Unauthorized.');
        else if (err.status === 403) setError('You do not have permission to view this application.');
        else setError(err.message || 'Failed to load application');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchApplication();
  }, [fetchApplication]);

  const handleStartReview = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await apiClient.post(`api/v1/admissions/applications/${applicationId}/start-review`);
      await fetchApplication();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to start review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await apiClient.post(`api/v1/admissions/applications/${applicationId}/reviews`, { decision, comments });
      setIsReviewModalOpen(false);
      setDecision('STAGE_PASS');
      setComments('');
      await fetchApplication();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to submit review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!confirm('Are you sure you want to enroll this applicant as a student? This action cannot be undone.')) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await apiClient.post(`api/v1/admissions/applications/${applicationId}/enroll`);
      await fetchApplication();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to enroll student.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setExamLoading(true);
    setExamError(null);
    try {
      await apiClient.post(`api/v1/admissions/applications/${applicationId}/exam`, {
        examDate,
        venue: examVenue,
      });
      setIsExamModalOpen(false);
      setExamDate('');
      setExamVenue('');
      await fetchApplication();
    } catch (err: unknown) {
      setExamError(err instanceof Error ? err.message : 'Failed to schedule exam.');
    } finally {
      setExamLoading(false);
    }
  };

  const openUpdateExamModal = () => {
    if (application?.exam) {
      setUpdateExamScore(application.exam.score !== null ? String(application.exam.score) : '');
      setUpdateExamStatus(application.exam.status);
    }
    setUpdateExamError(null);
    setIsUpdateExamModalOpen(true);
  };

  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateExamLoading(true);
    setUpdateExamError(null);
    try {
      const payload: Record<string, unknown> = { status: updateExamStatus };
      if (updateExamScore.trim() !== '') {
        payload.score = parseFloat(updateExamScore);
      }
      await apiClient.post(`api/v1/admissions/applications/${applicationId}/exam/update`, payload);
      setIsUpdateExamModalOpen(false);
      await fetchApplication();
    } catch (err: unknown) {
      setUpdateExamError(err instanceof Error ? err.message : 'Failed to update exam.');
    } finally {
      setUpdateExamLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading application...</span>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
        <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
        <div className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</div>
        <button onClick={() => router.back()} className="mt-4 text-sm font-medium text-red-800 dark:text-red-400 underline">Go Back</button>
      </div>
    );
  }

  const { applicant, publishedForm, formData, status, currentStageKey, trackingToken } = application;
  const currentStageLabel = currentStageKey
    ? publishedForm.workflowStages?.find(s => s.key === currentStageKey)?.label ?? currentStageKey
    : null;

  const isSubmitted = status === 'SUBMITTED';
  const isUnderReview = status === 'UNDER_REVIEW';
  const isApproved = status === 'APPROVED';
  const canScheduleExam = (isSubmitted || isUnderReview) && !application.exam;
  const latestPayment = application.payments?.[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <button
            onClick={() => router.push('/dashboard/admissions')}
            className="text-sm text-brand-gold hover:text-yellow-600 mb-2 flex items-center gap-1"
          >
            ← Back to Admissions
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy dark:text-brand-offwhite">
            {applicant.firstName} {applicant.lastName}
          </h1>
          <p className="text-sm text-gray-500 dark:text-brand-gray-text">
            Application for: <span className="font-medium text-gray-900 dark:text-brand-offwhite">{publishedForm.title}</span>
          </p>
        </div>
        <div className="mt-4 flex sm:mt-0 sm:ml-4 space-x-3 flex-wrap gap-2">
          {canScheduleExam && (
            <button
              onClick={() => setIsExamModalOpen(true)}
              className="inline-flex items-center justify-center rounded-md border border-teal-600 dark:border-teal-500 text-teal-600 dark:text-teal-400 px-4 py-2 text-sm font-medium shadow-sm hover:bg-teal-50 dark:hover:bg-teal-900/20"
            >
              Schedule Exam
            </button>
          )}
          {isSubmitted && (
            <button
              onClick={handleStartReview}
              disabled={actionLoading}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-navy dark:bg-brand-gold px-4 py-2 text-sm font-medium text-white dark:text-brand-navy shadow-sm hover:bg-brand-navy/80 dark:hover:bg-yellow-500 disabled:opacity-50"
            >
              {actionLoading ? 'Starting...' : 'Start Review'}
            </button>
          )}
          {isUnderReview && (
            <button
              onClick={() => setIsReviewModalOpen(true)}
              disabled={actionLoading}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-navy dark:bg-brand-gold px-4 py-2 text-sm font-medium text-white dark:text-brand-navy shadow-sm hover:bg-brand-navy/80 dark:hover:bg-yellow-500 disabled:opacity-50"
            >
              Submit Decision
            </button>
          )}
          {isApproved && (
            <button
              onClick={handleEnroll}
              disabled={actionLoading}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? 'Enrolling...' : 'Enroll Student'}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Action Failed</h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-400">{actionError}</div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Applicant Details */}
          <div className="bg-white dark:bg-brand-navy-surface shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-brand-border-dark">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-semibold text-gray-900 dark:text-brand-offwhite">Applicant Details</h3>
            </div>
            <div className="border-t border-gray-200 dark:border-brand-border-dark px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">First Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-brand-offwhite">{applicant.firstName}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-brand-offwhite">{applicant.lastName}</dd>
                </div>
                {applicant.email && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-brand-offwhite">{applicant.email}</dd>
                  </div>
                )}
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Gender</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-brand-offwhite">{applicant.gender || 'Not specified'}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-brand-offwhite">
                    {applicant.dateOfBirth ? new Date(applicant.dateOfBirth).toLocaleDateString() : 'Not specified'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Submitted Form Data */}
          {Object.keys(formData || {}).length > 0 && (
            <div className="bg-white dark:bg-brand-navy-surface shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-brand-border-dark">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-semibold text-gray-900 dark:text-brand-offwhite">Submitted Form Data</h3>
              </div>
              <div className="border-t border-gray-200 dark:border-brand-border-dark px-4 py-5 sm:px-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  {Object.entries(formData || {}).map(([key, value]) => (
                    <div key={key} className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-brand-offwhite">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}

          {/* Exam Details */}
          <div className="bg-white dark:bg-brand-navy-surface shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-brand-border-dark">
            <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
              <h3 className="text-lg leading-6 font-semibold text-gray-900 dark:text-brand-offwhite">Entrance Exam</h3>
              {application.exam && (
                <button
                  onClick={openUpdateExamModal}
                  className="text-xs font-medium text-brand-gold hover:text-yellow-600 border border-brand-gold/40 px-2 py-1 rounded"
                >
                  Update Exam
                </button>
              )}
            </div>
            <div className="border-t border-gray-200 dark:border-brand-border-dark px-4 py-5 sm:px-6">
              {application.exam ? (
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Exam Date</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-brand-offwhite">
                      {new Date(application.exam.examDate).toLocaleString()}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Venue</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-brand-offwhite">{application.exam.venue}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${application.exam.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}
                        ${application.exam.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : ''}
                        ${application.exam.status === 'ABSENT' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : ''}
                        ${application.exam.status === 'CANCELLED' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' : ''}
                      `}>
                        {EXAM_STATUS_LABELS[application.exam.status] ?? application.exam.status}
                      </span>
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Score</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-brand-offwhite">
                      {application.exam.score !== null ? (
                        <span className="font-semibold text-brand-gold">{application.exam.score}</span>
                      ) : (
                        <span className="text-gray-400 italic">Not recorded</span>
                      )}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="text-center py-6">
                  <svg className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No exam scheduled yet.</p>
                  {canScheduleExam && (
                    <button
                      onClick={() => setIsExamModalOpen(true)}
                      className="mt-3 inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-teal-600 dark:text-teal-400 border border-teal-600/30 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                    >
                      Schedule Entrance Exam
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Application Status */}
          <div className="bg-white dark:bg-brand-navy-surface shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-brand-border-dark">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-semibold text-gray-900 dark:text-brand-offwhite">Application Status</h3>
            </div>
            <div className="border-t border-gray-200 dark:border-brand-border-dark px-4 py-5 sm:px-6 space-y-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Status</dt>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {status.replace(/_/g, ' ')}
                </span>
              </div>

              {isUnderReview && currentStageLabel && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Current Stage</dt>
                  <dd className="text-sm text-gray-900 dark:text-brand-offwhite font-medium">{currentStageLabel}</dd>
                </div>
              )}

              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Submitted On</dt>
                <dd className="text-sm text-gray-900 dark:text-brand-offwhite">{new Date(application.createdAt).toLocaleString()}</dd>
              </div>

              {trackingToken && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Tracking Token</dt>
                  <code className="text-xs font-mono text-brand-gold break-all">{trackingToken}</code>
                </div>
              )}
            </div>
          </div>

          {/* Payment Status */}
          {latestPayment && (
            <div className="bg-white dark:bg-brand-navy-surface shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-brand-border-dark">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-semibold text-gray-900 dark:text-brand-offwhite">Payment</h3>
              </div>
              <div className="border-t border-gray-200 dark:border-brand-border-dark px-4 py-5 sm:px-6 space-y-3">
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Status</dt>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${latestPayment.status === 'SUCCESS' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                    {latestPayment.status}
                  </span>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Amount</dt>
                  <dd className="text-sm text-gray-900 dark:text-brand-offwhite font-medium">
                    {latestPayment.currency} {Number(latestPayment.amount).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Date</dt>
                  <dd className="text-sm text-gray-900 dark:text-brand-offwhite">{new Date(latestPayment.createdAt).toLocaleString()}</dd>
                </div>
              </div>
            </div>
          )}

          {/* Workflow Stages */}
          {publishedForm.workflowStages?.length > 0 && (
            <div className="bg-white dark:bg-brand-navy-surface shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-brand-border-dark">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-semibold text-gray-900 dark:text-brand-offwhite">Review Stages</h3>
              </div>
              <div className="border-t border-gray-200 dark:border-brand-border-dark">
                <ul className="divide-y divide-gray-200 dark:divide-brand-border-dark">
                  {publishedForm.workflowStages.map((stage, index) => {
                    const isCurrentStage = stage.key === currentStageKey;
                    return (
                      <li key={stage.key} className="px-4 py-3 flex items-center gap-3">
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${isCurrentStage ? 'bg-brand-gold text-brand-navy' : 'bg-gray-100 dark:bg-brand-navy text-gray-500 dark:text-gray-400'}`}>
                          {index + 1}
                        </span>
                        <span className={`text-sm ${isCurrentStage ? 'font-semibold text-brand-navy dark:text-brand-offwhite' : 'text-gray-500 dark:text-gray-400'}`}>
                          {stage.label || stage.key}
                        </span>
                        {isCurrentStage && (
                          <span className="ml-auto text-xs text-brand-gold font-medium">Active</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Exam Modal */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-brand-navy-surface rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-brand-border-dark">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-brand-border-dark flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-offwhite">Schedule Entrance Exam</h3>
              <button onClick={() => setIsExamModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <form id="scheduleExamForm" onSubmit={handleScheduleExam} className="space-y-4">
                {examError && (
                  <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                    {examError}
                  </div>
                )}
                <div>
                  <label htmlFor="examDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Exam Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    id="examDate"
                    required
                    value={examDate}
                    onChange={e => setExamDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm py-2 px-3 border dark:bg-brand-navy dark:text-brand-offwhite"
                  />
                </div>
                <div>
                  <label htmlFor="examVenue" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Venue <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="examVenue"
                    required
                    value={examVenue}
                    onChange={e => setExamVenue(e.target.value)}
                    placeholder="e.g., Main Hall, Room 101"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm py-2 px-3 border dark:bg-brand-navy dark:text-brand-offwhite"
                  />
                </div>
              </form>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-brand-navy border-t border-gray-200 dark:border-brand-border-dark rounded-b-xl flex justify-end space-x-3">
              <button type="button" onClick={() => setIsExamModalOpen(false)} className="rounded-md border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy-surface px-4 py-2 text-sm font-medium text-gray-700 dark:text-brand-offwhite shadow-sm hover:bg-gray-50 dark:hover:bg-brand-navy">
                Cancel
              </button>
              <button type="submit" form="scheduleExamForm" disabled={examLoading} className="inline-flex justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 disabled:opacity-50">
                {examLoading ? 'Scheduling...' : 'Schedule Exam'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Exam Modal */}
      {isUpdateExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-brand-navy-surface rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-brand-border-dark">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-brand-border-dark flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-offwhite">Update Exam Details</h3>
              <button onClick={() => setIsUpdateExamModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <form id="updateExamForm" onSubmit={handleUpdateExam} className="space-y-4">
                {updateExamError && (
                  <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                    {updateExamError}
                  </div>
                )}
                <div>
                  <label htmlFor="examStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <select
                    id="examStatus"
                    required
                    value={updateExamStatus}
                    onChange={e => setUpdateExamStatus(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm py-2 px-3 border bg-white dark:bg-brand-navy dark:text-brand-offwhite"
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ABSENT">Absent</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="examScore" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Score</label>
                  <input
                    type="number"
                    id="examScore"
                    step="0.01"
                    min="0"
                    value={updateExamScore}
                    onChange={e => setUpdateExamScore(e.target.value)}
                    placeholder="Leave blank if not yet scored"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm py-2 px-3 border dark:bg-brand-navy dark:text-brand-offwhite"
                  />
                </div>
              </form>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-brand-navy border-t border-gray-200 dark:border-brand-border-dark rounded-b-xl flex justify-end space-x-3">
              <button type="button" onClick={() => setIsUpdateExamModalOpen(false)} className="rounded-md border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy-surface px-4 py-2 text-sm font-medium text-gray-700 dark:text-brand-offwhite shadow-sm hover:bg-gray-50 dark:hover:bg-brand-navy">
                Cancel
              </button>
              <button type="submit" form="updateExamForm" disabled={updateExamLoading} className="inline-flex justify-center rounded-md bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-yellow-500 disabled:opacity-50">
                {updateExamLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-brand-navy-surface rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-brand-border-dark">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-brand-border-dark flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-offwhite">
                Submit Decision: {currentStageLabel ?? 'Current Stage'}
              </h3>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <form id="reviewForm" onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label htmlFor="decision" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Decision</label>
                  <select
                    id="decision"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm py-2 px-3 border bg-white dark:bg-brand-navy dark:text-brand-offwhite"
                    value={decision}
                    onChange={(e) => setDecision(e.target.value as 'STAGE_PASS' | 'STAGE_FAIL' | 'WAITLIST')}
                  >
                    <option value="STAGE_PASS">Pass (Move to Next Stage / Approve)</option>
                    <option value="STAGE_FAIL">Fail (Reject Application)</option>
                    <option value="WAITLIST">Waitlist</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="comments" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Comments (Optional)</label>
                  <textarea
                    id="comments"
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm py-2 px-3 border dark:bg-brand-navy dark:text-brand-offwhite"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </div>
              </form>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-brand-navy border-t border-gray-200 dark:border-brand-border-dark rounded-b-xl flex justify-end space-x-3">
              <button type="button" onClick={() => setIsReviewModalOpen(false)} className="rounded-md border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy-surface px-4 py-2 text-sm font-medium text-gray-700 dark:text-brand-offwhite shadow-sm hover:bg-gray-50 dark:hover:bg-brand-navy">
                Cancel
              </button>
              <button type="submit" form="reviewForm" disabled={actionLoading} className="inline-flex justify-center rounded-md bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-yellow-500 disabled:opacity-50">
                {actionLoading ? 'Submitting...' : 'Submit Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
