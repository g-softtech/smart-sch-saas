"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

interface Invoice {
  id: string;
  totalAmount: number;
  outstandingAmount: number;
  status: string;
}

export default function RecordPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingInvoices, setFetchingInvoices] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    reference: "",
    amount: "",
    method: "TRANSFER",
  });

  const handleFetchInvoices = async () => {
    if (!studentId.trim()) {
      alert("Please enter a Student ID first.");
      return;
    }

    setFetchingInvoices(true);
    try {
      const data = await apiClient.get(`api/v1/finance/invoices?studentId=${studentId.trim()}`);

      const outstandingInvoices = Array.isArray(data)
        ? data.filter(inv => inv.status === 'ISSUED' && Number(inv.outstandingAmount) > 0)
        : [];

      setInvoices(outstandingInvoices);
      setSelectedInvoices([]);

      if (outstandingInvoices.length === 0) {
        alert("No outstanding invoices found for this student.");
      }
    } catch (error: any) {
      alert(`Error fetching invoices: ${error.message || "Unknown error"}`);
    } finally {
      setFetchingInvoices(false);
    }
  };

  const toggleInvoiceSelection = (id: string) => {
    setSelectedInvoices(prev =>
      prev.includes(id) ? prev.filter(invId => invId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedInvoices.length === 0) {
      alert("Please select at least one invoice to pay.");
      return;
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.post("api/v1/finance/payments/record", {
        studentId: studentId.trim(),
        reference: formData.reference,
        amount: Number(formData.amount),
        method: formData.method,
        invoiceIds: selectedInvoices,
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Record Invoice Payment</h1>
        <p className="text-gray-500 dark:text-gray-400">Allocate a payment to specific invoices</p>
      </div>

      <div className="space-y-4 bg-white dark:bg-brand-navy-surface p-6 rounded-lg shadow-sm border border-gray-200 dark:border-brand-border-dark">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student ID</label>
          <div className="mt-1 flex space-x-2">
            <input
              type="text"
              required
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold dark:bg-brand-navy dark:border-brand-border-dark sm:text-sm"
            />
            <button
              type="button"
              onClick={handleFetchInvoices}
              disabled={fetchingInvoices}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {fetchingInvoices ? "..." : "Fetch"}
            </button>
          </div>
        </div>

        {invoices.length > 0 && (
          <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Invoices to Pay</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {invoices.map(inv => (
                <label key={inv.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.includes(inv.id)}
                    onChange={() => toggleInvoiceSelection(inv.id)}
                    className="h-4 w-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">
                    Invoice {inv.id.substring(0, 8)} - Outstanding: ₦{Number(inv.outstandingAmount).toLocaleString()}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
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
            <p className="mt-1 text-xs text-gray-500">Note: Any amount exceeding selected invoices will be treated as an overpayment.</p>
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
            <button
              type="submit"
              className="w-full px-4 py-2 bg-brand-navy text-white rounded hover:bg-brand-navy/90 focus:outline-none disabled:opacity-50"
              disabled={loading || selectedInvoices.length === 0}
            >
              {loading ? "Processing..." : "Record Payment & Generate Receipt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
