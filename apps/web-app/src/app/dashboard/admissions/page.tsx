"use client";

import { useState, useEffect, useCallback } from 'react';
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

export default function AdmissionsPage() {
  const [data, setData] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('api/v1/admissions/applications');
      const fetchedData = Array.isArray(response) ? response : [];
      
      setData(fetchedData);
      setInitialized(true);
    } catch (err: unknown) {
      let errorMessage = 'Failed to load applications.';
      if (err instanceof ApiError) {
        if (err.status === 403) {
          errorMessage = 'You do not have permission to view this data.';
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
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

  const columns: Column<Application>[] = [
    { header: 'ID', accessor: 'id' },
    { 
      header: 'Applicant Name', 
      accessor: (item) => {
        const first = item.applicant?.firstName || '';
        const last = item.applicant?.lastName || '';
        return `${first} ${last}`.trim() || 'Unknown Applicant';
      }
    },
    { header: 'Status', accessor: 'status' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Admissions</h1>
        <p className="text-sm text-gray-500">View admission applications (read-only verification).</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          <button
            className="whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium border-indigo-500 text-indigo-600"
            aria-current="page"
          >
            Applications
          </button>
        </nav>
      </div>

      {error ? (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading applications</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <DataTable
          data={data}
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          loading={loading}
          emptyMessage="No applications found in this workspace."
          disablePagination={true}
        />
      )}
    </div>
  );
}
