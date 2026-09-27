'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Users, CreditCard, Clock, FileText, AlertCircle, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import Link from 'next/link';

export default function ParentDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        const res = await apiClient.get<any>('/api/v1/portal/parent/dashboard');
        const dashboardData = res?.data || res;
        setData(dashboardData);
        if (dashboardData?.children && dashboardData.children.length > 0) {
          setSelectedChildId(dashboardData.children[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load parent dashboard:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D2AD36]"></div>
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

  const { guardian, children, pendingInvoices } = data || {};
  const selectedChild = children?.find((c: any) => c.id === selectedChildId) || children?.[0];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#112240] dark:bg-[#112240] bg-white border border-[#D2AD36]/30 p-8 text-slate-100 dark:text-slate-100 text-slate-900 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-3 py-1 rounded-full bg-[#D2AD36]/20 text-[#D2AD36] text-xs font-semibold border border-[#D2AD36]/30 mb-3">
            Guardian Overview
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-100 dark:text-slate-100 text-slate-900">
            Welcome back, {guardian?.name || 'Parent'}! 👋
          </h1>
          <p className="mt-2 text-slate-300 dark:text-slate-300 text-slate-600 text-sm sm:text-base">
            Managing <span className="font-semibold text-[#D2AD36]">{children?.length || 0}</span> linked {children?.length === 1 ? 'child' : 'children'}
          </p>
        </div>
      </div>

      {/* Multi-Child Selector (Only rendered when > 1 child exists) */}
      {children && children.length > 1 && (
        <div className="p-4 rounded-2xl bg-[#112240] border border-[#1E3A5F] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-4 w-4 text-[#D2AD36]" />
              Select Active Child Context:
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {children.length} Children Linked
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {children.map((child: any) => {
              const isSelected = child.id === selectedChildId;
              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border ${
                    isSelected
                      ? 'bg-[#D2AD36] text-[#0A192E] border-[#D2AD36] shadow-md shadow-[#D2AD36]/20'
                      : 'bg-[#0A192E]/80 text-slate-300 border-[#1E3A5F] hover:border-[#D2AD36]/40 hover:text-white'
                  }`}
                >
                  <UserCheck className={`h-3.5 w-3.5 ${isSelected ? 'text-[#0A192E]' : 'text-[#D2AD36]'}`} />
                  <span>{child.firstName} {child.lastName}</span>
                  {child.className && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-[#0A192E]/20 text-[#0A192E]' : 'bg-[#1E3A5F] text-slate-300'}`}>
                      {child.className}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Child Detail Card */}
      {selectedChild ? (
        <div className="p-6 rounded-3xl bg-[#112240] dark:bg-[#112240] bg-white border border-[#1E3A5F] dark:border-[#1E3A5F] border-slate-200 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#D2AD36] uppercase tracking-wider">
                {children?.length > 1 ? 'Selected Student' : 'Linked Student Profile'}
              </span>
              <h2 className="text-xl font-bold text-slate-100 dark:text-slate-100 text-slate-900 mt-0.5">
                {selectedChild.firstName} {selectedChild.lastName}
              </h2>
              <p className="text-xs text-slate-400">Student Number: {selectedChild.studentNumber}</p>
            </div>
            <span className="px-3.5 py-1.5 rounded-full bg-[#D2AD36]/10 text-[#D2AD36] text-xs font-semibold border border-[#D2AD36]/30">
              {selectedChild.relationship || 'Child'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-[#0A192E]/60 dark:bg-[#0A192E]/60 bg-slate-50 p-4 rounded-2xl border border-[#1E3A5F]/60">
            <div>
              <span className="text-slate-400">School:</span>
              <p className="font-semibold text-slate-200">{selectedChild.schoolName || 'SchoolOS Campus'}</p>
            </div>
            <div>
              <span className="text-slate-400">Class & Arm:</span>
              <p className="font-semibold text-[#D2AD36]">
                {selectedChild.className || 'N/A'} {selectedChild.armName ? `(${selectedChild.armName})` : ''}
              </p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <span className="text-slate-400">Status:</span>
              <p className="font-semibold text-[#039771]">Enrolled & Active</p>
            </div>
          </div>

          {/* Direct Child Action Links */}
          <div className="flex flex-wrap gap-3 pt-3 border-t border-[#1E3A5F]/60">
            <Link
              href={`/portal/parent/children/${selectedChild.id}/results`}
              className="flex-1 text-center px-4 py-2.5 rounded-xl bg-[#1E3A5F]/50 hover:bg-[#1E3A5F] text-xs font-semibold text-slate-200 transition flex items-center justify-center space-x-2 border border-transparent hover:border-[#D2AD36]/40"
            >
              <FileText className="h-4 w-4 text-[#D2AD36]" />
              <span>Academic Results</span>
            </Link>
            <Link
              href={`/portal/parent/children/${selectedChild.id}/attendance`}
              className="flex-1 text-center px-4 py-2.5 rounded-xl bg-[#1E3A5F]/50 hover:bg-[#1E3A5F] text-xs font-semibold text-slate-200 transition flex items-center justify-center space-x-2 border border-transparent hover:border-[#039771]/40"
            >
              <Clock className="h-4 w-4 text-[#039771]" />
              <span>Attendance History</span>
            </Link>
            <Link
              href={`/portal/parent/children/${selectedChild.id}/movement`}
              className="flex-1 text-center px-4 py-2.5 rounded-xl bg-[#1E3A5F]/50 hover:bg-[#1E3A5F] text-xs font-semibold text-slate-200 transition flex items-center justify-center space-x-2 border border-transparent hover:border-[#D2AD36]/40"
            >
              <ShieldCheck className="h-4 w-4 text-[#D2AD36]" />
              <span>Pickup & Security</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-[#112240] border border-[#1E3A5F] rounded-3xl text-slate-400 text-sm">
          No linked student profiles found for this account.
        </div>
      )}

      {/* Pending Fee Invoices Section */}
      <div className="p-6 rounded-3xl bg-[#112240] dark:bg-[#112240] bg-white border border-[#1E3A5F] dark:border-[#1E3A5F] border-slate-200 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-[#D2AD36]" />
            <h2 className="text-lg font-bold text-slate-100 dark:text-slate-100 text-slate-900">
              Fee Invoices
            </h2>
          </div>
          <Link
            href="/portal/parent/invoices"
            className="text-xs font-semibold text-[#D2AD36] hover:underline flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {pendingInvoices && pendingInvoices.length > 0 ? (
          <div className="space-y-3">
            {pendingInvoices.map((inv: any) => (
              <div
                key={inv.id}
                className="p-4 rounded-2xl bg-[#0A192E]/60 border border-[#1E3A5F]/60 flex items-center justify-between text-sm"
              >
                <div>
                  <h4 className="font-semibold text-slate-200">
                    {inv.student?.firstName} {inv.student?.lastName}
                  </h4>
                  <p className="text-xs text-slate-400">Invoice #{inv.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#D2AD36]">
                    ₦{Number(inv.totalAmount - inv.paidAmount).toLocaleString()}
                  </p>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D2AD36]/10 text-[#D2AD36] border border-[#D2AD36]/30">
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
