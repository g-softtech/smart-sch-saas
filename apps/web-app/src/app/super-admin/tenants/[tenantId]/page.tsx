"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function TenantDetailPage() {
  const { token } = useAuth();
  const { tenantId } = useParams();
  const router = useRouter();
  
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTenant = useCallback(() => {
    if (!token || !tenantId) return;
    setLoading(true);

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/platform/tenants/${tenantId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch tenant details');
        return res.json();
      })
      .then(data => {
        setTenant(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load tenant details.');
        setLoading(false);
      });
  }, [token, tenantId]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  const handleStatusChange = async (action: 'suspend' | 'reactivate') => {
    if (!confirm(`Are you sure you want to ${action} this tenant?`)) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/platform/provisioning/tenant/${tenantId}/${action}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) throw new Error(`Failed to ${action} tenant`);
      
      await fetchTenant(); // Refresh data
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-gold border-t-transparent"></div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
        <h3 className="text-sm font-medium text-red-800 dark:text-red-400">{error || 'Tenant not found'}</h3>
        <button onClick={() => router.push('/super-admin/tenants')} className="mt-2 text-sm text-brand-teal hover:underline">
          Back to Tenants
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => router.push('/super-admin/tenants')}
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{tenant.name}</h2>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
            tenant.status === 'SUSPENDED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
          }`}>
            {tenant.status}
          </span>
        </div>
        <div className="flex space-x-3">
          {tenant.status === 'ACTIVE' ? (
            <button
              onClick={() => handleStatusChange('suspend')}
              disabled={actionLoading}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none disabled:opacity-50"
            >
              Suspend Tenant
            </button>
          ) : tenant.status === 'SUSPENDED' ? (
            <button
              onClick={() => handleStatusChange('reactivate')}
              disabled={actionLoading}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none disabled:opacity-50"
            >
              Reactivate Tenant
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden bg-white shadow sm:rounded-lg dark:bg-brand-navy-surface">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Tenant Information</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Basic details and configuration.</p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0 dark:border-brand-border-dark">
          <dl className="sm:divide-y sm:divide-gray-200 dark:sm:divide-brand-border-dark">
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Tenant Name</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 dark:text-white">{tenant.name}</dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Slug</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 dark:text-white">{tenant.slug}</dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 dark:text-white">{new Date(tenant.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="overflow-hidden bg-white shadow sm:rounded-lg dark:bg-brand-navy-surface">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Schools & Campuses</h3>
        </div>
        <div className="border-t border-gray-200 dark:border-brand-border-dark">
          {tenant.schools && tenant.schools.length > 0 ? (
            <ul role="list" className="divide-y divide-gray-200 dark:divide-brand-border-dark">
              {tenant.schools.map((school: any) => (
                <li key={school.id} className="p-4 sm:px-6">
                  <div className="flex flex-col">
                    <h4 className="text-md font-bold text-brand-gold">{school.name}</h4>
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <strong>Campuses:</strong>
                      <ul className="mt-1 ml-4 list-disc space-y-1">
                        {school.campuses?.map((campus: any) => (
                          <li key={campus.id}>{campus.name}</li>
                        ))}
                      </ul>
                      {(!school.campuses || school.campuses.length === 0) && (
                        <p className="ml-4 italic text-gray-400">No campuses configured</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 sm:px-6 text-sm text-gray-500 dark:text-gray-400">No schools provisioned.</div>
          )}
        </div>
      </div>
    </div>
  );
}
