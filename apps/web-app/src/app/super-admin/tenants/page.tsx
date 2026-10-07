"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function TenantsPage() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [skip, setSkip] = useState(0);
  const take = 10;

  const fetchTenants = useCallback(() => {
    if (!token) return;
    setLoading(true);

    const params = new URLSearchParams({
      skip: skip.toString(),
      take: take.toString(),
      ...(searchTerm && { search: searchTerm })
    });

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/platform/tenants?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch tenants');
        return res.json();
      })
      .then(data => {
        setTenants(data.data);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load tenants.');
        setLoading(false);
      });
  }, [token, skip, take, searchTerm]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSkip(0);
    fetchTenants();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tenants</h2>
        <Link 
          href="/super-admin/onboarding"
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-gold px-4 py-2 text-sm font-medium text-brand-navy shadow-sm hover:bg-brand-gold/90 focus:outline-none"
        >
          Provision Tenant
        </Link>
      </div>

      <div className="rounded-lg bg-white shadow dark:bg-brand-navy-surface p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-brand-teal focus:ring-brand-teal dark:bg-brand-navy dark:border-brand-border-dark dark:text-white sm:text-sm"
          />
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none dark:bg-brand-navy dark:border-brand-border-dark dark:text-gray-300 dark:hover:bg-brand-border-dark"
          >
            Search
          </button>
        </form>
      </div>

      <div className="rounded-lg bg-white shadow dark:bg-brand-navy-surface overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-sm text-red-800 dark:text-red-400">
            {error}
          </div>
        )}
        
        <table className="min-w-full divide-y divide-gray-200 dark:divide-brand-border-dark">
          <thead className="bg-gray-50 dark:bg-brand-navy">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Slug</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Schools</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-brand-navy-surface dark:divide-brand-border-dark">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                  <div className="flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-gold border-t-transparent"></div>
                  </div>
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  No tenants found.
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{tenant.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Created: {new Date(tenant.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">{tenant.slug}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{tenant._count?.schools || 0}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      tenant.status === 'SUSPENDED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/super-admin/tenants/${tenant.id}`} className="text-brand-teal hover:text-brand-gold">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 dark:bg-brand-navy-surface dark:border-brand-border-dark">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setSkip(Math.max(0, skip - take))}
              disabled={skip === 0}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:bg-brand-navy dark:border-brand-border-dark dark:text-gray-300"
            >
              Previous
            </button>
            <button
              onClick={() => setSkip(skip + take)}
              disabled={skip + take >= total}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:bg-brand-navy dark:border-brand-border-dark dark:text-gray-300"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-400">
                Showing <span className="font-medium">{Math.min(skip + 1, total)}</span> to <span className="font-medium">{Math.min(skip + take, total)}</span> of <span className="font-medium">{total}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setSkip(Math.max(0, skip - take))}
                  disabled={skip === 0}
                  className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:bg-brand-navy dark:border-brand-border-dark dark:text-gray-400"
                >
                  Previous
                </button>
                <button
                  onClick={() => setSkip(skip + take)}
                  disabled={skip + take >= total}
                  className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:bg-brand-navy dark:border-brand-border-dark dark:text-gray-400"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
