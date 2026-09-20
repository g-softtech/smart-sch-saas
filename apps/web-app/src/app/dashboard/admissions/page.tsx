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
}

interface AcademicYear {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
}

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
        { key: 'INITIAL_REVIEW', label: 'Initial Review', type: 'DOCUMENT_VERIFICATION' },
        { key: 'INTERVIEW', label: 'Interview', type: 'INTERVIEW' },
        { key: 'FINAL_DECISION', label: 'Final Decision', type: 'APPROVAL' }
      ];

      const res = await apiClient.post('api/v1/admissions/forms/publish', {
        title: formTitle,
        academicYearId: selectedYear,
        targetClassId: selectedClass,
        fieldsSchema,
        workflowStages
      });

      if (res && res.publicToken) {
        setPublishedUrl(`${window.location.origin}/admissions/${res.publicToken}`);
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
    { header: 'ID', accessor: 'id', hideOnMobile: true },
    { 
      header: 'Applicant Name', 
      accessor: (item) => `${item.applicant?.firstName || ''} ${item.applicant?.lastName || ''}`.trim() || 'Unknown Applicant'
    },
    { header: 'Status', accessor: 'status' },
    {
      header: 'Actions',
      accessor: (item) => (
        <Link href={`/dashboard/admissions/${item.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium text-sm">
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
              className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-navy shadow-sm ring-1 ring-inset ring-brand-navy hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
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

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          <button className="whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium border-indigo-500 text-indigo-600" aria-current="page">
            Applications
          </button>
        </nav>
      </div>

      {error ? (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading applications</h3>
              <div className="mt-2 text-sm text-red-700"><p>{error}</p></div>
            </div>
          </div>
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Publish Admissions Form</h3>
              <button onClick={() => setIsPublishModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="px-6 py-4 overflow-y-auto">
              {publishedUrl ? (
                <div className="space-y-4">
                  <div className="rounded-md bg-green-50 p-4 border border-green-200">
                    <h3 className="text-sm font-medium text-green-800">Form Published Successfully!</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Public URL</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        readOnly
                        value={publishedUrl}
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md sm:text-sm border-gray-300 bg-gray-50 text-gray-500"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-sm font-medium text-indigo-600 hover:bg-gray-100"
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <form id="publishForm" onSubmit={handlePublish} className="space-y-4">
                  {publishError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                      {publishError}
                    </div>
                  )}
                  
                  <div>
                    <label htmlFor="formTitle" className="block text-sm font-medium text-gray-700">Form Title</label>
                    <input
                      type="text"
                      id="formTitle"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border"
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      placeholder="e.g., 2026-2027 Grade 1 Admissions"
                    />
                  </div>

                  <div>
                    <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700">Academic Year</label>
                    <select
                      id="academicYear"
                      required
                      disabled={academicsLoading}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border bg-white"
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
                    <label htmlFor="targetClass" className="block text-sm font-medium text-gray-700">Target Class</label>
                    <select
                      id="targetClass"
                      required
                      disabled={academicsLoading || classes.length === 0}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border bg-white"
                      value={selectedClass}
                      onChange={e => setSelectedClass(e.target.value)}
                    >
                      <option value="">Select a target class</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </form>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {publishedUrl ? 'Close' : 'Cancel'}
              </button>
              {!publishedUrl && (
                <button
                  type="submit"
                  form="publishForm"
                  disabled={publishLoading || academicsLoading}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
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
