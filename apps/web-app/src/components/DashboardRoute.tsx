"use client";

import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import ProtectedRoute from './ProtectedRoute';

export default function DashboardRoute({ children }: { children: ReactNode }) {
  const { tenantId, schoolId } = useWorkspace();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If authenticated but no workspace selected, force selection
    if (isAuthenticated && (!tenantId || !schoolId)) {
      router.push('/workspaces');
    }
  }, [isAuthenticated, tenantId, schoolId, router]);

  if (!tenantId || !schoolId) {
    return (
      <ProtectedRoute>
        {null}
      </ProtectedRoute>
    );
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}
