"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';
import { useWorkspace } from '@/contexts/WorkspaceContext';

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
  initialized: boolean;
}

const initialTabState: TabState = {
  data: [],
  loading: false,
  error: null,
  pageIndex: 0,
  hasMore: true,
  initialized: false
};

export default function AcademicsPage() {
  const { schoolId } = useWorkspace();
  const [activeTab, setActiveTab] = useState<TabType>('academic-years');
  const [tabStates, setTabStates] = useState<Record<TabType, TabState>>({
    'academic-years': { ...initialTabState },
    'terms': { ...initialTabState },
    'classes': { ...initialTabState },
    'arms': { ...initialTabState },
    'subjects': { ...initialTabState }
  });

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Create Term Modal State
  const [isCreateTermModalOpen, setIsCreateTermModalOpen] = useState(false);
  const [createTermName, setCreateTermName] = useState('');
  const [createTermAcademicYearId, setCreateTermAcademicYearId] = useState('');
  const [createTermLoading, setCreateTermLoading] = useState(false);
  const [createTermError, setCreateTermError] = useState<string | null>(null);
  const [createTermSuccess, setCreateTermSuccess] = useState(false);

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
          error: null,
          initialized: true
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
        [tab]: { ...prev[tab], loading: false, error: errorMessage, initialized: true }
      }));
    }
  }, []);

  // Fetch data when active tab changes if it hasn't been fetched yet
  useEffect(() => {
    const currentState = tabStates[activeTab];
    if (!currentState.initialized && !currentState.loading) {
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;

    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(false);

    try {
      if (!schoolId) throw new Error("No active school in workspace");

      await apiClient.post('api/v1/academics/academic-years', {
        schoolId,
        name: createName.trim()
      });

      setCreateSuccess(true);
      setCreateName('');
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setCreateSuccess(false);
      }, 1500);

      // Refresh list
      fetchTabData('academic-years', 0);

    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setCreateError(err.message || 'Failed to create academic year');
      } else {
        setCreateError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreateTermSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTermName.trim() || !createTermAcademicYearId) return;

    setCreateTermLoading(true);
    setCreateTermError(null);
    setCreateTermSuccess(false);

    try {
      if (!schoolId) throw new Error("No active school in workspace");

      await apiClient.post('api/v1/academics/terms', {
        academicYearId: createTermAcademicYearId,
        name: createTermName.trim()
      });

      setCreateTermSuccess(true);
      setCreateTermName('');
      setCreateTermAcademicYearId('');
      setTimeout(() => {
        setIsCreateTermModalOpen(false);
        setCreateTermSuccess(false);
      }, 1500);

      // Refresh list
      fetchTabData('terms', 0);

    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setCreateTermError(err.message || 'Failed to create term');
      } else {
        setCreateTermError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setCreateTermLoading(false);
    }
  };

  const openCreateTermModal = () => {
    setIsCreateTermModalOpen(true);
    if (!tabStates['academic-years'].initialized && !tabStates['academic-years'].loading) {
      fetchTabData('academic-years', 0);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Academics</h1>
          <p className="text-sm text-gray-500">Manage academics structure.</p>
        </div>
        {activeTab === 'academic-years' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Add Academic Year
          </button>
        )}
        {activeTab === 'terms' && (
          <button
            onClick={openCreateTermModal}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Add Term
          </button>
        )}
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

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsCreateModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-gray-900">Add Academic Year</h3>
                <form onSubmit={handleCreateSubmit} className="mt-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
                      Name
                    </label>
                    <div className="mt-2">
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        disabled={createLoading}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                        placeholder="e.g. 2026/2027"
                      />
                    </div>
                  </div>

                  {createError && (
                    <div className="mt-2 text-sm text-red-600">
                      {createError}
                    </div>
                  )}
                  {createSuccess && (
                    <div className="mt-2 text-sm text-green-600">
                      Academic year created successfully!
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      disabled={createLoading}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createLoading || !createName.trim()}
                      className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2 disabled:opacity-50"
                    >
                      {createLoading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateTermModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsCreateTermModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-gray-900">Add Term</h3>
                <form onSubmit={handleCreateTermSubmit} className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="academicYearId" className="block text-sm font-medium leading-6 text-gray-900">
                        Academic Year
                      </label>
                      <div className="mt-2">
                        <select
                          id="academicYearId"
                          name="academicYearId"
                          required
                          value={createTermAcademicYearId}
                          onChange={(e) => setCreateTermAcademicYearId(e.target.value)}
                          disabled={createTermLoading || tabStates['academic-years'].loading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3 bg-white"
                        >
                          <option value="">Select an Academic Year</option>
                          {tabStates['academic-years'].data.map((year: Record<string, unknown>) => (
                            <option key={year.id as string} value={year.id as string}>
                              {year.name as string}
                            </option>
                          ))}
                        </select>
                        {tabStates['academic-years'].loading && (
                          <p className="mt-1 text-xs text-gray-500">Loading academic years...</p>
                        )}
                        {tabStates['academic-years'].error && (
                          <p className="mt-1 text-xs text-red-500">Failed to load academic years</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="termName" className="block text-sm font-medium leading-6 text-gray-900">
                        Term Name
                      </label>
                      <div className="mt-2">
                        <input
                          type="text"
                          name="termName"
                          id="termName"
                          required
                          value={createTermName}
                          onChange={(e) => setCreateTermName(e.target.value)}
                          disabled={createTermLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                          placeholder="e.g. Fall Term"
                        />
                      </div>
                    </div>
                  </div>

                  {createTermError && (
                    <div className="mt-2 text-sm text-red-600">
                      {createTermError}
                    </div>
                  )}
                  {createTermSuccess && (
                    <div className="mt-2 text-sm text-green-600">
                      Term created successfully!
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateTermModalOpen(false)}
                      disabled={createTermLoading}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createTermLoading || !createTermName.trim() || !createTermAcademicYearId}
                      className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2 disabled:opacity-50"
                    >
                      {createTermLoading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
