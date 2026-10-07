"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function TenantOnboardingPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ id: string, name: string } | null>(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    tenantName: '',
    tenantSlug: '',
    schoolName: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Auto-generate slug if tenantName changes and slug hasn't been manually edited much
    if (name === 'tenantName' && formData.tenantSlug === formData.tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')) {
      setFormData(prev => ({
        ...prev,
        tenantSlug: value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/platform/provisioning/tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('A tenant with this slug or email already exists. Please use unique values.');
        }
        throw new Error(data.message || 'Failed to provision tenant');
      }

      setSuccess({
        id: data.data?.tenant?.id || data.tenant?.id || data.id || 'unknown',
        name: formData.tenantName
      });
      
      // Clear form
      setFormData({
        tenantName: '',
        tenantSlug: '',
        schoolName: '',
        adminFirstName: '',
        adminLastName: '',
        adminEmail: '',
        adminPassword: '',
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred during provisioning.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-md bg-green-50 p-6 shadow dark:bg-green-900/20">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-green-800 dark:text-green-300">Successfully Provisioned Tenant</h3>
              <div className="mt-2 text-sm text-green-700 dark:text-green-400 space-y-2">
                <p>
                  Tenant <strong>{success.name}</strong> has been created successfully.
                </p>
                <p>
                  The system automatically created the initial School, the Main Campus, and the Super Admin account.
                </p>
              </div>
              <div className="mt-6">
                <div className="-mx-2 -my-1.5 flex gap-4">
                  <Link
                    href={`/super-admin/tenants/${success.id}`}
                    className="rounded-md bg-green-100 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-200 focus:outline-none dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60"
                  >
                    Inspect Tenant
                  </Link>
                  <button
                    onClick={() => setSuccess(null)}
                    className="rounded-md bg-transparent px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-100 focus:outline-none dark:text-green-300 dark:hover:bg-green-900/40"
                  >
                    Provision Another
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Provision New Tenant</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          This authoritative provisioning flow creates the Tenant, an initial School, the Main Campus, and assigns the initial Tenant Administrator in a single transaction.
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg dark:bg-brand-navy-surface">
        <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 dark:divide-brand-border-dark p-6 sm:p-8">
          
          {error && (
            <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">{error}</h3>
            </div>
          )}

          <div className="space-y-6 pt-2">
            <div>
              <h3 className="text-lg font-medium leading-6 text-brand-gold">Tenant Details</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Basic information identifying the tenant.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="tenantName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tenant Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="tenantName"
                    id="tenantName"
                    required
                    maxLength={100}
                    value={formData.tenantName}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-teal focus:ring-brand-teal sm:text-sm dark:bg-brand-navy dark:border-brand-border-dark dark:text-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="tenantSlug" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tenant Slug (Unique identifier)
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="tenantSlug"
                    id="tenantSlug"
                    required
                    maxLength={60}
                    pattern="^[a-z0-9-]+$"
                    title="Lowercase letters, numbers, and hyphens only"
                    value={formData.tenantSlug}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-teal focus:ring-brand-teal sm:text-sm dark:bg-brand-navy dark:border-brand-border-dark dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-8">
            <div>
              <h3 className="text-lg font-medium leading-6 text-brand-gold">Initial School</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">The first school to be created for this tenant. The "Main Campus" will be automatically provisioned for it.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  School Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="schoolName"
                    id="schoolName"
                    required
                    maxLength={100}
                    value={formData.schoolName}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-teal focus:ring-brand-teal sm:text-sm dark:bg-brand-navy dark:border-brand-border-dark dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-8">
            <div>
              <h3 className="text-lg font-medium leading-6 text-brand-gold">Initial Administrator</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                This user will receive the tenant-scoped SUPER_ADMIN role.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="adminFirstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  First Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="adminFirstName"
                    id="adminFirstName"
                    required
                    maxLength={100}
                    value={formData.adminFirstName}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-teal focus:ring-brand-teal sm:text-sm dark:bg-brand-navy dark:border-brand-border-dark dark:text-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="adminLastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Last Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="adminLastName"
                    id="adminLastName"
                    required
                    maxLength={100}
                    value={formData.adminLastName}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-teal focus:ring-brand-teal sm:text-sm dark:bg-brand-navy dark:border-brand-border-dark dark:text-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    name="adminEmail"
                    id="adminEmail"
                    required
                    value={formData.adminEmail}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-teal focus:ring-brand-teal sm:text-sm dark:bg-brand-navy dark:border-brand-border-dark dark:text-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Temporary Password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="adminPassword"
                    id="adminPassword"
                    required
                    minLength={8}
                    value={formData.adminPassword}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-teal focus:ring-brand-teal sm:text-sm dark:bg-brand-navy dark:border-brand-border-dark dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-brand-gold py-2 px-6 text-sm font-medium text-brand-navy shadow-sm hover:bg-brand-gold/90 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-brand-navy" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Provisioning...
                  </span>
                ) : 'Provision Tenant Hierarchy'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
