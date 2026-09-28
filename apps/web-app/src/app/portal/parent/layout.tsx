"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Users,
  LayoutDashboard,
  FileText,
  Clock,
  ShieldCheck,
  CreditCard,
  User,
  Sun,
  Moon,
  LogOut,
  GraduationCap,
} from "lucide-react";

export default function ParentPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);

  const navItems = [
    { label: "Dashboard", href: "/portal/parent/dashboard", icon: LayoutDashboard },
    { label: "My Children", href: "/portal/parent/children", icon: Users },
    { label: "Fee Invoices", href: "/portal/parent/invoices", icon: CreditCard },
    { label: "My Profile", href: "/portal/parent/profile", icon: User },
  ];

  return (
    <ProtectedRoute>
      <div className={darkMode ? "dark min-h-screen bg-[#0A192E] text-slate-100" : "min-h-screen bg-[#F8FAFC] text-slate-900"}>
        {/* Top Header */}
        <header className="sticky top-0 z-40 border-b border-[#1E3A5F] bg-[#0A192E]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#D2AD36] text-[#0A192E] font-bold shadow-md shadow-[#D2AD36]/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">
                School<span className="text-[#D2AD36]">OS</span>
              </h1>
              <p className="text-xs text-[#D2AD36] font-medium">Parent & Guardian Portal</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl bg-[#112240] border border-[#1E3A5F] text-slate-300 hover:text-[#D2AD36] transition"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#112240] border border-[#D2AD36]/30 text-xs font-semibold text-slate-200">
              <User className="h-3.5 w-3.5 text-[#D2AD36]" />
              <span>Parent Account</span>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-full md:w-64 shrink-0">
            <div className="sticky top-24 p-4 rounded-3xl bg-[#112240] dark:bg-[#112240] bg-white border border-[#1E3A5F] dark:border-[#1E3A5F] border-slate-200 shadow-xl space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                      isActive
                        ? "bg-[#D2AD36]/10 text-[#D2AD36] border border-[#D2AD36]/30"
                        : "text-slate-400 dark:text-slate-400 text-slate-600 hover:text-slate-100 dark:hover:text-slate-100 hover:bg-[#1E3A5F]/40"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-[#D2AD36]" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div className="pt-4 border-t border-[#1E3A5F] dark:border-[#1E3A5F] border-slate-200">
                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
