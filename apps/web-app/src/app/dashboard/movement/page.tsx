"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';
import Link from 'next/link';

const TAKE = 50;

interface StudentRef {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  status: string;
}

interface AuthorizedPersonRef {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

interface ArrivalRecord {
  id: string;
  studentId: string;
  operationalDate: string;
  timestamp: string;
  scannedById: string;
  source: string;
  student: StudentRef;
}

interface DepartureRecord {
  id: string;
  studentId: string;
  operationalDate: string;
  timestamp: string;
  scannedById: string;
  source: string;
  authorizedPersonId: string;
  authorizationId: string;
  credentialId: string;
  student: StudentRef;
  authorizedPerson: AuthorizedPersonRef;
  authorization?: {
    id: string;
    status: string;
  };
}

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function MovementHistoryContent() {
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get('studentId') || '';

  const [activeTab, setActiveTab] = useState<'arrivals' | 'departures'>('arrivals');
  
  const [arrivals, setArrivals] = useState<ArrivalRecord[]>([]);
  const [departures, setDepartures] = useState<DepartureRecord[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [studentId, setStudentId] = useState<string>(initialStudentId);

  const fetchHistory = useCallback(async (page: number, currentTab: 'arrivals' | 'departures') => {
    setLoading(true);
    setError(null);

    try {
      const skip = page * TAKE;
      let endpoint = `/api/v1/movement/${currentTab}?skip=${skip}&take=${TAKE}`;
      
      if (startDate) endpoint += `&startDate=${startDate}`;
      if (endDate) endpoint += `&endDate=${endDate}`;
      if (sourceFilter) endpoint += `&source=${sourceFilter}`;
      if (studentId) endpoint += `&studentId=${studentId}`;

      const response = await apiClient.get(endpoint) as { items: any[], total: number };
      
      const fetchedData = Array.isArray(response?.items) ? response.items : [];
      
      if (currentTab === 'arrivals') {
        setArrivals(fetchedData);
      } else {
        setDepartures(fetchedData);
      }
      
      setPageIndex(page);
      setHasMore(fetchedData.length === TAKE);
    } catch (err: unknown) {
      let errorMessage = 'Failed to load movement history.';
      if (err instanceof ApiError) {
        if (err.status === 403) {
          errorMessage = 'You do not have permission to view this data.';
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, sourceFilter, studentId]);

  useEffect(() => {
    setPageIndex(0);
    fetchHistory(0, activeTab);
  }, [activeTab, fetchHistory]);

  const handleNext = () => {
    if (hasMore) {
      fetchHistory(pageIndex + 1, activeTab);
    }
  };

  const handlePrev = () => {
    if (pageIndex > 0) {
      fetchHistory(pageIndex - 1, activeTab);
    }
  };

  const handleApplyFilters = () => {
    fetchHistory(0, activeTab);
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSourceFilter('');
    // fetchHistory will be called by useEffect due to dependencies changing
  };

  const arrivalColumns: Column<ArrivalRecord>[] = [
    { 
      header: 'Student', 
      accessor: (item) => (
        <div>
          <Link href={`/dashboard/students/${item.student.id}`} className="font-medium text-brand-navy dark:text-white hover:underline">
            {item.student.lastName}, {item.student.firstName}
          </Link>
          <div className="text-xs text-gray-500">{item.student.studentNumber}</div>
        </div>
      )
    },
    { header: 'Operational Date', accessor: 'operationalDate' },
    { 
      header: 'Time', 
      accessor: (item) => new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    { 
      header: 'Source', 
      accessor: (item) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          item.source === 'CAMERA' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {item.source}
        </span>
      )
    }
  ];

  const departureColumns: Column<DepartureRecord>[] = [
    { 
      header: 'Student', 
      accessor: (item) => (
        <div>
          <Link href={`/dashboard/students/${item.student.id}`} className="font-medium text-brand-navy dark:text-white hover:underline">
            {item.student.lastName}, {item.student.firstName}
          </Link>
          <div className="text-xs text-gray-500">{item.student.studentNumber}</div>
        </div>
      )
    },
    { 
      header: 'Authorized Pickup', 
      accessor: (item) => item.authorizedPerson ? (
        <div>
          <Link href={`/dashboard/students/${item.student.id}/guardians/${item.authorizedPerson.id}`} className="text-sm text-gray-900 dark:text-gray-300 hover:underline">
            {item.authorizedPerson.firstName} {item.authorizedPerson.lastName}
          </Link>
          <div className="text-xs text-gray-500">{item.authorizedPerson.phone || 'No phone'}</div>
        </div>
      ) : 'Unknown'
    },
    { header: 'Operational Date', accessor: 'operationalDate' },
    { 
      header: 'Time', 
      accessor: (item) => new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    { 
      header: 'Source', 
      accessor: (item) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          item.source === 'CAMERA' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {item.source}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy dark:text-white">Movement History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View raw arrival and departure records.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-48">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
            <input 
              type="date" 
              className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-brand-teal focus:ring-brand-teal dark:bg-gray-800 dark:border-gray-700" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
            <input 
              type="date" 
              className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-brand-teal focus:ring-brand-teal dark:bg-gray-800 dark:border-gray-700" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Source</label>
            <select 
              className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-brand-teal focus:ring-brand-teal dark:bg-gray-800 dark:border-gray-700"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="CAMERA">Camera (QR)</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
          <div className="w-full sm:w-auto flex items-end gap-2">
            <button 
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-brand-teal text-white text-sm font-medium rounded-md hover:bg-brand-navy transition-colors"
            >
              Apply
            </button>
            {(startDate || endDate || sourceFilter) && (
              <button 
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('arrivals')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'arrivals'
                ? 'border-brand-teal text-brand-teal'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Arrivals
          </button>
          <button
            onClick={() => setActiveTab('departures')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'departures'
                ? 'border-brand-teal text-brand-teal'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Departures
          </button>
        </nav>
      </div>

      {error ? (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading movement history</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <DataTable
          data={activeTab === 'arrivals' ? arrivals : departures}
          columns={activeTab === 'arrivals' ? arrivalColumns : (departureColumns as any)}
          loading={loading}
          onNext={handleNext}
          onPrev={handlePrev}
          hasMore={hasMore}
          pageIndex={pageIndex}
          emptyMessage={`No ${activeTab} found for the selected filters.`}
        />
      )}
    </div>
  );
}

export default function MovementHistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading movement history...</div>}>
      <MovementHistoryContent />
    </Suspense>
  );
}
