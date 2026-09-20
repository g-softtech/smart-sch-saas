"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface WorkflowStage {
  key: string;
  label: string;
  type: string;
}

interface PublishedForm {
  id: string;
  title: string;
  publicToken: string;
  academicYear?: { name: string };
  targetClass?: { name: string };
  workflowStages: WorkflowStage[];
}

interface Application {
  id: string;
  trackingToken: string;
  status: string;
  currentStageKey: string | null;
  applicant: {
    firstName: string;
    lastName: string;
    gender?: string;
    dateOfBirth?: string;
  };
  formData: Record<string, unknown>;
  createdAt: string;
}

  export default function AdmissionsReviewBoard() {
    const { schoolId } = useWorkspace();
    const [forms, setForms] = useState<PublishedForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [applications, setApplications] = useState<Application[]>([]);
  
  const [formsLoading, setFormsLoading] = useState(false);
  const [appsLoading, setAppsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch forms when workspace changes
  useEffect(() => {
    let isMounted = true;
    
    const fetchForms = async () => {
      if (!schoolId) return;
      
      setFormsLoading(true);
      setError(null);
      setSelectedFormId('');
      setApplications([]);
      setSelectedApp(null);
      
      try {
        const response = await apiClient.get('api/v1/admissions/forms');
        if (isMounted) {
          const fetchedForms = Array.isArray(response) ? response : (response.data || []);
          setForms(fetchedForms);
          if (fetchedForms.length > 0) {
            setSelectedFormId(fetchedForms[0].id);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof ApiError && err.status === 403 
            ? 'You do not have permission to view forms for this school.' 
            : 'Failed to load admission forms.');
        }
      } finally {
        if (isMounted) {
          setFormsLoading(false);
        }
      }
    };

    fetchForms();
    
    return () => { isMounted = false; };
  }, [schoolId]);

  // Fetch applications when selected form changes
  const fetchApplications = useCallback(async (formId: string) => {
    if (!formId) return;
    
    setAppsLoading(true);
    try {
      const response = await apiClient.get(`api/v1/admissions/applications?formId=${formId}`);
      setApplications(Array.isArray(response) ? response : (response.data || []));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load applications.');
    } finally {
      setAppsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFormId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchApplications(selectedFormId);
    }
  }, [selectedFormId, fetchApplications]);

  const selectedForm = forms.find(f => f.id === selectedFormId);

  // Generate Columns
  const getColumns = () => {
    if (!selectedForm) return [];
    
    type ColumnDef = { id: string; title: string; isStatus: boolean; status?: string; stageKey?: string };
    
    const cols: ColumnDef[] = [
      { id: 'SUBMITTED', title: 'Submitted', isStatus: true, status: 'SUBMITTED' }
    ];

    const stages = selectedForm.workflowStages || [];
    stages.forEach(stage => {
      cols.push({
        id: `STAGE_${stage.key}`,
        title: stage.label,
        isStatus: false,
        stageKey: stage.key
      });
    });

    cols.push({ id: 'APPROVED', title: 'Approved', isStatus: true, status: 'APPROVED' });
    cols.push({ id: 'WAITLISTED', title: 'Waitlisted', isStatus: true, status: 'WAITLISTED' });
    cols.push({ id: 'REJECTED', title: 'Rejected', isStatus: true, status: 'REJECTED' });
    cols.push({ id: 'ENROLLED', title: 'Enrolled', isStatus: true, status: 'ENROLLED' });

    return cols;
  };

  const columns = getColumns();

  const getAppsForColumn = (col: { id: string; title: string; isStatus: boolean; status?: string; stageKey?: string }) => {
    if (col.isStatus) {
      return applications.filter(app => app.status === col.status);
    }
    return applications.filter(app => app.status === 'UNDER_REVIEW' && app.currentStageKey === col.stageKey);
  };

  const handleAction = async (action: 'START' | 'PASS' | 'FAIL' | 'WAITLIST' | 'ENROLL') => {
    if (!selectedApp) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (action === 'START') {
        await apiClient.post(`api/v1/admissions/applications/${selectedApp.id}/start-review`, {});
      } else if (action === 'ENROLL') {
        await apiClient.post(`api/v1/admissions/applications/${selectedApp.id}/enroll`, {});
      } else {
        const decisionMap = { 'PASS': 'STAGE_PASS', 'FAIL': 'STAGE_FAIL', 'WAITLIST': 'WAITLIST' };
        await apiClient.post(`api/v1/admissions/applications/${selectedApp.id}/reviews`, {
          decision: decisionMap[action]
        });
      }
      // Refresh board
      await fetchApplications(selectedFormId);
      setSelectedApp(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed due to an unknown error.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="sm:flex sm:items-center sm:justify-between shrink-0 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy dark:text-brand-offwhite">Review Board</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-brand-gray-text">
            Dynamic Kanban board based on published form workflow.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          {formsLoading ? (
            <div className="animate-pulse bg-gray-200 h-10 w-64 rounded-md"></div>
          ) : forms.length > 0 ? (
            <select
              value={selectedFormId}
              onChange={(e) => {
                setSelectedFormId(e.target.value);
                setSelectedApp(null);
              }}
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-brand-gold focus:outline-none focus:ring-brand-gold sm:text-sm dark:bg-brand-navy-surface dark:border-brand-border-dark dark:text-brand-offwhite"
            >
              {forms.map(f => (
                <option key={f.id} value={f.id}>
                  {f.title} {f.academicYear ? `(${f.academicYear.name})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm text-gray-500 italic">No forms available</div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 shrink-0 mb-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board Area */}
      <div className="flex-1 min-h-[500px] overflow-hidden relative border-t border-gray-200 dark:border-brand-border-dark pt-6">
        {!selectedFormId && !formsLoading && !error ? (
          <div className="text-center py-12 bg-white dark:bg-brand-navy-surface rounded-lg shadow-sm border border-gray-200 dark:border-brand-border-dark">
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No form selected</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select an admission form to view the review board.</p>
          </div>
        ) : (
          <div className="h-full overflow-x-auto flex space-x-4 pb-4">
            {columns.map(col => {
              const colApps = getAppsForColumn(col);
              // Hide empty terminal columns to save space, but always show SUBMITTED and active stages
              if (col.status && ['WAITLISTED', 'REJECTED', 'ENROLLED'].includes(col.status) && colApps.length === 0) {
                return null;
              }
              
              return (
                <div key={col.id} className="flex flex-col w-80 shrink-0 bg-gray-50 dark:bg-brand-navy-surface rounded-lg p-3 border border-gray-200 dark:border-brand-border-dark h-full">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>{col.title}</span>
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5">{colApps.length}</span>
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
                    {appsLoading ? (
                      <div className="animate-pulse space-y-3">
                        <div className="bg-white dark:bg-brand-navy h-24 rounded-md border border-gray-200 dark:border-brand-border-dark"></div>
                        <div className="bg-white dark:bg-brand-navy h-24 rounded-md border border-gray-200 dark:border-brand-border-dark"></div>
                      </div>
                    ) : colApps.length === 0 ? (
                      <div className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-md">Empty</div>
                    ) : (
                      colApps.map(app => (
                        <div 
                          key={app.id} 
                          onClick={() => setSelectedApp(app)}
                          className="bg-white dark:bg-brand-navy p-4 rounded-md shadow-sm border border-gray-200 dark:border-brand-border-dark cursor-pointer hover:border-brand-gold hover:shadow-md transition-all group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-brand-navy dark:text-white truncate">
                              {app.applicant?.firstName} {app.applicant?.lastName}
                            </h4>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-brand-gray-text font-mono truncate mb-3">
                            Ref: {app.id.substring(0, 8).toUpperCase()}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-brand-border-dark">
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {new Date(app.createdAt).toLocaleDateString()}
                            </span>
                            <span className="text-xs font-medium text-brand-gold opacity-0 group-hover:opacity-100 transition-opacity">
                              Review &rarr;
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedApp && (
        <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => !actionLoading && setSelectedApp(null)}></div>
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-brand-navy px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6 border border-gray-200 dark:border-brand-border-dark">
                <div>
                  <h3 className="text-xl font-bold leading-6 text-brand-navy dark:text-white" id="modal-title">
                    Review Application
                  </h3>
                  <div className="mt-4">
                    <div className="bg-gray-50 dark:bg-brand-navy-surface rounded-md p-4 mb-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-200 mb-2">Applicant Info</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div><span className="font-semibold text-gray-900 dark:text-gray-300">Name:</span> {selectedApp.applicant?.firstName} {selectedApp.applicant?.lastName}</div>
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-gray-300">Status:</span>{' '}
                          <span className="bg-brand-navy text-white dark:bg-brand-gold dark:text-brand-navy text-xs px-2 py-1 rounded-full font-medium">
                            {selectedApp.status}
                          </span>
                        </div>
                        <div><span className="font-semibold text-gray-900 dark:text-gray-300">Reference:</span> {selectedApp.id.substring(0,8).toUpperCase()}</div>
                        <div><span className="font-semibold text-gray-900 dark:text-gray-300">Gender:</span> {selectedApp.applicant?.gender || 'N/A'}</div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-brand-navy-surface rounded-md p-4 mb-6 max-h-64 overflow-y-auto">
                      <h4 className="font-medium text-gray-900 dark:text-gray-200 mb-2">Form Data</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {Object.entries(selectedApp.formData || {}).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <div className="text-xs text-gray-500 uppercase tracking-wider">{key}</div>
                            <div className="text-gray-900 dark:text-gray-200 font-medium">{String(value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {actionError && (
                      <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-md border border-red-200 dark:border-red-800">{actionError}</div>
                    )}
                  </div>
                </div>
                
                <div className="mt-5 sm:mt-6 flex flex-wrap gap-3 justify-end border-t border-gray-200 dark:border-brand-border-dark pt-4">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => { setSelectedApp(null); setActionError(null); }}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0 sm:w-auto dark:bg-brand-navy-surface dark:text-brand-offwhite dark:ring-brand-border-dark dark:hover:bg-brand-navy"
                  >
                    Close
                  </button>
                  
                  {selectedApp.status === 'SUBMITTED' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleAction('START')}
                      className="inline-flex w-full justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-yellow-500 sm:col-start-2 sm:w-auto disabled:opacity-50 transition-colors"
                    >
                      {actionLoading ? 'Processing...' : 'Start Review'}
                    </button>
                  )}

                  {selectedApp.status === 'UNDER_REVIEW' && (
                    <>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleAction('FAIL')}
                        className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:w-auto disabled:opacity-50 transition-colors"
                      >
                        Fail Stage
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleAction('WAITLIST')}
                        className="inline-flex w-full justify-center rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 sm:w-auto disabled:opacity-50 transition-colors"
                      >
                        Waitlist
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleAction('PASS')}
                        className="inline-flex w-full justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 sm:w-auto disabled:opacity-50 transition-colors"
                      >
                        {actionLoading ? 'Processing...' : 'Pass Stage'}
                      </button>
                    </>
                  )}

                  {selectedApp.status === 'APPROVED' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleAction('ENROLL')}
                      className="inline-flex w-full justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 sm:w-auto disabled:opacity-50 transition-colors"
                    >
                      {actionLoading ? 'Processing...' : 'Enroll Student'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
