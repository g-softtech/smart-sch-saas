"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';

type TabType = 'academic-years' | 'terms' | 'classes' | 'arms' | 'subjects';

const TABS: { id: TabType; label: string }[] = [
  { id: 'academic-years', label: 'Academic Years' },
  { id: 'terms', label: 'Terms' },
  { id: 'classes', label: 'Classes' },
  { id: 'arms', label: 'Arms' },
  { id: 'subjects', label: 'Subjects' }
];

const TAKE = 50;

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

export default function AcademicsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('academic-years');
  const [tabStates, setTabStates] = useState<Record<TabType, TabState>>({
    'academic-years': { ...initialTabState },
    'terms': { ...initialTabState },
    'classes': { ...initialTabState },
    'arms': { ...initialTabState },
    'subjects': { ...initialTabState }
  });

  const fetchTabData = useCallback(async (tab: TabType, page: number) => {
    setTabStates(prev => ({
      ...prev,
      [tab]: { ...prev[tab], loading: true, error: null }
    }));

    try {
      const skip = page * TAKE;
      const endpoint = `api/v1/academics/${tab}?skip=${skip}&take=${TAKE}`;
      const response = await apiClient.get(endpoint);
      
      const data = Array.isArray(response) ? response : [];
      
      setTabStates(prev => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          loading: false,
          data,
          pageIndex: page,
          hasMore: data.length === TAKE,
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

  // Fetch data when active tab changes if it hasn't been fetched yet
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

  // Define columns based on active tab
  let columns: Column<Record<string, unknown>>[] = [];
  
  if (activeTab === 'academic-years') {
    columns = [
      { header: 'ID', accessor: 'id' },
      { header: 'Name', accessor: 'name' }
    ];
  } else if (activeTab === 'terms') {
    columns = [
      { header: 'ID', accessor: 'id' },
      { header: 'Name', accessor: 'name' }
    ];
  } else if (activeTab === 'classes') {
    columns = [
      { header: 'ID', accessor: 'id' },
      { header: 'Name', accessor: 'name' }
    ];
  } else if (activeTab === 'arms') {
    columns = [
      { header: 'ID', accessor: 'id' },
      { header: 'Name', accessor: 'name' }
    ];
  } else if (activeTab === 'subjects') {
    columns = [
      { header: 'ID', accessor: 'id' },
      { header: 'Name', accessor: 'name' }
    ];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Academics</h1>
        <p className="text-sm text-gray-500">View academics structure (read-only verification).</p>
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
              <h3 className="text-sm font-medium text-red-800">Error loading {activeTab.replace('-', ' ')}</h3>
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
          emptyMessage={`No ${activeTab.replace('-', ' ')} found in this workspace.`}
        />
      )}
    </div>
  );
}
