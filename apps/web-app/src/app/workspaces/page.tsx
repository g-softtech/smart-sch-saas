"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api-client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';

interface School {
  schoolId: string;
  schoolName: string;
}

interface TenantWorkspace {
  tenantId: string;
  tenantName: string;
  schools: School[];
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<TenantWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { setWorkspace } = useWorkspace();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchWorkspaces = async () => {
      try {
        const response = await apiClient.get('api/v1/auth/workspaces');
        
        // Ensure response is an array before setting
        if (Array.isArray(response)) {
          setWorkspaces(response);
        } else {
          setError('Received malformed data from the server.');
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(err.message || 'Failed to load workspaces.');
        } else {
          setError('An unexpected error occurred while loading workspaces.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, [isAuthLoading, isAuthenticated, router]);

  const handleSelectSchool = (tenantId: string, schoolId: string) => {
    setWorkspace(tenantId, schoolId);
    router.push('/dashboard');
  };

  if (isAuthLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-500">{isAuthLoading ? 'Authenticating...' : 'Loading your workspaces...'}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl space-y-6 rounded-xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Select Workspace</h2>
          <p className="mt-2 text-sm text-gray-600">Choose a school to continue.</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && workspaces.length === 0 && (
          <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-700 text-center">
            You do not have access to any workspaces. Please contact your administrator.
          </div>
        )}

        {!error && workspaces.length > 0 && (
          <div className="mt-8 space-y-6">
            {workspaces.map((tenant) => (
              <div key={tenant.tenantId} className="overflow-hidden rounded-lg border border-gray-200">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900">{tenant.tenantName}</h3>
                </div>
                <ul className="divide-y divide-gray-200">
                  {tenant.schools.map((school) => (
                    <li key={school.schoolId}>
                      <button
                        onClick={() => handleSelectSchool(tenant.tenantId, school.schoolId)}
                        className="flex w-full items-center justify-between px-4 py-4 hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none text-left transition-colors"
                      >
                        <span className="text-sm text-gray-700 font-medium">{school.schoolName}</span>
                        <span className="text-indigo-600 text-sm font-medium">Select &rarr;</span>
                      </button>
                    </li>
                  ))}
                  {tenant.schools.length === 0 && (
                    <li className="px-4 py-4 text-sm text-gray-500 text-center">
                      No schools available in this tenant.
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
