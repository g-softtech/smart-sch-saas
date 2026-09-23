"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

export default function RecordPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    studentId: "",
    reference: "",
    amount: "",
    method: "TRANSFER",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await apiClient.post("api/v1/finance/payments/record", {
        studentId: formData.studentId,
        reference: formData.reference,
        amount: Number(formData.amount),
        method: formData.method,
      });
      alert(`Payment recorded successfully! Receipt: ${result.receipt.receiptNumber}`);
      router.push(`/dashboard/finance/receipts/${result.receipt.id}`);
    } catch (error: any) {
      alert(`Error: ${error.message || "Failed to record payment"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Record Payment</h1>
        <p className="text-gray-500 dark:text-gray-400">Manually record a student payment</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-brand-navy-surface p-6 rounded-lg shadow-sm border border-gray-200 dark:border-brand-border-dark">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student ID</label>
          <input 
            type="text" 
            required 
            value={formData.studentId}
            onChange={e => setFormData({...formData, studentId: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold dark:bg-brand-navy dark:border-brand-border-dark sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Reference</label>
          <input 
            type="text" 
            required 
            value={formData.reference}
            onChange={e => setFormData({...formData, reference: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold dark:bg-brand-navy dark:border-brand-border-dark sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (₦)</label>
          <input 
            type="number" 
            required 
            min="1"
            value={formData.amount}
            onChange={e => setFormData({...formData, amount: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold dark:bg-brand-navy dark:border-brand-border-dark sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
          <select 
            value={formData.method}
            onChange={e => setFormData({...formData, method: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold dark:bg-brand-navy dark:border-brand-border-dark sm:text-sm"
          >
            <option value="CASH">Cash</option>
            <option value="TRANSFER">Bank Transfer</option>
            <option value="POS">POS Terminal</option>
            <option value="ONLINE">Online Payment</option>
          </select>
        </div>

        <div className="pt-4">
          <button type="submit" className="w-full px-4 py-2 bg-brand-navy text-white rounded hover:bg-brand-navy/90 focus:outline-none" disabled={loading}>
            {loading ? "Processing..." : "Record Payment & Generate Receipt"}
          </button>
        </div>
      </form>
    </div>
  );
}
