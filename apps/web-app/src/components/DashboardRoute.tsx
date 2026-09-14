"use client";

import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import ProtectedRoute from './ProtectedRoute';

export default function DashboardRoute({ children }: { children: ReactNode }) {
  const { tenantId, schoolId } = useWorkspace();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only evaluate routing after authentication is known
    if (isLoading) return;

    if (isAuthenticated && (!tenantId || !schoolId)) {
      router.push('/workspaces');
    }
  }, [isLoading, isAuthenticated, tenantId, schoolId, router]);

  // If still loading auth, render the ProtectedRoute which will show the loading state
  if (isLoading) {
    return <ProtectedRoute>{null}</ProtectedRoute>;
  }

  // If not authenticated, let ProtectedRoute handle the redirect
  if (!isAuthenticated) {
    return <ProtectedRoute>{null}</ProtectedRoute>;
  }

  // If authenticated but no workspace, we are redirecting, so return null
  if (!tenantId || !schoolId) {
    return null;
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}
