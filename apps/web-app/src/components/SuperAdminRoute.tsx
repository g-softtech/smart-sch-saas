"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import ProtectedRoute from './ProtectedRoute';

export default function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { token, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoading && isAuthenticated && token) {
      // Check identity context
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data?.success && data?.data?.globalRole === 'SUPER_ADMIN') {
          setIsSuperAdmin(true);
        } else {
          setIsSuperAdmin(false);
          router.push('/dashboard');
        }
      })
      .catch(() => {
        setIsSuperAdmin(false);
        router.push('/dashboard');
      })
      .finally(() => {
        setChecking(false);
      });
    } else if (!isLoading && !isAuthenticated) {
      setChecking(false);
    }
  }, [isLoading, isAuthenticated, token, router]);

  if (isLoading || checking) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-brand-navy p-4">
          <p className="text-brand-offwhite animate-pulse">Verifying platform authorization...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (!isAuthenticated) {
    return <ProtectedRoute>{null}</ProtectedRoute>;
  }

  if (!isSuperAdmin) {
    return null; // Will redirect
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}
