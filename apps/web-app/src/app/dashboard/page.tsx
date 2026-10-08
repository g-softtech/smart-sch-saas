"use client";

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { apiClient } from '@/lib/api-client';

interface Campus {
  id: string;
  name: string;
}

interface School {
  id: string;
  name: string;
  accessLevel: 'FULL_SCHOOL' | 'CAMPUS_RESTRICTED';
  campuses: Campus[];
}

interface TenantWorkspace {
  tenantId: string;
  tenantName: string;
  schools: School[];
}

export default function DashboardPage() {
  const { tenantId, schoolId, campusId, setWorkspace } = useWorkspace();

  const [workspaceInfo, setWorkspaceInfo] = useState<{
    tenantName: string;
    schoolName: string;
    campusName: string | null;
    campuses: Campus[];
  } | null>(null);

  const [academics, setAcademics] = useState({ year: 'Loading...', term: 'Loading...' });
  const [metrics, setMetrics] = useState({ students: 0, staff: 0, classes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // 1. Fetch Workspaces to resolve human-readable names
        const workspaces = await apiClient.get<TenantWorkspace[]>('api/v1/identity/me/workspaces');

        const tenant = workspaces.find(t => t.tenantId === tenantId);
        const school = tenant?.schools.find(s => s.id === schoolId);
        const campus = school?.campuses.find(c => c.id === campusId);

        if (tenant && school) {
          setWorkspaceInfo({
            tenantName: tenant.tenantName,
            schoolName: school.name,
            campusName: campus?.name || null,
            campuses: school.campuses
          });
        }

        // 2. Fetch Academics Context
        try {
          const [yearsRes, termsRes] = await Promise.all([
            apiClient.get<any>('api/v1/academics/academic-years'),
            apiClient.get<any>('api/v1/academics/terms')
          ]);

          // Fallback to first available if active isn't explicitly flagged
          const year = yearsRes.data?.find((y: any) => y.isActive) || yearsRes.data?.[0];
          const term = termsRes.data?.find((t: any) => t.isActive) || termsRes.data?.[0];

          setAcademics({
            year: year?.name || 'Not set',
            term: term?.name || 'Not set'
          });
        } catch (e) {
          console.warn("Failed to load academics context", e);
          setAcademics({ year: 'Unknown', term: 'Unknown' });
        }

        // 3. Fetch Metrics (using existing workspace headers automatically)
        try {
          const [studentsRes, staffRes, classesRes] = await Promise.all([
            apiClient.get<any>('api/v1/students'),
            apiClient.get<any>('api/v1/staff'),
            apiClient.get<any>('api/v1/academics/classes')
          ]);

          setMetrics({
            students: studentsRes.data?.total ?? studentsRes.data?.items?.length ?? studentsRes.data?.length ?? 0,
            staff: staffRes.data?.total ?? staffRes.data?.items?.length ?? staffRes.data?.length ?? 0,
            classes: classesRes.data?.total ?? classesRes.data?.items?.length ?? classesRes.data?.length ?? 0,
          });
        } catch (e) {
          console.warn("Failed to load metrics", e);
        }

      } catch (err) {
        console.error("Dashboard initialization failed", err);
      } finally {
        setLoading(false);
      }
    }

    if (tenantId && schoolId) {
      loadDashboardData();
    }
  }, [tenantId, schoolId, campusId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent dark:border-white dark:border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-6 py-10 shadow-xl sm:px-12 sm:py-16">
        <div className="absolute inset-0 bg-[url('/bg-pattern.svg')] opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20 mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Workspace Active
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-2">
              {workspaceInfo?.schoolName || 'School Dashboard'}
            </h1>
            <p className="text-lg text-slate-300 flex items-center gap-2">
              <span className="text-amber-400 font-medium">
                {academics.year}
              </span>
              <span className="text-slate-500">&bull;</span>
              <span>{academics.term}</span>
            </p>
          </div>

          {/* Campus Selector */}
          <div className="w-full md:w-auto">
            {workspaceInfo?.campuses && workspaceInfo.campuses.length > 0 ? (
              <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-2 ring-1 ring-slate-700">
                <span className="text-sm text-slate-400 pl-2">Campus:</span>
                <select
                  className="bg-slate-900 text-white border border-slate-700 rounded-md py-1.5 pl-3 pr-8 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  value={campusId || ''}
                  onChange={(e) => setWorkspace(tenantId!, schoolId!, e.target.value || null)}
                >
                  <option value="">Entire School (All Campuses)</option>
                  {workspaceInfo.campuses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-lg px-4 py-2 ring-1 ring-slate-700">
                <span className="text-sm font-medium text-white">
                  {workspaceInfo?.campusName || 'Main Campus'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div>
        <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Overview</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">

          {/* Students Card */}
          <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-800 shadow ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md bg-amber-100 dark:bg-amber-900/30 p-3">
                  <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">Total Enrolled</dt>
                  <dd className="mt-1 flex items-baseline justify-between text-2xl font-semibold text-slate-900 dark:text-white">
                    {metrics.students}
                    <span className="text-sm font-medium text-slate-500">Students</span>
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Staff Card */}
          <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-800 shadow ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md bg-teal-100 dark:bg-teal-900/30 p-3">
                  <svg className="h-6 w-6 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">Active Personnel</dt>
                  <dd className="mt-1 flex items-baseline justify-between text-2xl font-semibold text-slate-900 dark:text-white">
                    {metrics.staff}
                    <span className="text-sm font-medium text-slate-500">Staff</span>
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Classes Card */}
          <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-800 shadow ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md bg-indigo-100 dark:bg-indigo-900/30 p-3">
                  <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 0120.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">Academics</dt>
                  <dd className="mt-1 flex items-baseline justify-between text-2xl font-semibold text-slate-900 dark:text-white">
                    {metrics.classes}
                    <span className="text-sm font-medium text-slate-500">Classes</span>
                  </dd>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
