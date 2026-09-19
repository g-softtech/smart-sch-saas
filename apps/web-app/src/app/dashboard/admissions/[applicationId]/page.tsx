"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api-client';

interface WorkflowStage {
  key: string;
  label: string;
  type: string;
}

interface Application {
  id: string;
  status: string;
  currentStageKey: string | null;
  formData: Record<string, unknown>;
  createdAt: string;
  applicant: {
    firstName: string;
    lastName: string;
    gender?: string;
    dateOfBirth?: string;
  };
  publishedForm: {
    title: string;
    workflowStages: WorkflowStage[];
  };
}

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
      await apiClient.post(`api/v1/admissions/applications/${applicationId}/reviews`, {
        decision,
        comments
      });
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading application...</div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="rounded-md bg-red-50 p-4 border border-red-200">
        <h3 className="text-sm font-medium text-red-800">Error</h3>
        <div className="mt-2 text-sm text-red-700">{error}</div>
        <button onClick={() => router.back()} className="mt-4 text-sm font-medium text-red-800 underline">Go Back</button>
      </div>
    );
  }

  const { applicant, publishedForm, formData, status, currentStageKey } = application;

  const currentStageLabel = currentStageKey 
    ? publishedForm.workflowStages?.find(s => s.key === currentStageKey)?.label || currentStageKey
    : 'None';

  const isSubmitted = status === 'SUBMITTED';
  const isUnderReview = status === 'UNDER_REVIEW';
  const isApproved = status === 'APPROVED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <button onClick={() => router.push('/dashboard/admissions')} className="text-sm text-indigo-600 hover:text-indigo-900 mb-2 flex items-center">
            &larr; Back to Admissions
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {applicant.firstName} {applicant.lastName}
          </h1>
          <p className="text-sm text-gray-500">
            Application for: <span className="font-medium text-gray-900">{publishedForm.title}</span>
          </p>
        </div>
        <div className="mt-4 flex sm:mt-0 sm:ml-4 space-x-3">
          {isSubmitted && (
            <button
              onClick={handleStartReview}
              disabled={actionLoading}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {actionLoading ? 'Starting...' : 'Start Review'}
            </button>
          )}
          {isUnderReview && (
            <button
              onClick={() => setIsReviewModalOpen(true)}
              disabled={actionLoading}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
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
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <h3 className="text-sm font-medium text-red-800">Action Failed</h3>
          <div className="mt-2 text-sm text-red-700">{actionError}</div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Applicant & Form Data */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Applicant Details</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">First Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{applicant.firstName}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Last Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{applicant.lastName}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Gender</dt>
                  <dd className="mt-1 text-sm text-gray-900">{applicant.gender || 'Not specified'}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {applicant.dateOfBirth ? new Date(applicant.dateOfBirth).toLocaleDateString() : 'Not specified'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Submitted Form Data</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                {Object.entries(formData || {}).map(([key, value]) => (
                  <div key={key} className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {/* Right Column: Status & Timeline */}
        <div className="space-y-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Application Status</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6 space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                    ${status === 'APPROVED' ? 'bg-green-100 text-green-800' : ''}
                    ${status === 'REJECTED' ? 'bg-red-100 text-red-800' : ''}
                    ${status === 'WAITLISTED' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${status === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-800' : ''}
                    ${status === 'SUBMITTED' ? 'bg-gray-100 text-gray-800' : ''}
                    ${status === 'ENROLLED' ? 'bg-purple-100 text-purple-800' : ''}
                  `}>
                    {status.replace('_', ' ').toLowerCase()}
                  </span>
                </dd>
              </div>
              
              {isUnderReview && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Current Stage</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-medium">
                    {currentStageLabel}
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-medium text-gray-500">Submitted On</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(application.createdAt).toLocaleString()}
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Submit Decision: {currentStageLabel}</h3>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="px-6 py-4">
              <form id="reviewForm" onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label htmlFor="decision" className="block text-sm font-medium text-gray-700">Decision</label>
                  <select
                    id="decision"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border"
                    value={decision}
                    onChange={(e) => setDecision(e.target.value as 'STAGE_PASS' | 'STAGE_FAIL' | 'WAITLIST')}
                  >
                    <option value="STAGE_PASS">Pass (Move to Next Stage / Approve)</option>
                    <option value="STAGE_FAIL">Fail (Reject Application)</option>
                    <option value="WAITLIST">Waitlist</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="comments" className="block text-sm font-medium text-gray-700">Comments (Optional)</label>
                  <textarea
                    id="comments"
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                  />
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="reviewForm"
                disabled={actionLoading}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {actionLoading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
