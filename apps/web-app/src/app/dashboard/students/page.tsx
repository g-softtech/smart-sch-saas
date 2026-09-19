"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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

  // Guardian Modal State
  const [isCreateGuardianModalOpen, setIsCreateGuardianModalOpen] = useState(false);
  const [guardianFirstName, setGuardianFirstName] = useState('');
  const [guardianLastName, setGuardianLastName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianAddress, setGuardianAddress] = useState('');
  const [guardianOccupation, setGuardianOccupation] = useState('');
  const [createGuardianLoading, setCreateGuardianLoading] = useState(false);
  const [createGuardianError, setCreateGuardianError] = useState<string | null>(null);
  const [createGuardianSuccess, setCreateGuardianSuccess] = useState(false);

  // Link Guardian Modal State
  const [isLinkGuardianModalOpen, setIsLinkGuardianModalOpen] = useState(false);
  const [linkStudentId, setLinkStudentId] = useState<string | null>(null);

  // Search State
  const [searchGuardianQuery, setSearchGuardianQuery] = useState('');
  const [searchGuardianResults, setSearchGuardianResults] = useState<{ id: string; firstName: string; lastName: string; email?: string; phone?: string; }[]>([]);
  const [isSearchingGuardians, setIsSearchingGuardians] = useState(false);
  const [searchGuardianError, setSearchGuardianError] = useState<string | null>(null);

  // Selection & Link Payload State
  const [selectedGuardianId, setSelectedGuardianId] = useState<string | null>(null);
  const [linkRelationship, setLinkRelationship] = useState('GUARDIAN'); // Default
  const [linkIsPrimary, setLinkIsPrimary] = useState(false);
  const [linkIsEmergency, setLinkIsEmergency] = useState(false);

  // Link Submission State
  const [linkGuardianLoading, setLinkGuardianLoading] = useState(false);
  const [linkGuardianError, setLinkGuardianError] = useState<string | null>(null);
  const [linkGuardianSuccess, setLinkGuardianSuccess] = useState(false);

  // Enroll Student Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState<string | null>(null);
  const [enrollYearId, setEnrollYearId] = useState('');
  const [enrollClassId, setEnrollClassId] = useState('');
  const [enrollArmId, setEnrollArmId] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  const [academicYears, setAcademicYears] = useState<{id: string, name: string}[]>([]);
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);
  const [arms, setArms] = useState<{id: string, name: string, classId: string}[]>([]);
  const [academicsError, setAcademicsError] = useState<string | null>(null);

  const loadAcademicsForEnrollment = async () => {
    try {
      setAcademicsError(null);
      const [ayRes, clsRes, armRes] = await Promise.all([
        apiClient.get('api/v1/academics/academic-years?limit=100'),
        apiClient.get('api/v1/academics/classes?limit=100'),
        apiClient.get('api/v1/academics/arms?limit=100')
      ]);
      setAcademicYears(Array.isArray(ayRes) ? ayRes : (ayRes as { data?: {id: string, name: string}[] })?.data || []);
      setClasses(Array.isArray(clsRes) ? clsRes : (clsRes as { data?: {id: string, name: string}[] })?.data || []);
      setArms(Array.isArray(armRes) ? armRes : (armRes as { data?: {id: string, name: string, classId: string}[] })?.data || []);
    } catch (err: unknown) {
      if (err instanceof ApiError) setAcademicsError(err.message);
      else setAcademicsError('Failed to load academic data');
    }
  };

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

    if (dateOfBirth && new Date(dateOfBirth) >= new Date(admissionDate)) {
      setCreateError('Date of birth must be earlier than admission date.');
      setCreateLoading(false);
      return;
    }

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

  const handleCreateGuardianSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianFirstName.trim() || !guardianLastName.trim()) {
      setCreateGuardianError('First Name and Last Name are required.');
      return;
    }

    setCreateGuardianLoading(true);
    setCreateGuardianError(null);
    setCreateGuardianSuccess(false);

    try {
      const payload: Record<string, string> = {
        firstName: guardianFirstName.trim(),
        lastName: guardianLastName.trim(),
      };

      if (guardianPhone.trim()) payload.phone = guardianPhone.trim();
      if (guardianEmail.trim()) payload.email = guardianEmail.trim();
      if (guardianAddress.trim()) payload.address = guardianAddress.trim();
      if (guardianOccupation.trim()) payload.occupation = guardianOccupation.trim();

      await apiClient.post('api/v1/students/guardians', payload);

      setCreateGuardianSuccess(true);

      // Reset form
      setGuardianFirstName('');
      setGuardianLastName('');
      setGuardianPhone('');
      setGuardianEmail('');
      setGuardianAddress('');
      setGuardianOccupation('');

      setTimeout(() => {
        setIsCreateGuardianModalOpen(false);
        setCreateGuardianSuccess(false);
      }, 1500);

      // Refresh list
      fetchTabData('guardians', 0);

    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setCreateGuardianError(err.message || 'Failed to create guardian');
      } else {
        setCreateGuardianError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setCreateGuardianLoading(false);
    }
  };

  const handleSearchGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchGuardianQuery.trim()) {
       setSearchGuardianResults([]);
       return;
    }
    setIsSearchingGuardians(true);
    setSearchGuardianError(null);
    try {
      const response = await apiClient.get(`api/v1/students/guardians/list?search=${encodeURIComponent(searchGuardianQuery.trim())}&limit=50`);
      const data = Array.isArray(response) ? response : [];
      setSearchGuardianResults(data);
      setSelectedGuardianId(null); // Reset selection on new search
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setSearchGuardianError(err.message || 'Failed to search guardians');
      } else {
        setSearchGuardianError('An error occurred while searching');
      }
    } finally {
      setIsSearchingGuardians(false);
    }
  };

  const handleLinkGuardianSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkStudentId || !selectedGuardianId) {
      setLinkGuardianError('Please select a student and a guardian.');
      return;
    }

    setLinkGuardianLoading(true);
    setLinkGuardianError(null);
    setLinkGuardianSuccess(false);

    try {
      const payload = {
        guardianId: selectedGuardianId,
        relationship: linkRelationship,
        isPrimary: linkIsPrimary,
        isEmergencyContact: linkIsEmergency,
      };

      await apiClient.post(`api/v1/students/${linkStudentId}/guardians/link`, payload);

      setLinkGuardianSuccess(true);

      setTimeout(() => {
        setIsLinkGuardianModalOpen(false);
        setLinkGuardianSuccess(false);
        setLinkStudentId(null);
        setSelectedGuardianId(null);
        setSearchGuardianQuery('');
        setSearchGuardianResults([]);
        setLinkRelationship('GUARDIAN');
        setLinkIsPrimary(false);
        setLinkIsEmergency(false);
      }, 1500);

    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setLinkGuardianError(err.message || 'Failed to link guardian');
      } else {
        setLinkGuardianError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setLinkGuardianLoading(false);
    }
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollStudentId || !enrollYearId || !enrollClassId) return;
    setEnrollLoading(true);
    setEnrollError(null);
    setEnrollSuccess(false);

    try {
      const payload: Record<string, string> = {
        academicYearId: enrollYearId,
        classId: enrollClassId,
      };
      if (enrollArmId) payload.armId = enrollArmId;

      await apiClient.post(`api/v1/students/${enrollStudentId}/enrollments`, payload);
      setEnrollSuccess(true);
      
      setTimeout(() => {
        setIsEnrollModalOpen(false);
        setEnrollSuccess(false);
        setEnrollStudentId(null);
        setEnrollYearId('');
        setEnrollClassId('');
        setEnrollArmId('');
      }, 1500);

    } catch (err: unknown) {
      if (err instanceof ApiError) setEnrollError(err.message);
      else setEnrollError('Failed to enroll student');
    } finally {
      setEnrollLoading(false);
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
      },
      {
        header: 'Actions',
        accessor: (item) => (
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/students/${item.id}`}
              className="text-brand-navy dark:text-brand-gold hover:opacity-80 transition-opacity font-medium"
            >
              View Profile
            </Link>
            <button
              onClick={() => {
                setLinkStudentId(item.id as string);
                setIsLinkGuardianModalOpen(true);
              }}
              className="text-brand-teal hover:text-brand-navy dark:hover:text-brand-gold transition-colors font-medium"
            >
              Link Guardian
            </button>
            <button
              onClick={() => {
                setEnrollStudentId(item.id as string);
                if (classes.length === 0) loadAcademicsForEnrollment();
                setIsEnrollModalOpen(true);
              }}
              className="text-brand-gold hover:text-brand-navy dark:hover:text-white transition-colors font-medium"
            >
              Enroll
            </button>
          </div>
        )
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
        {activeTab === 'guardians' && (
          <button
            onClick={() => setIsCreateGuardianModalOpen(true)}
            className="inline-flex items-center rounded-md bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 dark:focus:ring-offset-brand-navy"
          >
            Add Guardian
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

      {/* Create Guardian Modal */}
      {isCreateGuardianModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-brand-navy/80 backdrop-blur-sm transition-opacity" onClick={() => setIsCreateGuardianModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-brand-navy-surface border border-gray-200 dark:border-brand-border-dark px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-brand-navy dark:text-brand-offwhite">Add Guardian</h3>
                <form onSubmit={handleCreateGuardianSubmit} className="mt-4">
                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    {/* First Name */}
                    <div>
                      <label htmlFor="guardianFirstName" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="guardianFirstName"
                          id="guardianFirstName"
                          required
                          value={guardianFirstName}
                          onChange={(e) => setGuardianFirstName(e.target.value)}
                          disabled={createGuardianLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                    {/* Last Name */}
                    <div>
                      <label htmlFor="guardianLastName" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="guardianLastName"
                          id="guardianLastName"
                          required
                          value={guardianLastName}
                          onChange={(e) => setGuardianLastName(e.target.value)}
                          disabled={createGuardianLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="guardianPhone" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Phone
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="guardianPhone"
                          id="guardianPhone"
                          value={guardianPhone}
                          onChange={(e) => setGuardianPhone(e.target.value)}
                          disabled={createGuardianLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="guardianEmail" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Email
                      </label>
                      <div className="mt-1">
                        <input
                          type="email"
                          name="guardianEmail"
                          id="guardianEmail"
                          value={guardianEmail}
                          onChange={(e) => setGuardianEmail(e.target.value)}
                          disabled={createGuardianLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                    {/* Occupation */}
                    <div className="sm:col-span-2">
                      <label htmlFor="guardianOccupation" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Occupation
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="guardianOccupation"
                          id="guardianOccupation"
                          value={guardianOccupation}
                          onChange={(e) => setGuardianOccupation(e.target.value)}
                          disabled={createGuardianLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="sm:col-span-2">
                      <label htmlFor="guardianAddress" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Address
                      </label>
                      <div className="mt-1">
                        <textarea
                          name="guardianAddress"
                          id="guardianAddress"
                          rows={2}
                          value={guardianAddress}
                          onChange={(e) => setGuardianAddress(e.target.value)}
                          disabled={createGuardianLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>
                  </div>

                  {createGuardianError && (
                    <div className="mt-4 text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-900/30">
                      {createGuardianError}
                    </div>
                  )}
                  {createGuardianSuccess && (
                    <div className="mt-4 text-sm text-brand-teal p-2 bg-brand-teal/10 rounded border border-brand-teal/20">
                      Guardian created successfully!
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="submit"
                      disabled={createGuardianLoading || createGuardianSuccess}
                      className="inline-flex w-full justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold sm:col-start-2 disabled:opacity-50 transition-colors"
                    >
                      {createGuardianLoading ? 'Creating...' : 'Create Guardian'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateGuardianModalOpen(false)}
                      disabled={createGuardianLoading}
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

      {/* Link Guardian Modal */}
      {isLinkGuardianModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-brand-navy/80 backdrop-blur-sm transition-opacity" onClick={() => setIsLinkGuardianModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-brand-navy-surface border border-gray-200 dark:border-brand-border-dark px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-brand-navy dark:text-brand-offwhite mb-4">Link Guardian to Student</h3>

                {/* Search Form */}
                <form onSubmit={handleSearchGuardian} className="mb-6">
                  <label htmlFor="searchGuardianQuery" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                    Search Guardian
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      name="searchGuardianQuery"
                      id="searchGuardianQuery"
                      placeholder="Name, phone, or email"
                      value={searchGuardianQuery}
                      onChange={(e) => setSearchGuardianQuery(e.target.value)}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                    />
                    <button
                      type="submit"
                      disabled={isSearchingGuardians || !searchGuardianQuery.trim()}
                      className="inline-flex justify-center rounded-md bg-gray-100 dark:bg-brand-navy px-3 py-2 text-sm font-semibold text-gray-900 dark:text-brand-offwhite shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark hover:bg-gray-200 dark:hover:bg-brand-navy-surface disabled:opacity-50 transition-colors"
                    >
                      {isSearchingGuardians ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  {searchGuardianError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{searchGuardianError}</p>
                  )}
                </form>

                {/* Search Results */}
                {searchGuardianResults.length > 0 && (
                  <div className="mb-6 max-h-48 overflow-y-auto border border-gray-200 dark:border-brand-border-dark rounded-md">
                    <ul className="divide-y divide-gray-200 dark:divide-brand-border-dark bg-white dark:bg-brand-navy">
                      {searchGuardianResults.map((g) => (
                        <li key={g.id} className="p-3 hover:bg-gray-50 dark:hover:bg-brand-navy-surface transition-colors cursor-pointer" onClick={() => setSelectedGuardianId(g.id)}>
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="radio"
                              name="guardianSelection"
                              checked={selectedGuardianId === g.id}
                              onChange={() => setSelectedGuardianId(g.id)}
                              className="h-4 w-4 border-gray-300 text-brand-gold focus:ring-brand-gold dark:bg-brand-navy dark:border-brand-border-dark"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900 dark:text-brand-offwhite">{g.firstName} {g.lastName}</span>
                              <span className="text-xs text-gray-500 dark:text-brand-gray-text">{g.email || g.phone || 'No contact info'}</span>
                            </div>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {searchGuardianResults.length === 0 && searchGuardianQuery && !isSearchingGuardians && !searchGuardianError && (
                  <p className="mb-6 text-sm text-gray-500 dark:text-brand-gray-text italic">No guardians found matching &quot;{searchGuardianQuery}&quot;</p>
                )}

                {/* Link Form */}
                <form onSubmit={handleLinkGuardianSubmit}>
                  <div className="grid grid-cols-1 gap-y-4">
                    {/* Relationship */}
                    <div>
                      <label htmlFor="linkRelationship" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Relationship <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="linkRelationship"
                        name="linkRelationship"
                        value={linkRelationship}
                        onChange={(e) => setLinkRelationship(e.target.value)}
                        disabled={linkGuardianLoading || !selectedGuardianId}
                        className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                      >
                        <option value="FATHER">Father</option>
                        <option value="MOTHER">Mother</option>
                        <option value="GUARDIAN">Guardian</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    {/* Flags */}
                    <div className="space-y-4 mt-2">
                      <div className="flex items-start">
                        <div className="flex h-6 items-center">
                          <input
                            id="linkIsPrimary"
                            name="linkIsPrimary"
                            type="checkbox"
                            checked={linkIsPrimary}
                            onChange={(e) => setLinkIsPrimary(e.target.checked)}
                            disabled={linkGuardianLoading || !selectedGuardianId}
                            className="h-4 w-4 rounded border-gray-300 text-brand-gold focus:ring-brand-gold dark:bg-brand-navy dark:border-brand-border-dark"
                          />
                        </div>
                        <div className="ml-3 text-sm leading-6">
                          <label htmlFor="linkIsPrimary" className="font-medium text-brand-navy dark:text-brand-offwhite">Primary Guardian</label>
                          <p className="text-gray-500 dark:text-brand-gray-text">Set as the primary contact for this student. (Replaces any existing primary)</p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="flex h-6 items-center">
                          <input
                            id="linkIsEmergency"
                            name="linkIsEmergency"
                            type="checkbox"
                            checked={linkIsEmergency}
                            onChange={(e) => setLinkIsEmergency(e.target.checked)}
                            disabled={linkGuardianLoading || !selectedGuardianId}
                            className="h-4 w-4 rounded border-gray-300 text-brand-gold focus:ring-brand-gold dark:bg-brand-navy dark:border-brand-border-dark"
                          />
                        </div>
                        <div className="ml-3 text-sm leading-6">
                          <label htmlFor="linkIsEmergency" className="font-medium text-brand-navy dark:text-brand-offwhite">Emergency Contact</label>
                          <p className="text-gray-500 dark:text-brand-gray-text">Authorized to be contacted in an emergency.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {linkGuardianError && (
                    <div className="mt-4 text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-900/30">
                      {linkGuardianError}
                    </div>
                  )}
                  {linkGuardianSuccess && (
                    <div className="mt-4 text-sm text-brand-teal p-2 bg-brand-teal/10 rounded border border-brand-teal/20">
                      Guardian linked successfully!
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="submit"
                      disabled={linkGuardianLoading || linkGuardianSuccess || !selectedGuardianId}
                      className="inline-flex w-full justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold sm:col-start-2 disabled:opacity-50 transition-colors"
                    >
                      {linkGuardianLoading ? 'Linking...' : 'Link Guardian'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLinkGuardianModalOpen(false)}
                      disabled={linkGuardianLoading}
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
      {/* Enroll Student Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-brand-navy dark:text-white">Enroll Student</h2>
            </div>
            <form onSubmit={handleEnrollSubmit} className="p-6 space-y-4">
              {academicsError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                  {academicsError}
                </div>
              )}
              {enrollError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                  {enrollError}
                </div>
              )}
              {enrollSuccess && (
                <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200">
                  Student enrolled successfully!
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Academic Year *</label>
                <select
                  value={enrollYearId}
                  onChange={e => setEnrollYearId(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none dark:text-white transition-all"
                  required
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map(ay => (
                    <option key={ay.id} value={ay.id}>{ay.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class *</label>
                <select
                  value={enrollClassId}
                  onChange={e => {
                    setEnrollClassId(e.target.value);
                    setEnrollArmId('');
                  }}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none dark:text-white transition-all"
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Arm (Optional)</label>
                <select
                  value={enrollArmId}
                  onChange={e => setEnrollArmId(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none dark:text-white transition-all"
                >
                  <option value="">Select Arm</option>
                  {arms.filter(a => a.classId === enrollClassId).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  disabled={enrollLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrollLoading || enrollSuccess || !enrollYearId || !enrollClassId}
                  className="px-6 py-2 bg-brand-teal text-white font-medium rounded-lg hover:bg-brand-navy transition-colors disabled:opacity-50 flex items-center"
                >
                  {enrollLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : null}
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
