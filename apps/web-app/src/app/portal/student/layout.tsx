"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Award,
  QrCode,
  User,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  GraduationCap,
} from "lucide-react";

export default function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const navItems = [
    { name: "Dashboard", href: "/portal/student/dashboard", icon: BookOpen },
    { name: "My Timetable", href: "/portal/student/timetable", icon: Calendar },
    { name: "Homework & Tasks", href: "/portal/student/assignments", icon: FileText },
    { name: "CBT Exams", href: "/portal/student/cbt", icon: Clock },
    { name: "Academic Results", href: "/portal/student/results", icon: Award },
    { name: "Digital ID Card", href: "/portal/student/id-card", icon: QrCode },
  ];

  return (
    <ProtectedRoute>
      <div className={`min-h-screen ${isDarkMode ? "bg-[#0B192C] text-slate-100" : "bg-slate-50 text-slate-900"} transition-colors duration-200`}>
        {/* Header */}
        <header className={`sticky top-0 z-40 border-b ${isDarkMode ? "bg-[#0F223D]/90 border-slate-800" : "bg-white/90 border-slate-200"} backdrop-blur-md`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="flex items-center space-x-2">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-amber-500 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-lg font-bold bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
                    SchoolOS
                  </span>
                  <span className="text-xs block text-slate-400 font-medium">Student Portal</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg border ${isDarkMode ? "border-slate-700 bg-slate-800/50 text-amber-400 hover:bg-slate-800" : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"} transition-colors`}
                title="Toggle theme"
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <div className="flex items-center space-x-3 border-l border-slate-700/50 pl-4">
                <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-semibold text-sm">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden sm:inline-block text-sm font-medium">Student Portal</span>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 shrink-0">
            <nav className={`space-y-1 p-3 rounded-2xl border ${isDarkMode ? "bg-[#0F223D]/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 font-semibold"
                        : isDarkMode
                        ? "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              <div className="pt-4 mt-4 border-t border-slate-800/60">
                <button
                  onClick={logout}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors`}
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </nav>
          </aside>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-start">
              <div className={`w-4/5 max-w-xs h-full p-4 ${isDarkMode ? "bg-[#0F223D] text-white" : "bg-white text-slate-900"} flex flex-col justify-between`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-700/50">
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="h-6 w-6 text-emerald-400" />
                      <span className="font-bold">Student Portal</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg text-slate-400">
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <nav className="space-y-1">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium ${
                            isActive
                              ? "bg-emerald-500 text-white font-semibold"
                              : isDarkMode
                              ? "text-slate-300 hover:bg-slate-800"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <button
                    onClick={logout}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
