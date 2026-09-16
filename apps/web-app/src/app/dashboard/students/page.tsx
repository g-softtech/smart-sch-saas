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

export default function StudentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [tabStates, setTabStates] = useState<Record<TabType, TabState>>({
    'students': { ...initialTabState },
    'guardians': { ...initialTabState }
  });

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [gender, setGender] = useState('MALE'); // default
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  
  // Submission State
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

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
      
      const data = Array.isArray(response) ? response : [];
      
      setTabStates(prev => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          loading: false,
          data,
          pageIndex,
          hasMore: data.length === LIMIT,
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
    if (!firstName.trim() || !lastName.trim() || !gender || !admissionDate) return;

    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(false);

    try {
      interface CreateStudentPayload {
        firstName: string;
        lastName: string;
        gender: string;
        admissionDate: string;
        middleName?: string;
        dateOfBirth?: string;
        nationality?: string;
      }

      const payload: CreateStudentPayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        admissionDate,
      };

      if (middleName.trim()) payload.middleName = middleName.trim();
      if (dateOfBirth) payload.dateOfBirth = dateOfBirth;
      if (nationality.trim()) payload.nationality = nationality.trim();

      // schoolId is intentionally omitted; backend infers from workspace
      await apiClient.post('api/v1/students', payload);

      setCreateSuccess(true);
      
      // Reset form
      setFirstName('');
      setLastName('');
      setMiddleName('');
      setGender('MALE');
      setDateOfBirth('');
      setNationality('');
      setAdmissionDate('');

      setTimeout(() => {
        setIsCreateModalOpen(false);
        setCreateSuccess(false);
      }, 1500);

      // Refresh list
      fetchTabData('students', 0);

    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setCreateError(err.message || 'Failed to create student');
      } else {
        setCreateError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const currentState = tabStates[activeTab];

  let columns: Column<Record<string, unknown>>[] = [];
  
  if (activeTab === 'students') {
    columns = [
      { header: 'ID', accessor: 'id', hideOnMobile: true },
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
      { header: 'ID', accessor: 'id', hideOnMobile: true },
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy dark:text-brand-offwhite">Students</h1>
          <p className="text-sm text-gray-500 dark:text-brand-gray-text">Manage students and guardians.</p>
        </div>
        {activeTab === 'students' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center rounded-md bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 dark:focus:ring-offset-brand-navy"
          >
            Add Student
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
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Error loading {activeTab}</h3>
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
          emptyMessage={`No ${activeTab} found in this workspace.`}
        />
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-brand-navy/80 backdrop-blur-sm transition-opacity" onClick={() => !createLoading && setIsCreateModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-brand-navy-surface border border-gray-200 dark:border-brand-border-dark px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-brand-navy dark:text-brand-offwhite">Add New Student</h3>
                <form onSubmit={handleCreateSubmit} className="mt-6 space-y-4">
                  
                  <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                    {/* First Name */}
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="firstName"
                          id="firstName"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          disabled={createLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                    {/* Last Name */}
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="lastName"
                          id="lastName"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          disabled={createLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                    {/* Middle Name */}
                    <div>
                      <label htmlFor="middleName" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Middle Name
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="middleName"
                          id="middleName"
                          value={middleName}
                          onChange={(e) => setMiddleName(e.target.value)}
                          disabled={createLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                    {/* Gender */}
                    <div>
                      <label htmlFor="gender" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1">
                        <select
                          id="gender"
                          name="gender"
                          required
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          disabled={createLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        >
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>

                    {/* Admission Date */}
                    <div>
                      <label htmlFor="admissionDate" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Admission Date <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1">
                        <input
                          type="date"
                          name="admissionDate"
                          id="admissionDate"
                          required
                          value={admissionDate}
                          onChange={(e) => setAdmissionDate(e.target.value)}
                          disabled={createLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label htmlFor="dateOfBirth" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Date of Birth
                      </label>
                      <div className="mt-1">
                        <input
                          type="date"
                          name="dateOfBirth"
                          id="dateOfBirth"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          disabled={createLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                    {/* Nationality */}
                    <div className="sm:col-span-2">
                      <label htmlFor="nationality" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Nationality
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="nationality"
                          id="nationality"
                          value={nationality}
                          onChange={(e) => setNationality(e.target.value)}
                          disabled={createLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                  </div>

                  {createError && (
                    <div className="mt-4 text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-900/30">
                      {createError}
                    </div>
                  )}
                  {createSuccess && (
                    <div className="mt-4 text-sm text-brand-teal p-2 bg-brand-teal/10 rounded border border-brand-teal/20">
                      Student created successfully!
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="submit"
                      disabled={createLoading || createSuccess}
                      className="inline-flex w-full justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold sm:col-start-2 disabled:opacity-50 transition-colors"
                    >
                      {createLoading ? 'Creating...' : 'Create Student'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      disabled={createLoading}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-brand-navy px-3 py-2 text-sm font-semibold text-gray-900 dark:text-brand-offwhite shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark hover:bg-gray-50 dark:hover:bg-brand-navy-surface sm:col-start-1 sm:mt-0 transition-colors"
                    >
                      Cancel
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
