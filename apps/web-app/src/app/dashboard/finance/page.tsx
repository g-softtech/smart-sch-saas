"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

export default function FinanceDashboard() {
  const [loading, setLoading] = useState(true);

  // In a real app we'd fetch dashboard statistics here
  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finance Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage school fees, invoices, and payments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/dashboard/finance/fee-structures" className="block p-6 bg-white dark:bg-brand-navy-surface rounded-lg border border-gray-200 dark:border-brand-border-dark shadow-sm hover:border-brand-gold transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Fee Structures</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Define termly fee templates</p>
        </Link>
        
        <Link href="/dashboard/finance/invoices" className="block p-6 bg-white dark:bg-brand-navy-surface rounded-lg border border-gray-200 dark:border-brand-border-dark shadow-sm hover:border-brand-gold transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Invoices</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">View and manage student invoices</p>
        </Link>

        <Link href="/dashboard/finance/payments/new" className="block p-6 bg-white dark:bg-brand-navy-surface rounded-lg border border-gray-200 dark:border-brand-border-dark shadow-sm hover:border-brand-gold transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Record Payment</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manually record a payment</p>
        </Link>
      </div>
    </div>
  );
}
