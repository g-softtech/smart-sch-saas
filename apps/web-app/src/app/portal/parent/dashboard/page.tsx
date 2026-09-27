"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Users, CreditCard, Clock, FileText, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function ParentDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        const res = await apiClient.get<any>("/api/v1/portal/parent/dashboard");
        setData(res?.data || res);
      } catch (err: any) {
        console.error("Failed to load parent dashboard:", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 flex items-center gap-3">
        <AlertCircle className="h-6 w-6 shrink-0" />
        <div>
          <h3 className="font-semibold">Unable to load Parent Dashboard</h3>
          <p className="text-sm opacity-90">{error}</p>
        </div>
      </div>
    );
  }

  const { guardian, children, pendingInvoices, recentDepartures } = data || {};

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 p-8 text-white shadow-xl shadow-amber-950/20">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md mb-3">
            Guardian Overview
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Welcome back, {guardian?.name || "Parent"}! 👋
          </h1>
          <p className="mt-2 text-amber-100 text-sm sm:text-base">
            Managing <span className="font-semibold text-white">{children?.length || 0}</span> linked children
          </p>
        </div>
      </div>

      {/* Linked Children Cards */}
      <div>
        <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
          <Users className="h-5 w-5 text-amber-400" />
          <span>My Linked Children</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children && children.length > 0 ? (
            children.map((child: any) => (
              <div
                key={child.id}
                className="p-6 rounded-3xl bg-[#0B192C] border border-slate-800/80 shadow-lg space-y-4 hover:border-amber-500/30 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">
                      {child.firstName} {child.lastName}
                    </h3>
                    <p className="text-xs text-slate-400">ID: {child.studentNumber}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">
                    {child.relationship || "Child"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-3 rounded-2xl border border-slate-800/60">
                  <div>
                    <span className="text-slate-400">School:</span>
                    <p className="font-semibold text-slate-200">{child.schoolName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Class:</span>
                    <p className="font-semibold text-amber-300">
                      {child.className} {child.armName ? `(${child.armName})` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/60">
                  <Link
                    href={`/portal/parent/children/${child.id}/results`}
                    className="flex-1 text-center px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-200 transition flex items-center justify-center space-x-1"
                  >
                    <FileText className="h-3.5 w-3.5 text-amber-400" />
                    <span>Results</span>
                  </Link>
                  <Link
                    href={`/portal/parent/children/${child.id}/attendance`}
                    className="flex-1 text-center px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-200 transition flex items-center justify-center space-x-1"
                  >
                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Attendance</span>
                  </Link>
                  <Link
                    href={`/portal/parent/children/${child.id}/movement`}
                    className="flex-1 text-center px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-200 transition flex items-center justify-center space-x-1"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
                    <span>Pickup</span>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 p-8 text-center bg-[#0B192C] border border-slate-800/80 rounded-3xl text-slate-400 text-sm">
              No linked children profiles found.
            </div>
          )}
        </div>
      </div>

      {/* Pending Fee Invoices Section */}
      <div className="p-6 rounded-3xl bg-[#0B192C] border border-slate-800/80 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold text-slate-100">Pending Fee Invoices</h2>
          </div>
          <Link href="/portal/parent/invoices" className="text-xs font-semibold text-amber-400 hover:underline flex items-center space-x-1">
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {pendingInvoices && pendingInvoices.length > 0 ? (
          <div className="space-y-3">
            {pendingInvoices.map((inv: any) => (
              <div key={inv.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/60 flex items-center justify-between text-sm">
                <div>
                  <h4 className="font-semibold text-slate-200">{inv.student?.firstName} {inv.student?.lastName}</h4>
                  <p className="text-xs text-slate-400">Invoice: {inv.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-300">₦{Number(inv.totalAmount - inv.paidAmount).toLocaleString()}</p>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No pending fee invoices found.</p>
        )}
      </div>
    </div>
  );
}
