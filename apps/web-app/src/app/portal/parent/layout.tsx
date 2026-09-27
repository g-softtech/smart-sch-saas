"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const [darkMode, setDarkMode] = useState(true);

  const navItems = [
    { label: "Dashboard", href: "/portal/parent/dashboard", icon: LayoutDashboard },
    { label: "My Children", href: "/portal/parent/children", icon: Users },
    { label: "Fee Invoices", href: "/portal/parent/invoices", icon: CreditCard },
    { label: "My Profile", href: "/portal/parent/profile", icon: User },
  ];

  return (
    <div className={darkMode ? "dark min-h-screen bg-[#070F1E] text-slate-100" : "min-h-screen bg-slate-50 text-slate-800"}>
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0B192C]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-bold shadow-md shadow-amber-500/20">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-amber-400 via-amber-200 to-white bg-clip-text text-transparent">
              SchoolOS
            </h1>
            <p className="text-xs text-amber-400/80 font-medium">Parent & Guardian Portal</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white transition"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs font-semibold text-slate-200">
            <User className="h-3.5 w-3.5 text-amber-400" />
            <span>Parent Account</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="sticky top-24 p-4 rounded-3xl bg-[#0B192C] border border-slate-800/80 shadow-xl space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                    isActive
                      ? "bg-gradient-to-r from-amber-500/20 to-emerald-500/20 text-amber-300 border border-amber-500/30"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="pt-4 border-t border-slate-800/80">
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("access_token");
                    window.location.href = "/login";
                  }
                }}
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
  );
}
