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
  const { schoolId, tenantId } = useWorkspace();
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

  // Create Class Modal State
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
  const [createClassName, setCreateClassName] = useState('');
  const [createClassSchoolId, setCreateClassSchoolId] = useState('');
  const [createClassLoading, setCreateClassLoading] = useState(false);
  const [createClassError, setCreateClassError] = useState<string | null>(null);
  const [createClassSuccess, setCreateClassSuccess] = useState(false);
  const [schoolsList, setSchoolsList] = useState<{schoolId: string, schoolName: string}[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);

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

  const handleCreateClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createClassName.trim() || !createClassSchoolId) return;

    setCreateClassLoading(true);
    setCreateClassError(null);
    setCreateClassSuccess(false);

    try {
      await apiClient.post('api/v1/academics/classes', {
        schoolId: createClassSchoolId,
        name: createClassName.trim()
      });

      setCreateClassSuccess(true);
      setCreateClassName('');
      setCreateClassSchoolId('');
      setTimeout(() => {
        setIsCreateClassModalOpen(false);
        setCreateClassSuccess(false);
      }, 1500);

      // Refresh list
      fetchTabData('classes', 0);

    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setCreateClassError(err.message || 'Failed to create class');
      } else {
        setCreateClassError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setCreateClassLoading(false);
    }
  };

  const openCreateClassModal = async () => {
    setIsCreateClassModalOpen(true);
    setCreateClassSchoolId(schoolId || '');

    if (schoolsList.length === 0) {
      setSchoolsLoading(true);
      try {
        const response = await apiClient.get('api/v1/auth/workspaces');
        if (Array.isArray(response)) {
          const workspace = response.find((w: { tenantId: string; schools: { schoolId: string; schoolName: string }[] }) => w.tenantId === tenantId);
          if (workspace && Array.isArray(workspace.schools)) {
            setSchoolsList(workspace.schools);
          }
        }
      } catch (err) {
        console.error('Failed to load schools', err);
      } finally {
        setSchoolsLoading(false);
      }
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
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy dark:text-brand-offwhite">Academics</h1>
          <p className="text-sm text-gray-500 dark:text-brand-gray-text">Manage academics structure.</p>
        </div>
        {activeTab === 'academic-years' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center rounded-md bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 dark:focus:ring-offset-brand-navy"
          >
            Add Academic Year
          </button>
        )}
        {activeTab === 'terms' && (
          <button
            onClick={openCreateTermModal}
            className="inline-flex items-center rounded-md bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 dark:focus:ring-offset-brand-navy"
          >
            Add Term
          </button>
        )}
        {activeTab === 'classes' && (
          <button
            onClick={openCreateClassModal}
            className="inline-flex items-center rounded-md bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 dark:focus:ring-offset-brand-navy"
          >
            Add Class
          </button>
        )}
      </div>

      <div className="border-b border-gray-200 dark:border-brand-border-dark">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-brand-gold text-brand-navy dark:text-brand-gold'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-brand-gray-text dark:hover:border-brand-gray-text dark:hover:text-brand-offwhite'
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
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-900/30">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Error loading {activeTab.replace('-', ' ')}</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
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
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-brand-navy/80 backdrop-blur-sm transition-opacity" onClick={() => setIsCreateModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-brand-navy-surface border border-gray-200 dark:border-brand-border-dark px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-brand-navy dark:text-brand-offwhite">Add Academic Year</h3>
                <form onSubmit={handleCreateSubmit} className="mt-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
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
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark placeholder:text-gray-400 dark:placeholder:text-brand-gray-text focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        placeholder="e.g. 2026/2027"
                      />
                    </div>
                  </div>

                  {createError && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {createError}
                    </div>
                  )}
                  {createSuccess && (
                    <div className="mt-2 text-sm text-brand-teal">
                      Academic year created successfully!
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      disabled={createLoading}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-brand-navy-surface px-3 py-2 text-sm font-semibold text-gray-900 dark:text-brand-offwhite shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark hover:bg-gray-50 dark:hover:bg-brand-navy sm:col-start-1 sm:mt-0 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createLoading || !createName.trim()}
                      className="inline-flex w-full justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold sm:col-start-2 disabled:opacity-50 transition-colors"
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
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-brand-navy/80 backdrop-blur-sm transition-opacity" onClick={() => setIsCreateTermModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-brand-navy-surface border border-gray-200 dark:border-brand-border-dark px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-brand-navy dark:text-brand-offwhite">Add Term</h3>
                <form onSubmit={handleCreateTermSubmit} className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="academicYearId" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
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
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        >
                          <option value="">Select an Academic Year</option>
                          {tabStates['academic-years'].data.map((year: Record<string, unknown>) => (
                            <option key={year.id as string} value={year.id as string}>
                              {year.name as string}
                            </option>
                          ))}
                        </select>
                        {tabStates['academic-years'].loading && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-brand-gray-text">Loading academic years...</p>
                        )}
                        {tabStates['academic-years'].error && (
                          <p className="mt-1 text-xs text-red-500 dark:text-red-400">Failed to load academic years</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="termName" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
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
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark placeholder:text-gray-400 dark:placeholder:text-brand-gray-text focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                          placeholder="e.g. Fall Term"
                        />
                      </div>
                    </div>
                  </div>

                  {createTermError && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {createTermError}
                    </div>
                  )}
                  {createTermSuccess && (
                    <div className="mt-2 text-sm text-brand-teal">
                      Term created successfully!
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateTermModalOpen(false)}
                      disabled={createTermLoading}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-brand-navy-surface px-3 py-2 text-sm font-semibold text-gray-900 dark:text-brand-offwhite shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark hover:bg-gray-50 dark:hover:bg-brand-navy sm:col-start-1 sm:mt-0 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createTermLoading || !createTermName.trim() || !createTermAcademicYearId}
                      className="inline-flex w-full justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold sm:col-start-2 disabled:opacity-50 transition-colors"
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

      {isCreateClassModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-brand-navy/80 backdrop-blur-sm transition-opacity" onClick={() => setIsCreateClassModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-brand-navy-surface border border-gray-200 dark:border-brand-border-dark px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-brand-navy dark:text-brand-offwhite">Add Class</h3>
                <form onSubmit={handleCreateClassSubmit} className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="classSchoolId" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        School
                      </label>
                      <div className="mt-2">
                        <select
                          id="classSchoolId"
                          name="classSchoolId"
                          required
                          value={createClassSchoolId}
                          onChange={(e) => setCreateClassSchoolId(e.target.value)}
                          disabled={createClassLoading || schoolsLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        >
                          <option value="">Select a School</option>
                          {schoolsList.map((s) => (
                            <option key={s.schoolId} value={s.schoolId}>
                              {s.schoolName}
                            </option>
                          ))}
                        </select>
                        {schoolsLoading && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-brand-gray-text">Loading schools...</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="className" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Class Name
                      </label>
                      <div className="mt-2">
                        <input
                          type="text"
                          name="className"
                          id="className"
                          required
                          value={createClassName}
                          onChange={(e) => setCreateClassName(e.target.value)}
                          disabled={createClassLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark placeholder:text-gray-400 dark:placeholder:text-brand-gray-text focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                          placeholder="e.g. Grade 1"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {createClassError && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {createClassError}
                    </div>
                  )}
                  {createClassSuccess && (
                    <div className="mt-2 text-sm text-brand-teal">
                      Class created successfully!
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateClassModalOpen(false)}
                      disabled={createClassLoading}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-brand-navy-surface px-3 py-2 text-sm font-semibold text-gray-900 dark:text-brand-offwhite shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark hover:bg-gray-50 dark:hover:bg-brand-navy sm:col-start-1 sm:mt-0 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createClassLoading || !createClassName.trim() || !createClassSchoolId}
                      className="inline-flex w-full justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold sm:col-start-2 disabled:opacity-50 transition-colors"
                    >
                      {createClassLoading ? 'Saving...' : 'Save'}
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
