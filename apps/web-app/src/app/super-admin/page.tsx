"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface DashboardMetrics {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalSchools: number;
  totalCampuses: number;
  totalUsers: number;
  recentTenants: any[];
  recentAuditLogs: any[];
}

export default function SuperAdminDashboard() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/platform/metrics`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch metrics');
        return res.json();
      })
      .then(data => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load platform metrics.');
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-gold border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
        <h3 className="text-sm font-medium text-red-800 dark:text-red-400">{error}</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Overview</h2>
        <Link 
          href="/super-admin/onboarding"
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-gold px-4 py-2 text-sm font-medium text-brand-navy shadow-sm hover:bg-brand-gold/90 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2"
        >
          Provision New Tenant
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Metric Cards */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-brand-navy-surface">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Total Tenants</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics?.totalTenants}</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <span className="sr-only">Active</span>
                      {metrics?.activeTenants} active
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-brand-navy-surface">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Total Schools / Campuses</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics?.totalSchools} / {metrics?.totalCampuses}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-brand-navy-surface">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Total Platform Users</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics?.totalUsers}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Tenants */}
        <div className="rounded-lg bg-white shadow dark:bg-brand-navy-surface">
          <div className="border-b border-gray-200 px-4 py-5 sm:px-6 dark:border-brand-border-dark flex justify-between items-center">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Recent Tenants</h3>
            <Link href="/super-admin/tenants" className="text-sm font-medium text-brand-teal hover:text-brand-gold">
              View all
            </Link>
          </div>
          <ul role="list" className="divide-y divide-gray-200 dark:divide-brand-border-dark">
            {metrics?.recentTenants.map((tenant) => (
              <li key={tenant.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="truncate text-sm font-medium text-brand-gold">{tenant.name}</p>
                    <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">{tenant.slug}</p>
                  </div>
                  <div className="ml-2 flex flex-shrink-0">
                    <p className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      tenant.status === 'SUSPENDED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {tenant.status}
                    </p>
                  </div>
                </div>
              </li>
            ))}
            {metrics?.recentTenants.length === 0 && (
              <li className="px-4 py-4 sm:px-6 text-sm text-gray-500 text-center">No tenants found</li>
            )}
          </ul>
        </div>

        {/* Recent Audit Logs */}
        <div className="rounded-lg bg-white shadow dark:bg-brand-navy-surface">
          <div className="border-b border-gray-200 px-4 py-5 sm:px-6 dark:border-brand-border-dark">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Recent Platform Activity</h3>
          </div>
          <ul role="list" className="divide-y divide-gray-200 dark:divide-brand-border-dark max-h-96 overflow-y-auto">
            {metrics?.recentAuditLogs.map((log) => (
              <li key={log.id} className="px-4 py-4 sm:px-6">
                <div className="flex flex-col">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{log.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Actor: {log.actorId}</p>
                </div>
              </li>
            ))}
            {metrics?.recentAuditLogs.length === 0 && (
              <li className="px-4 py-4 sm:px-6 text-sm text-gray-500 text-center">No recent activity</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
