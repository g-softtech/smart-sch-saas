"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';

const TAKE = 50;

interface AttendanceRecord {
  id: string;
  studentId: string;
  enrollmentId: string;
  status: string;
  reason: string | null;
  notes: string | null;
}

interface AttendanceRegister {
  id: string;
  academicYearId: string;
  termId: string;
  classId: string;
  armId: string | null;
  date: string;
  isFinalized: boolean;
  records?: AttendanceRecord[];
}

export default function AttendancePage() {
  const [data, setData] = useState<AttendanceRegister[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchRegisters = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);

    try {
      const skip = page * TAKE;
      const endpoint = `api/v1/attendance/registers?skip=${skip}&take=${TAKE}`;
      const response = await apiClient.get(endpoint);
      
      const fetchedData = Array.isArray(response) ? response : [];
      
      setData(fetchedData);
      setPageIndex(page);
      setHasMore(fetchedData.length === TAKE);
      setInitialized(true);
    } catch (err: unknown) {
      let errorMessage = 'Failed to load attendance registers.';
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
      fetchRegisters(0);
    }
  }, [initialized, loading, fetchRegisters]);

  const handleNext = () => {
    if (hasMore) {
      fetchRegisters(pageIndex + 1);
    }
  };

  const handlePrev = () => {
    if (pageIndex > 0) {
      fetchRegisters(pageIndex - 1);
    }
  };

  const columns: Column<AttendanceRegister>[] = [
    { header: 'ID', accessor: 'id' },
    { 
      header: 'Date', 
      accessor: (item) => {
        try {
          const d = new Date(item.date);
          if (isNaN(d.getTime())) return item.date;
          return d.toLocaleDateString(undefined, { timeZone: 'UTC' });
        } catch {
          return item.date;
        }
      } 
    },
    { header: 'Class ID', accessor: 'classId' },
    { header: 'Term ID', accessor: 'termId' },
    { 
      header: 'Status', 
      accessor: (item) => item.isFinalized ? 'Finalized' : 'Draft' 
    },
    { 
      header: 'Records', 
      accessor: (item) => item.records ? item.records.length.toString() : '0' 
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Attendance</h1>
        <p className="text-sm text-gray-500">View attendance registers (read-only verification).</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          <button
            className="whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium border-indigo-500 text-indigo-600"
            aria-current="page"
          >
            Attendance Registers
          </button>
        </nav>
      </div>

      {error ? (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading attendance</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <DataTable
          data={data}
          columns={columns}
          loading={loading}
          onNext={handleNext}
          onPrev={handlePrev}
          hasMore={hasMore}
          pageIndex={pageIndex}
          emptyMessage="No attendance registers found in this workspace."
        />
      )}
    </div>
  );
}
