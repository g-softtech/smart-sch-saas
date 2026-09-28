"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  User,
  Calendar,
  BookOpen,
  LogOut,
  GraduationCap,
} from "lucide-react";

export default function TeacherPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const navItems = [
    {
      name: "Dashboard",
      href: "/portal/teacher/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Profile",
      href: "/portal/teacher/profile",
      icon: User,
    },
    {
      name: "Timetable",
      href: "/portal/teacher/timetable",
      icon: Calendar,
    },
    {
      name: "Assigned Classes",
      href: "/portal/teacher/classes",
      icon: BookOpen,
    },
  ];

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col font-sans">
      {/* Navbar Header */}
      <header className="bg-[#0A192E]/95 border-b border-[#1E3A5F] sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Brand */}
            <Link href="/portal/teacher/dashboard" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#D2AD36]/10 border border-[#D2AD36]/30 flex items-center justify-center shadow-inner">
                <GraduationCap className="h-5 w-5 text-[#D2AD36]" />
              </div>
              <div>
                <span className="text-lg font-extrabold text-white tracking-tight">
                  School<span className="text-[#D2AD36]">OS</span>
                </span>
                <span className="text-[10px] font-bold block text-[#D2AD36] uppercase tracking-wider">
                  Teacher Portal
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? "bg-[#D2AD36] text-[#0A192E] font-bold shadow-md shadow-[#D2AD36]/20"
                        : "text-slate-300 hover:bg-[#1E3A5F]/50 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile Info & Logout */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold text-slate-100">
                Authenticated Teacher
              </span>
              <span className="text-[10px] text-[#D2AD36] font-mono font-semibold">
                TEACHING STAFF
              </span>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around border-t border-[#1E3A5F]/60 px-2 py-1.5 bg-[#070B14]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition ${
                  isActive
                    ? "text-[#D2AD36] font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4 mb-0.5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1E3A5F]/60 py-6 text-center text-xs text-slate-500 bg-[#070B14]">
        <p>&copy; {new Date().getFullYear()} SchoolOS SaaS Platform. Zero-Trust Teacher Portal Context.</p>
      </footer>
    </div>
  );
}
