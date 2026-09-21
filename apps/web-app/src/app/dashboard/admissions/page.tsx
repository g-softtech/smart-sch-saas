"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient, ApiError } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';

interface Application {
  id: string;
  status: string;
  applicant: {
    firstName: string;
    lastName: string;
  };
  payments?: Array<{ status: string }>;
  exam?: { status: string } | null;
}

interface AcademicYear {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
}

const PAYSTACK_CURRENCIES = [
  { value: 'NGN', label: 'NGN — Nigerian Naira' },
  { value: 'GHS', label: 'GHS — Ghanaian Cedi' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'ZAR', label: 'ZAR — South African Rand' },
];

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  WAITLISTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  ENROLLED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  PENDING_PAYMENT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export default function AdmissionsPage() {
  const [data, setData] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Publish Form Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [academicsLoading, setAcademicsLoading] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [applicationFee, setApplicationFee] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('api/v1/admissions/applications');
      setData(Array.isArray(response) ? response : []);
      setInitialized(true);
    } catch (err: unknown) {
      setError(err instanceof ApiError && err.status === 403 ? 'You do not have permission to view this data.' : (err instanceof Error ? err.message : 'Failed to load applications.'));
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized && !loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchApplications();
    }
  }, [initialized, loading, fetchApplications]);

  const openPublishModal = async () => {
    setIsPublishModalOpen(true);
    setPublishedUrl(null);
    setFormTitle('');
    setSelectedYear('');
    setSelectedClass('');
    setApplicationFee('');
    setCurrency('NGN');
    setPublishError(null);

    if (academicYears.length === 0 || classes.length === 0) {
      setAcademicsLoading(true);
      try {
        const [years, cls] = await Promise.all([
          apiClient.get('api/v1/academics/academic-years'),
          apiClient.get('api/v1/academics/classes')
        ]);
        setAcademicYears(Array.isArray(years) ? years : []);
        setClasses(Array.isArray(cls) ? cls : []);
      } catch {
        setPublishError('Failed to load academic years and classes.');
      } finally {
        setAcademicsLoading(false);
      }
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishLoading(true);
    setPublishError(null);
    try {
      const fieldsSchema = {
        previousSchool: { type: 'string', label: 'Previous School', required: false },
        allergies: { type: 'string', label: 'Allergies / Medical Conditions', required: false },
        guardianName: { type: 'string', label: 'Primary Guardian Name', required: true },
        guardianPhone: { type: 'string', label: 'Guardian Phone Number', required: true },
        guardianEmail: { type: 'string', label: 'Guardian Email', required: true }
      };

      const workflowStages = [
        { key: 'INITIAL_REVIEW', label: 'Initial Review' },
        { key: 'INTERVIEW', label: 'Interview' },
        { key: 'FINAL_DECISION', label: 'Final Decision' }
      ];

      const feeValue = applicationFee.trim() !== '' ? parseFloat(applicationFee) : undefined;

      const res = await apiClient.post('api/v1/admissions/forms/publish', {
        title: formTitle,
        academicYearId: selectedYear,
        targetClassId: selectedClass,
        fieldsSchema,
        workflowStages,
        ...(feeValue !== undefined && feeValue > 0 ? { applicationFee: feeValue, currency } : {}),
      });

      const form = res as { publicToken?: string };
      if (form && form.publicToken) {
        setPublishedUrl(`${window.location.origin}/admissions/${form.publicToken}`);
      } else {
        throw new Error('Failed to retrieve public token from response.');
      }
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : 'Failed to publish form.');
    } finally {
      setPublishLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
      alert('Link copied to clipboard!');
    }
  };

  const columns: Column<Application>[] = [
    {
      header: 'Applicant Name',
      accessor: (item) => `${item.applicant?.firstName || ''} ${item.applicant?.lastName || ''}`.trim() || 'Unknown Applicant'
    },
    {
      header: 'Status',
      accessor: (item) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[item.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {item.status.replace(/_/g, ' ')}
        </span>
      )
    },
    {
      header: 'Payment',
      accessor: (item) => {
        const payment = item.payments?.[0];
        if (!payment) return <span className="text-xs text-gray-400">—</span>;
        const cls = payment.status === 'SUCCESS'
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
        return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{payment.status}</span>;
      },
      hideOnMobile: true,
    },
    {
      header: 'Actions',
      accessor: (item) => (
        <Link href={`/dashboard/admissions/${item.id}`} className="text-brand-gold hover:text-yellow-500 font-medium text-sm">
          Review
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy dark:text-brand-offwhite">Admissions</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-brand-gray-text">
            Manage admission applications and publish new admission forms.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none space-x-3">
          <Link
            href="/dashboard/admissions/board"
            className="inline-flex items-center justify-center rounded-md bg-white dark:bg-brand-navy-surface px-3 py-2 text-sm font-semibold text-brand-navy dark:text-brand-offwhite shadow-sm ring-1 ring-inset ring-brand-navy dark:ring-brand-border-dark hover:bg-gray-50 dark:hover:bg-brand-navy"
          >
            Review Board
          </Link>
          <button
            type="button"
            onClick={openPublishModal}
            className="block rounded-md bg-brand-gold px-3 py-2 text-center text-sm font-semibold text-brand-navy shadow-sm hover:bg-yellow-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
          >
            Publish New Form
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-brand-border-dark">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          <button className="whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium border-brand-gold text-brand-navy dark:text-brand-offwhite" aria-current="page">
            Applications
          </button>
        </nav>
      </div>

      {error ? (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error loading applications</h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-400"><p>{error}</p></div>
        </div>
      ) : (
        <DataTable
          data={data}
          columns={columns}
          loading={loading}
          emptyMessage="No applications found in this workspace."
          disablePagination={true}
        />
      )}

      {/* Publish Form Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-brand-navy-surface rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] border border-gray-200 dark:border-brand-border-dark">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-brand-border-dark flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-navy dark:text-brand-offwhite">Publish Admissions Form</h3>
              <button onClick={() => setIsPublishModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto">
              {publishedUrl ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Form Published Successfully!</h3>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-400">Share the link below with applicants.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Public URL</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        readOnly
                        value={publishedUrl}
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md sm:text-sm border border-gray-300 dark:border-brand-border-dark bg-gray-50 dark:bg-brand-navy text-gray-500 dark:text-gray-400"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 dark:border-brand-border-dark rounded-r-md bg-gray-50 dark:bg-brand-navy-surface text-sm font-medium text-brand-gold hover:bg-gray-100 dark:hover:bg-brand-navy"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <form id="publishForm" onSubmit={handlePublish} className="space-y-4">
                  {publishError && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                      {publishError}
                    </div>
                  )}

                  <div>
                    <label htmlFor="formTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Form Title</label>
                    <input
                      type="text"
                      id="formTitle"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm py-2 px-3 border dark:bg-brand-navy dark:text-brand-offwhite"
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      placeholder="e.g., 2026-2027 Grade 1 Admissions"
                    />
                  </div>

                  <div>
                    <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Academic Year</label>
                    <select
                      id="academicYear"
                      required
                      disabled={academicsLoading}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm py-2 px-3 border bg-white dark:bg-brand-navy dark:text-brand-offwhite"
                      value={selectedYear}
                      onChange={e => setSelectedYear(e.target.value)}
                    >
                      <option value="">Select an academic year</option>
                      {academicYears.map(ay => (
                        <option key={ay.id} value={ay.id}>{ay.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="targetClass" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Class</label>
                    <select
                      id="targetClass"
                      required
                      disabled={academicsLoading || classes.length === 0}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm py-2 px-3 border bg-white dark:bg-brand-navy dark:text-brand-offwhite"
                      value={selectedClass}
                      onChange={e => setSelectedClass(e.target.value)}
                    >
                      <option value="">Select a target class</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Configuration */}
                  <div className="border-t border-gray-200 dark:border-brand-border-dark pt-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Application Fee (Optional)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="applicationFee" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
                        <input
                          type="number"
                          id="applicationFee"
                          min="0"
                          step="0.01"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm py-2 px-3 border dark:bg-brand-navy dark:text-brand-offwhite"
                          value={applicationFee}
                          onChange={e => setApplicationFee(e.target.value)}
                          placeholder="0.00"
                        />
                        <p className="mt-1 text-xs text-gray-400">Leave blank or 0 for free.</p>
                      </div>
                      <div>
                        <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                        <select
                          id="currency"
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm py-2 px-3 border bg-white dark:bg-brand-navy dark:text-brand-offwhite"
                          value={currency}
                          onChange={e => setCurrency(e.target.value)}
                        >
                          {PAYSTACK_CURRENCIES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-brand-navy border-t border-gray-200 dark:border-brand-border-dark rounded-b-xl flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="rounded-md border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy-surface px-4 py-2 text-sm font-medium text-gray-700 dark:text-brand-offwhite shadow-sm hover:bg-gray-50 dark:hover:bg-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2"
              >
                {publishedUrl ? 'Close' : 'Cancel'}
              </button>
              {!publishedUrl && (
                <button
                  type="submit"
                  form="publishForm"
                  disabled={publishLoading || academicsLoading}
                  className="inline-flex justify-center rounded-md border border-transparent bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 disabled:opacity-50"
                >
                  {publishLoading ? 'Publishing...' : 'Publish'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
