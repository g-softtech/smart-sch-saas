"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

export default function FeeStructuresPage() {
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeeStructures();
  }, []);

  const fetchFeeStructures = async () => {
    try {
      const data = await apiClient.get("api/v1/finance/fee-structures");
      setFeeStructures(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fee Structures</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage termly fee templates</p>
        </div>
        <button className="px-4 py-2 bg-brand-navy text-white rounded hover:bg-brand-navy/90 focus:outline-none" onClick={() => alert("Not implemented in Phase 4 minimal scope")}>Create Fee Structure</button>
      </div>

      <div className="bg-white dark:bg-brand-navy-surface rounded-lg shadow-sm border border-gray-200 dark:border-brand-border-dark overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-brand-border-dark">
          <thead className="bg-gray-50 dark:bg-brand-navy">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Amount</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-brand-navy-surface divide-y divide-gray-200 dark:divide-brand-border-dark">
            {loading ? (
              <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : feeStructures.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No fee structures found.</td></tr>
            ) : (
              feeStructures.map((fs) => (
                <tr key={fs.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{fs.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{fs.items?.length || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ₦{fs.items?.reduce((sum: number, item: any) => sum + Number(item.amount), 0).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
