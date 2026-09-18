"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type TabType = 'academic-years' | 'terms' | 'classes' | 'arms' | 'subjects' | 'campuses' | 'departments' | 'subject-groups';

const TABS: { id: TabType; label: string }[] = [
  { id: 'academic-years', label: 'Academic Years' },
  { id: 'terms', label: 'Terms' },
  { id: 'classes', label: 'Classes' },
  { id: 'arms', label: 'Arms' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'campuses', label: 'Campuses' },
  { id: 'departments', label: 'Departments' },
  { id: 'subject-groups', label: 'Subject Groups' }
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
    'subjects': { ...initialTabState },
    'campuses': { ...initialTabState },
    'departments': { ...initialTabState },
    'subject-groups': { ...initialTabState }
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

  // Create Arm Modal State
  const [isCreateArmModalOpen, setIsCreateArmModalOpen] = useState(false);
  const [createArmName, setCreateArmName] = useState('');
  const [createArmClassId, setCreateArmClassId] = useState('');
  const [createArmCampusId, setCreateArmCampusId] = useState('');
  const [createArmLoading, setCreateArmLoading] = useState(false);
  const [createArmError, setCreateArmError] = useState<string | null>(null);
  const [createArmSuccess, setCreateArmSuccess] = useState(false);
  const [campusesList, setCampusesList] = useState<Record<string, unknown>[]>([]);
  const [campusesLoading, setCampusesLoading] = useState(false);
  const [classesList, setClassesList] = useState<Record<string, unknown>[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);

  // Create Subject Modal State
  const [isCreateSubjectModalOpen, setIsCreateSubjectModalOpen] = useState(false);
  const [createSubjectName, setCreateSubjectName] = useState('');
  const [createSubjectSchoolId, setCreateSubjectSchoolId] = useState('');
  const [createSubjectGroupId, setCreateSubjectGroupId] = useState('');
  const [createSubjectLoading, setCreateSubjectLoading] = useState(false);
  const [createSubjectError, setCreateSubjectError] = useState<string | null>(null);
  const [createSubjectSuccess, setCreateSubjectSuccess] = useState(false);
  const [subjectGroupsList, setSubjectGroupsList] = useState<Record<string, unknown>[]>([]);
  const [subjectGroupsLoading, setSubjectGroupsLoading] = useState(false);

  // Added Modal States
  const [isCreateCampusModalOpen, setIsCreateCampusModalOpen] = useState(false);
  const [createCampusName, setCreateCampusName] = useState('');
  const [createCampusLoading, setCreateCampusLoading] = useState(false);
  const [createCampusError, setCreateCampusError] = useState<string | null>(null);
  const [createCampusSuccess, setCreateCampusSuccess] = useState(false);

  const [isCreateDepartmentModalOpen, setIsCreateDepartmentModalOpen] = useState(false);
  const [createDepartmentName, setCreateDepartmentName] = useState('');
  const [createDepartmentLoading, setCreateDepartmentLoading] = useState(false);
  const [createDepartmentError, setCreateDepartmentError] = useState<string | null>(null);
  const [createDepartmentSuccess, setCreateDepartmentSuccess] = useState(false);

  const [isCreateSubjectGroupModalOpen, setIsCreateSubjectGroupModalOpen] = useState(false);
  const [createSubjectGroupName, setCreateSubjectGroupName] = useState('');
  const [createSubjectGroupLoading, setCreateSubjectGroupLoading] = useState(false);
  const [createSubjectGroupError, setCreateSubjectGroupError] = useState<string | null>(null);
  const [createSubjectGroupSuccess, setCreateSubjectGroupSuccess] = useState(false);

  // Generic Edit Modal State
  const [editItem, setEditItem] = useState<{ id: string, name: string, type: TabType } | null>(null);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // Generic Delete Modal State
  const [deleteItem, setDeleteItem] = useState<{ id: string, name: string, type: TabType } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

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

  const handleCreateArmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createArmName.trim() || !createArmClassId || !createArmCampusId) return;

    setCreateArmLoading(true);
    setCreateArmError(null);
    setCreateArmSuccess(false);

    try {
      await apiClient.post('api/v1/academics/arms', {
        name: createArmName.trim(),
        classId: createArmClassId,
        campusId: createArmCampusId
      });

      setCreateArmSuccess(true);
      setCreateArmName('');
      setCreateArmClassId('');
      setCreateArmCampusId('');
      setTimeout(() => {
        setIsCreateArmModalOpen(false);
        setCreateArmSuccess(false);
      }, 1500);

      fetchTabData('arms', 0);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setCreateArmError(err.message || 'Failed to create arm');
      } else {
        setCreateArmError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setCreateArmLoading(false);
    }
  };

  const openCreateArmModal = async () => {
    setIsCreateArmModalOpen(true);
    if (!tabStates['classes'].initialized && !tabStates['classes'].loading) {
      fetchTabData('classes', 0);
    }
    
    setCampusesLoading(true);
    try {
      const response = await apiClient.get('api/v1/academics/campuses?skip=0&take=100');
      const resObj = response as { data?: Record<string, unknown>[] };
      if (Array.isArray(response) || (response && Array.isArray(resObj.data))) {
        setCampusesList(Array.isArray(response) ? response : resObj.data || []);
      }
    } catch (err) {
      console.error('Failed to load campuses', err);
    } finally {
      setCampusesLoading(false);
    }
  };

  const handleCreateSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createSubjectName.trim() || !createSubjectSchoolId) return;

    setCreateSubjectLoading(true);
    setCreateSubjectError(null);
    setCreateSubjectSuccess(false);

    try {
      const payload: Record<string, string> = {
        name: createSubjectName.trim(),
        schoolId: createSubjectSchoolId,
      };
      if (createSubjectGroupId) {
        payload.subjectGroupId = createSubjectGroupId;
      }

      await apiClient.post('api/v1/academics/subjects', payload);

      setCreateSubjectSuccess(true);
      setCreateSubjectName('');
      setCreateSubjectSchoolId('');
      setCreateSubjectGroupId('');
      setTimeout(() => {
        setIsCreateSubjectModalOpen(false);
        setCreateSubjectSuccess(false);
      }, 1500);

      fetchTabData('subjects', 0);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setCreateSubjectError(err.message || 'Failed to create subject');
      } else {
        setCreateSubjectError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setCreateSubjectLoading(false);
    }
  };

  const openCreateSubjectModal = async () => {
    setIsCreateSubjectModalOpen(true);
    setCreateSubjectSchoolId(schoolId || '');

    if (schoolsList.length === 0) {
      setSchoolsLoading(true);
      try {
        const response = await apiClient.get('api/v1/auth/workspaces');
        const resObj = response as { data?: unknown[] };
        const workspaceList = Array.isArray(response) ? response : resObj.data || [];
        if (Array.isArray(workspaceList)) {
          const workspace = workspaceList.find((w: { tenantId: string; schools: { schoolId: string; schoolName: string }[] }) => w.tenantId === tenantId);
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

    setSubjectGroupsLoading(true);
    try {
      const response = await apiClient.get('api/v1/academics/subject-groups?skip=0&take=100');
      const resObj = response as { data?: Record<string, unknown>[] };
      if (Array.isArray(response) || (response && Array.isArray(resObj.data))) {
        setSubjectGroupsList(Array.isArray(response) ? response : resObj.data || []);
      }
    } catch (err) {
      console.error('Failed to load subject groups', err);
    } finally {
      setSubjectGroupsLoading(false);
    }
  };

  
  const openCreateCampusModal = () => {
    setCreateCampusName('');
    setCreateCampusError(null);
    setCreateCampusSuccess(false);
    setIsCreateCampusModalOpen(true);
  };

  const handleCreateCampusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCampusName.trim()) return;

    setCreateCampusLoading(true);
    setCreateCampusError(null);
    setCreateCampusSuccess(false);

    try {
      if (!schoolId) throw new Error("No active school in workspace");

      await apiClient.post('api/v1/academics/campuses', {
        schoolId,
        name: createCampusName.trim()
      });

      setCreateCampusSuccess(true);
      setCreateCampusName('');
      setTimeout(() => {
        setIsCreateCampusModalOpen(false);
        setCreateCampusSuccess(false);
      }, 1500);

      // Refresh list
      fetchTabData('campuses', 0);

    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setCreateCampusError(err.message || 'Failed to create campus');
      } else {
        setCreateCampusError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setCreateCampusLoading(false);
    }
  };

  const openCreateDepartmentModal = () => {
    setCreateDepartmentName('');
    setCreateDepartmentError(null);
    setCreateDepartmentSuccess(false);
    setIsCreateDepartmentModalOpen(true);
  };

  const handleCreateDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createDepartmentName.trim()) return;

    setCreateDepartmentLoading(true);
    setCreateDepartmentError(null);
    setCreateDepartmentSuccess(false);

    try {
      if (!schoolId) throw new Error("No active school in workspace");

      await apiClient.post('api/v1/academics/departments', {
        schoolId,
        name: createDepartmentName.trim()
      });

      setCreateDepartmentSuccess(true);
      setCreateDepartmentName('');
      setTimeout(() => {
        setIsCreateDepartmentModalOpen(false);
        setCreateDepartmentSuccess(false);
      }, 1500);

      // Refresh list
      fetchTabData('departments', 0);

    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setCreateDepartmentError(err.message || 'Failed to create department');
      } else {
        setCreateDepartmentError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setCreateDepartmentLoading(false);
    }
  };

  const openCreateSubjectGroupModal = () => {
    setCreateSubjectGroupName('');
    setCreateSubjectGroupError(null);
    setCreateSubjectGroupSuccess(false);
    setIsCreateSubjectGroupModalOpen(true);
  };

  const handleCreateSubjectGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createSubjectGroupName.trim()) return;

    setCreateSubjectGroupLoading(true);
    setCreateSubjectGroupError(null);
    setCreateSubjectGroupSuccess(false);

    try {
      if (!schoolId) throw new Error("No active school in workspace");

      await apiClient.post('api/v1/academics/subject-groups', {
        schoolId,
        name: createSubjectGroupName.trim()
      });

      setCreateSubjectGroupSuccess(true);
      setCreateSubjectGroupName('');
      setTimeout(() => {
        setIsCreateSubjectGroupModalOpen(false);
        setCreateSubjectGroupSuccess(false);
      }, 1500);

      // Refresh list
      fetchTabData('subject-groups', 0);

    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setCreateSubjectGroupError(err.message || 'Failed to create subjectgroup');
      } else {
        setCreateSubjectGroupError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setCreateSubjectGroupLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !editName.trim()) return;

    setEditLoading(true);
    setEditError(null);
    setEditSuccess(false);

    try {
      await apiClient.put(`api/v1/academics/${editItem.type}/${editItem.id}`, {
        name: editName.trim()
      });

      setEditSuccess(true);
      setTimeout(() => {
        setEditItem(null);
        setEditSuccess(false);
      }, 1500);

      fetchTabData(editItem.type, 0);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setEditError(err.message || `Failed to update ${editItem.type}`);
      } else {
        setEditError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteItem) return;

    setDeleteLoading(true);
    setDeleteError(null);
    setDeleteSuccess(false);

    try {
      await apiClient.delete(`api/v1/academics/${deleteItem.type}/${deleteItem.id}`);

      setDeleteSuccess(true);
      setTimeout(() => {
        setDeleteItem(null);
        setDeleteSuccess(false);
      }, 1500);

      fetchTabData(deleteItem.type, 0);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setDeleteError(err.message || `Failed to delete ${deleteItem.type}`);
      } else {
        setDeleteError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const currentState = tabStates[activeTab];

  // Define columns based on active tab
  const columns: Column<Record<string, unknown>>[] = [
    { header: 'ID', accessor: 'id', hideOnMobile: true },
    { header: 'Name', accessor: 'name' },
    {
      header: 'Actions',
      accessor: (item: Record<string, unknown>) => (
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setEditItem({ id: item.id as string, name: item.name as string, type: activeTab });
              setEditName(item.name as string);
            }}
            className="text-brand-gold hover:text-brand-gold-hover font-medium transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => {
              setDeleteItem({ id: item.id as string, name: item.name as string, type: activeTab });
            }}
            className="text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      )
    }
  ];

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
        {activeTab === 'arms' && (
          <button
            onClick={openCreateArmModal}
            className="inline-flex items-center rounded-md bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 dark:focus:ring-offset-brand-navy"
          >
            Add Arm
          </button>
        )}
        {activeTab === 'subjects' && (
          <button
            onClick={openCreateSubjectModal}
            className="inline-flex items-center rounded-md bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 dark:focus:ring-offset-brand-navy"
          >
            Add Subject
          </button>
        )}

        {activeTab === 'campuses' && (
          <button
            onClick={openCreateCampusModal}
            className="inline-flex items-center rounded-md bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 dark:focus:ring-offset-brand-navy"
          >
            Add Campus
          </button>
        )}

        {activeTab === 'departments' && (
          <button
            onClick={openCreateDepartmentModal}
            className="inline-flex items-center rounded-md bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 dark:focus:ring-offset-brand-navy"
          >
            Add Department
          </button>
        )}

        {activeTab === 'subject-groups' && (
          <button
            onClick={openCreateSubjectGroupModal}
            className="inline-flex items-center rounded-md bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 dark:focus:ring-offset-brand-navy"
          >
            Add Subject Group
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

      {isCreateArmModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-brand-navy/80 backdrop-blur-sm transition-opacity" onClick={() => setIsCreateArmModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-brand-navy-surface border border-gray-200 dark:border-brand-border-dark px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-brand-navy dark:text-brand-offwhite">Add Arm</h3>
                <form onSubmit={handleCreateArmSubmit} className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="armClassId" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Class
                      </label>
                      <div className="mt-2">
                        <select
                          id="armClassId"
                          name="armClassId"
                          required
                          value={createArmClassId}
                          onChange={(e) => setCreateArmClassId(e.target.value)}
                          disabled={createArmLoading || tabStates['classes'].loading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        >
                          <option value="">Select a Class</option>
                          {tabStates['classes'].data.map((c: Record<string, unknown>) => (
                            <option key={c.id as string} value={c.id as string}>
                              {c.name as string}
                            </option>
                          ))}
                        </select>
                        {tabStates['classes'].loading && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-brand-gray-text">Loading classes...</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="armCampusId" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Campus
                      </label>
                      <div className="mt-2">
                        <select
                          id="armCampusId"
                          name="armCampusId"
                          required
                          value={createArmCampusId}
                          onChange={(e) => setCreateArmCampusId(e.target.value)}
                          disabled={createArmLoading || campusesLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        >
                          <option value="">Select a Campus</option>
                          {campusesList.map((c: Record<string, unknown>) => (
                            <option key={c.id as string} value={c.id as string}>
                              {c.name as string}
                            </option>
                          ))}
                        </select>
                        {campusesLoading && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-brand-gray-text">Loading campuses...</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="armName" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Arm Name
                      </label>
                      <div className="mt-2">
                        <input
                          type="text"
                          name="armName"
                          id="armName"
                          required
                          value={createArmName}
                          onChange={(e) => setCreateArmName(e.target.value)}
                          disabled={createArmLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark placeholder:text-gray-400 dark:placeholder:text-brand-gray-text focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                          placeholder="e.g. Science"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {createArmError && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {createArmError}
                    </div>
                  )}
                  {createArmSuccess && (
                    <div className="mt-2 text-sm text-brand-teal">
                      Arm created successfully!
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateArmModalOpen(false)}
                      disabled={createArmLoading}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-brand-navy-surface px-3 py-2 text-sm font-semibold text-gray-900 dark:text-brand-offwhite shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark hover:bg-gray-50 dark:hover:bg-brand-navy sm:col-start-1 sm:mt-0 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createArmLoading || !createArmName.trim() || !createArmClassId || !createArmCampusId}
                      className="inline-flex w-full justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold sm:col-start-2 disabled:opacity-50 transition-colors"
                    >
                      {createArmLoading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateSubjectModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-brand-navy/80 backdrop-blur-sm transition-opacity" onClick={() => setIsCreateSubjectModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-brand-navy-surface border border-gray-200 dark:border-brand-border-dark px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-brand-navy dark:text-brand-offwhite">Add Subject</h3>
                <form onSubmit={handleCreateSubjectSubmit} className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="subjectSchoolId" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        School
                      </label>
                      <div className="mt-2">
                        <select
                          id="subjectSchoolId"
                          name="subjectSchoolId"
                          required
                          value={createSubjectSchoolId}
                          onChange={(e) => setCreateSubjectSchoolId(e.target.value)}
                          disabled={createSubjectLoading || schoolsLoading}
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
                      <label htmlFor="subjectGroupId" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Subject Group (Optional)
                      </label>
                      <div className="mt-2">
                        <select
                          id="subjectGroupId"
                          name="subjectGroupId"
                          value={createSubjectGroupId}
                          onChange={(e) => setCreateSubjectGroupId(e.target.value)}
                          disabled={createSubjectLoading || subjectGroupsLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        >
                          <option value="">No Group</option>
                          {subjectGroupsList.map((sg: Record<string, unknown>) => (
                            <option key={sg.id as string} value={sg.id as string}>
                              {sg.name as string}
                            </option>
                          ))}
                        </select>
                        {subjectGroupsLoading && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-brand-gray-text">Loading groups...</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="subjectName" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                        Subject Name
                      </label>
                      <div className="mt-2">
                        <input
                          type="text"
                          name="subjectName"
                          id="subjectName"
                          required
                          value={createSubjectName}
                          onChange={(e) => setCreateSubjectName(e.target.value)}
                          disabled={createSubjectLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark placeholder:text-gray-400 dark:placeholder:text-brand-gray-text focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                          placeholder="e.g. Mathematics"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {createSubjectError && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {createSubjectError}
                    </div>
                  )}
                  {createSubjectSuccess && (
                    <div className="mt-2 text-sm text-brand-teal">
                      Subject created successfully!
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateSubjectModalOpen(false)}
                      disabled={createSubjectLoading}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-brand-navy-surface px-3 py-2 text-sm font-semibold text-gray-900 dark:text-brand-offwhite shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark hover:bg-gray-50 dark:hover:bg-brand-navy sm:col-start-1 sm:mt-0 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createSubjectLoading || !createSubjectName.trim() || !createSubjectSchoolId}
                      className="inline-flex w-full justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold sm:col-start-2 disabled:opacity-50 transition-colors"
                    >
                      {createSubjectLoading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-brand-navy/80 backdrop-blur-sm transition-opacity" onClick={() => setEditItem(null)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-brand-navy-surface border border-gray-200 dark:border-brand-border-dark px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-brand-navy dark:text-brand-offwhite capitalize">Edit {editItem.type.replace('-', ' ')}</h3>
                <form onSubmit={handleEditSubmit} className="mt-4">
                  <div>
                    <label htmlFor="editName" className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite">
                      Name
                    </label>
                    <div className="mt-2">
                      <input
                        type="text"
                        name="editName"
                        id="editName"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={editLoading}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                      />
                    </div>
                  </div>

                  {editError && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {editError}
                    </div>
                  )}
                  {editSuccess && (
                    <div className="mt-2 text-sm text-brand-teal">
                      Updated successfully!
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEditItem(null)}
                      disabled={editLoading}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-brand-navy-surface px-3 py-2 text-sm font-semibold text-gray-900 dark:text-brand-offwhite shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark hover:bg-gray-50 dark:hover:bg-brand-navy sm:col-start-1 sm:mt-0 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading || !editName.trim() || editName === editItem.name}
                      className="inline-flex w-full justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold sm:col-start-2 disabled:opacity-50 transition-colors"
                    >
                      {editLoading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteItem && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-brand-navy/80 backdrop-blur-sm transition-opacity" onClick={() => setDeleteItem(null)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-brand-navy-surface border border-gray-200 dark:border-brand-border-dark px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-brand-navy dark:text-brand-offwhite">Confirm Deletion</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-brand-gray-text">
                    Are you sure you want to delete the <span className="font-semibold text-gray-900 dark:text-brand-offwhite">{deleteItem.name}</span> {deleteItem.type.replace('-', ' ')}?
                    This action cannot be undone.
                  </p>
                  {deleteItem.type === 'subject-groups' && (
                    <div className="mt-3 rounded-md bg-yellow-50 dark:bg-yellow-900/30 p-3">
                      <div className="flex">
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warning: Ungrouping Subjects</h3>
                          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                            <p>Deleting this group will remove it from all associated Subjects. The subjects themselves will remain, but they will no longer be grouped.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {deleteError && (
                  <div className="mt-3 text-sm text-red-600 dark:text-red-400">
                    {deleteError}
                  </div>
                )}
                {deleteSuccess && (
                  <div className="mt-3 text-sm text-brand-teal">
                    Deleted successfully!
                  </div>
                )}

                <div className="mt-5 sm:mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteItem(null)}
                    disabled={deleteLoading}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-brand-navy-surface px-3 py-2 text-sm font-semibold text-gray-900 dark:text-brand-offwhite shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark hover:bg-gray-50 dark:hover:bg-brand-navy sm:col-start-1 sm:mt-0 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSubmit}
                    disabled={deleteLoading}
                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:col-start-2 disabled:opacity-50 transition-colors"
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
