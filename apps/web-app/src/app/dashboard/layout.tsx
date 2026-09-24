"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import DashboardRoute from '@/components/DashboardRoute';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { name: 'Academics', href: '/dashboard/academics', icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
  { name: 'Students', href: '/dashboard/students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { name: 'Admissions', href: '/dashboard/admissions', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { name: 'Staff', href: '/dashboard/staff', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { name: 'Finance', href: '/dashboard/finance', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { name: 'Attendance', href: '/dashboard/attendance', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { name: 'Movement', href: '/dashboard/movement', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  { name: 'Scanner', href: '/dashboard/scanner', icon: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();
  const { clearWorkspace } = useWorkspace();

  const handleLogout = () => {
    logout();
  };

  const handleChangeWorkspace = () => {
    clearWorkspace();
  };

  return (
    <DashboardRoute>
      <div className="flex h-screen bg-brand-offwhite dark:bg-brand-navy">
        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-brand-navy dark:bg-brand-navy-surface border-r border-transparent dark:border-brand-border-dark transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-16 shrink-0 items-center px-6">
            <h1 className="text-xl font-bold text-white tracking-wider">SchoolOS</h1>
          </div>
          <nav className="flex flex-1 flex-col mt-5 px-3">
            <div className="space-y-1 flex-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-gold text-brand-navy dark:bg-brand-gold dark:text-brand-navy' : 'text-gray-300 hover:bg-white/10 hover:text-white dark:text-brand-gray-text dark:hover:bg-brand-border-dark dark:hover:text-brand-offwhite'
                    }`}
                  >
                    <svg className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-brand-navy' : 'text-gray-400 group-hover:text-gray-300 dark:text-brand-gray-text dark:group-hover:text-brand-offwhite'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    {item.name}
                  </Link>
                );
              })}
            </div>
            
            <div className="mt-auto pb-4 pt-4 border-t border-white/10 dark:border-brand-border-dark space-y-1">
              <button
                onClick={handleChangeWorkspace}
                className="group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white dark:text-brand-gray-text dark:hover:bg-brand-border-dark dark:hover:text-brand-offwhite transition-colors"
              >
                <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-300 dark:text-brand-gray-text dark:group-hover:text-brand-offwhite" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Change Workspace
              </button>
              <button
                onClick={handleLogout}
                className="group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-red-400 hover:bg-white/10 hover:text-red-300 dark:text-red-400/80 dark:hover:bg-brand-border-dark dark:hover:text-red-400 transition-colors"
              >
                <svg className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-300 dark:text-red-400/80 dark:group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile Header */}
          <div className="flex h-16 items-center justify-between bg-white dark:bg-brand-navy-surface border-b border-gray-200 dark:border-brand-border-dark px-4 shadow-sm md:hidden">
            <h1 className="text-lg font-bold text-brand-navy dark:text-brand-offwhite">SchoolOS</h1>
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="text-gray-500 hover:text-gray-900 dark:text-brand-gray-text dark:hover:text-brand-offwhite focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex h-16 items-center justify-end px-8 border-b border-gray-200 dark:border-brand-border-dark bg-white dark:bg-brand-navy-surface shadow-sm">
            <ThemeSwitcher />
          </div>

          {/* Main scrollable content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </DashboardRoute>
  );
}
