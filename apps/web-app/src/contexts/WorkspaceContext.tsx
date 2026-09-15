"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WorkspaceContextType {
  tenantId: string | null;
  schoolId: string | null;
  setWorkspace: (tenantId: string, schoolId: string) => void;
  clearWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    const storedTenant = localStorage.getItem('x-tenant-id');
    const storedSchool = localStorage.getItem('x-school-id');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (storedTenant) setTenantId(storedTenant);
    if (storedSchool) setSchoolId(storedSchool);
  }, []);

  const setWorkspace = (newTenantId: string, newSchoolId: string) => {
    localStorage.setItem('x-tenant-id', newTenantId);
    localStorage.setItem('x-school-id', newSchoolId);
    setTenantId(newTenantId);
    setSchoolId(newSchoolId);
  };

  const clearWorkspace = () => {
    localStorage.removeItem('x-tenant-id');
    localStorage.removeItem('x-school-id');
    setTenantId(null);
    setSchoolId(null);
  };

  return (
    <WorkspaceContext.Provider value={{ tenantId, schoolId, setWorkspace, clearWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
