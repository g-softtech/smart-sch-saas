"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';

type TabType = 'students' | 'guardians';

const TABS: { id: TabType; label: string }[] = [
  { id: 'students', label: 'Students' },
  { id: 'guardians', label: 'Guardians' }
];

const LIMIT = 50;

interface TabState {
  data: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  pageIndex: number;
  hasMore: boolean;
}

const initialTabState: TabState = {
  data: [],
  loading: false,
  error: null,
  pageIndex: 0,
  hasMore: true
};

export default function StudentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [tabStates, setTabStates] = useState<Record<TabType, TabState>>({
    'students': { ...initialTabState },
    'guardians': { ...initialTabState }
  });

  const fetchTabData = useCallback(async (tab: TabType, pageIndex: number) => {
    setTabStates(prev => ({
      ...prev,
      [tab]: { ...prev[tab], loading: true, error: null }
    }));

    try {
      const page = pageIndex + 1; // Backend is 1-indexed
      let endpoint = '';
      if (tab === 'students') {
        endpoint = `api/v1/students?page=${page}&limit=${LIMIT}`;
      } else {
        endpoint = `api/v1/students/guardians/list?page=${page}&limit=${LIMIT}`;
      }
      
      const response = await apiClient.get(endpoint);
      
      // The apiClient returns data.data, stripping the meta object.
      // So we use array length to determine hasMore, identical to Academics.
      const data = Array.isArray(response) ? response : [];
      
      setTabStates(prev => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          loading: false,
          data,
          pageIndex,
          hasMore: data.length === LIMIT,
          error: null
        }
      }));
    } catch (err: unknown) {
      let errorMessage = 'Failed to load data.';
      if (err instanceof ApiError) {
        if (err.status === 403) {
          errorMessage = 'You do not have permission to view this data.';
        } else {
          errorMessage = err.message;
        }
      }
      setTabStates(prev => ({
        ...prev,
        [tab]: { ...prev[tab], loading: false, error: errorMessage }
      }));
    }
  }, []);

  useEffect(() => {
    const currentState = tabStates[activeTab];
    if (currentState.data.length === 0 && !currentState.loading && !currentState.error) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTabData(activeTab, 0);
    }
  }, [activeTab, tabStates, fetchTabData]);

  const handleNext = () => {
    const currentState = tabStates[activeTab];
    if (currentState.hasMore) {
      fetchTabData(activeTab, currentState.pageIndex + 1);
    }
  };

  const handlePrev = () => {
    const currentState = tabStates[activeTab];
    if (currentState.pageIndex > 0) {
      fetchTabData(activeTab, currentState.pageIndex - 1);
    }
  };

  const currentState = tabStates[activeTab];

  let columns: Column<Record<string, unknown>>[] = [];
  
  if (activeTab === 'students') {
    columns = [
      { header: 'ID', accessor: 'id' },
      { 
        header: 'Name', 
        accessor: (item) => {
          const first = item.firstName || '';
          const last = item.lastName || '';
          return `${first} ${last}`.trim();
        }
      },
      { header: 'Gender', accessor: 'gender' },
      { 
        header: 'Admission Date', 
        accessor: (item) => {
          return item.admissionDate ? new Date(item.admissionDate as string).toLocaleDateString() : 'N/A';
        }
      }
    ];
  } else if (activeTab === 'guardians') {
    columns = [
      { header: 'ID', accessor: 'id' },
      { 
        header: 'Name', 
        accessor: (item) => {
          const first = item.firstName || '';
          const last = item.lastName || '';
          return `${first} ${last}`.trim();
        }
      },
      { header: 'Phone', accessor: 'phone' },
      { header: 'Email', accessor: 'email' }
    ];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Students</h1>
        <p className="text-sm text-gray-500">View student and guardian records (read-only verification).</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {currentState.error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading {activeTab}</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{currentState.error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!currentState.error && (
        <DataTable
          data={currentState.data}
          columns={columns}
          loading={currentState.loading}
          onNext={handleNext}
          onPrev={handlePrev}
          hasMore={currentState.hasMore}
          pageIndex={currentState.pageIndex}
          emptyMessage={`No ${activeTab} found in this workspace.`}
        />
      )}
    </div>
  );
}
