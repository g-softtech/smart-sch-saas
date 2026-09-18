"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WorkspaceContextType {
  tenantId: string | null;
  schoolId: string | null;
  campusId: string | null;
  setWorkspace: (tenantId: string, schoolId: string, campusId?: string | null) => void;
  clearWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [campusId, setCampusId] = useState<string | null>(null);

  useEffect(() => {
    const storedTenant = localStorage.getItem('x-tenant-id');
    const storedSchool = localStorage.getItem('x-school-id');
    const storedCampus = localStorage.getItem('x-campus-id');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (storedTenant) setTenantId(storedTenant);
    if (storedSchool) setSchoolId(storedSchool);
    if (storedCampus) setCampusId(storedCampus);
  }, []);

  const setWorkspace = (newTenantId: string, newSchoolId: string, newCampusId?: string | null) => {
    localStorage.setItem('x-tenant-id', newTenantId);
    localStorage.setItem('x-school-id', newSchoolId);
    if (newCampusId) {
      localStorage.setItem('x-campus-id', newCampusId);
    } else {
      localStorage.removeItem('x-campus-id');
    }
    setTenantId(newTenantId);
    setSchoolId(newSchoolId);
    setCampusId(newCampusId || null);
  };

  const clearWorkspace = () => {
    localStorage.removeItem('x-tenant-id');
    localStorage.removeItem('x-school-id');
    localStorage.removeItem('x-campus-id');
    setTenantId(null);
    setSchoolId(null);
    setCampusId(null);
  };

  return (
    <WorkspaceContext.Provider value={{ tenantId, schoolId, campusId, setWorkspace, clearWorkspace }}>
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
