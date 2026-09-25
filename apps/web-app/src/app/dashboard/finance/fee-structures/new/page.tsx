"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

export default function NewFeeStructurePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    academicYearId: "",
    termId: "",
    classId: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post("api/v1/finance/fee-structures", {
        ...formData,
        items: [] // Minimal scope
      });
      alert("Fee Structure created successfully");
      router.push("/dashboard/finance/fee-structures");
    } catch (error: any) {
      alert(`Error creating fee structure: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Fee Structure</h1>
        <p className="text-gray-500 dark:text-gray-400">Define a new termly fee template</p>
      </div>

      <div className="bg-white dark:bg-brand-navy-surface rounded-lg shadow-sm border border-gray-200 dark:border-brand-border-dark p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input type="text" name="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark dark:bg-brand-navy dark:text-white shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark dark:bg-brand-navy dark:text-white shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm p-2 border" />
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Class ID</label>
            <input type="text" name="classId" required value={formData.classId} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-brand-border-dark dark:bg-brand-navy dark:text-white shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm p-2 border" />
          </div>
          
          <div className="flex justify-end pt-4">
            <button type="button" onClick={() => router.back()} className="mr-3 px-4 py-2 border border-gray-300 dark:border-brand-border-dark rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-brand-navy hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-navy hover:bg-brand-navy/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue">
              {loading ? "Creating..." : "Create Fee Structure"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
