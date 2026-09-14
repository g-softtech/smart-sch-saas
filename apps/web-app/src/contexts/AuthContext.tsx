"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Only load the token on the client-side to avoid hydration mismatches
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(storedToken);
    }
    setIsInitialized(true);
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('x-tenant-id');
    localStorage.removeItem('x-school-id');
    setToken(null);
  };

  // Prevent rendering protected content before initial token load
  if (!isInitialized) return null;

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
