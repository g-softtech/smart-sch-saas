"use client";

import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function DashboardPage() {
  const { tenantId, schoolId } = useWorkspace();

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h3 className="text-2xl font-semibold leading-6 text-gray-900">Workspace Dashboard</h3>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">
          You have securely entered the protected verification shell. 
        </p>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <h4 className="text-lg font-medium text-gray-900">Active Context</h4>
          <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Tenant ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border border-gray-200 break-all">{tenantId}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">School ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border border-gray-200 break-all">{schoolId}</dd>
            </div>
          </dl>
          
          <div className="mt-8 rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="ml-3 flex-1 md:flex md:justify-between">
                <p className="text-sm text-blue-700">
                  This shell validates that your frontend can successfully hold and enforce the workspace token. 
                  Navigate to the specific domain tabs in the sidebar to verify the read-only APIs for Phase 1-13 domains.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
