"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    studentId: "",
    academicYearId: "",
    termId: "",
    feeStructureId: "",
    dueDate: "",
    notes: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post("api/v1/finance/invoices", {
        ...formData,
        dueDate: new Date(formData.dueDate).toISOString()
      });
      alert("Invoice generated successfully");
      router.push("/dashboard/finance/invoices");
    } catch (error: any) {
      alert(`Error generating invoice: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Generate Invoice</h1>
        <p className="text-gray-500 dark:text-gray-400">Create a new invoice for a student</p>
      </div>

      <div className="bg-white dark:bg-brand-navy-surface rounded-lg shadow-sm border border-gray-200 dark:border-brand-border-dark p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student ID</label>
            <input type="text" name="studentId" required value={formData.studentId} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark dark:bg-brand-navy dark:text-white shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Academic Year ID</label>
            <input type="text" name="academicYearId" required value={formData.academicYearId} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark dark:bg-brand-navy dark:text-white shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Term ID</label>
            <input type="text" name="termId" required value={formData.termId} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark dark:bg-brand-navy dark:text-white shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fee Structure ID (Optional)</label>
            <input type="text" name="feeStructureId" value={formData.feeStructureId} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark dark:bg-brand-navy dark:text-white shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label>
            <input type="date" name="dueDate" required value={formData.dueDate} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark dark:bg-brand-navy dark:text-white shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes (Optional)</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark dark:bg-brand-navy dark:text-white shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm p-2 border" />
          </div>
          <div className="flex justify-end pt-4">
            <button type="button" onClick={() => router.back()} className="mr-3 px-4 py-2 border border-gray-300 dark:border-brand-border-dark rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-brand-navy hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-navy hover:bg-brand-navy/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue">
              {loading ? "Generating..." : "Generate Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
