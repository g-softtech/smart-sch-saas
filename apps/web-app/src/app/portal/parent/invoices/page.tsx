"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { CreditCard, CheckCircle, AlertCircle, Calendar } from "lucide-react";

export default function ParentInvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Payment Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState("PAYSTACK");
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    try {
      setLoading(true);
      const res = await apiClient.get<any>("/api/v1/portal/parent/invoices");
      setInvoices(Array.isArray(res) ? res : res?.data || []);
    } catch (err: any) {
      console.error("Failed to load fee invoices:", err);
      setError(err.message || "Failed to load fee invoices");
    } finally {
      setLoading(false);
    }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      setPaying(true);
      await apiClient.post(`/api/v1/portal/parent/invoices/${selectedInvoice.id}/pay`, {
        amount: Number(payAmount),
        paymentMethod: payMethod,
      });
      setPaySuccess("Payment processed successfully!");
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      alert(`Payment failed: ${err.message || "Unknown error"}`);
    } finally {
      setPaying(false);
    }
  }

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
        <p className="text-sm font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 dark:text-slate-100 text-slate-900 flex items-center space-x-2">
            <CreditCard className="h-6 w-6 text-[#D2AD36]" />
            <span>School Fee Invoices & Payment Portal</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            View unpaid and paid fee invoices for your linked children
          </p>
        </div>
      </div>

      {paySuccess && (
        <div className="p-4 bg-[#039771]/10 border border-[#039771]/30 rounded-2xl text-[#039771] text-sm flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{paySuccess}</span>
        </div>
      )}

      <div className="space-y-4">
        {invoices.length > 0 ? (
          invoices.map((inv: any) => {
            const balance = Number(inv.totalAmount - inv.paidAmount);
            const isPaid = inv.status === "PAID";
            return (
              <div
                key={inv.id}
                className="p-6 rounded-3xl bg-[#112240] dark:bg-[#112240] bg-white border border-[#1E3A5F] dark:border-[#1E3A5F] border-slate-200 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-base font-bold text-slate-100 dark:text-slate-100 text-slate-900">
                      {inv.student?.firstName} {inv.student?.lastName}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        isPaid
                          ? "bg-[#039771]/10 text-[#039771] border-[#039771]/30"
                          : "bg-[#D2AD36]/10 text-[#D2AD36] border-[#D2AD36]/30"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Invoice: <span className="text-slate-200 dark:text-slate-200 text-slate-800">{inv.invoiceNumber}</span> | Student No:{" "}
                    <span className="text-slate-200 dark:text-slate-200 text-slate-800">{inv.student?.studentNumber}</span>
                  </p>
                  <p className="text-xs text-slate-400 flex items-center space-x-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Balance Due:</span>
                    <p className="text-xl font-extrabold text-[#D2AD36]">₦{balance.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">Total: ₦{Number(inv.totalAmount).toLocaleString()}</p>
                  </div>

                  {!isPaid && (
                    <button
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setPayAmount(balance);
                        setPaySuccess(null);
                      }}
                      className="px-5 py-2.5 rounded-2xl bg-[#D2AD36] hover:bg-[#b8952b] text-[#0A192E] font-bold text-xs transition shadow-lg shadow-[#D2AD36]/20 shrink-0"
                    >
                      Pay Now
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center bg-[#112240] dark:bg-[#112240] bg-white border border-[#1E3A5F] dark:border-[#1E3A5F] border-slate-200 rounded-3xl text-slate-400 text-sm">
            No fee invoices found for your linked children.
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#112240] dark:bg-[#112240] bg-white border border-[#1E3A5F] dark:border-[#1E3A5F] border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100 dark:text-slate-100 text-slate-900">Pay School Fee Invoice</h3>
            <p className="text-xs text-slate-400">
              Paying for: <span className="font-semibold text-slate-200 dark:text-slate-200 text-slate-800">{selectedInvoice.student?.firstName} {selectedInvoice.student?.lastName}</span> ({selectedInvoice.invoiceNumber})
            </p>

            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 dark:text-slate-300 text-slate-700 mb-1">Payment Amount (₦)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0A192E] dark:bg-[#0A192E] bg-slate-50 border border-[#1E3A5F] text-white dark:text-white text-slate-900 text-sm focus:outline-none focus:border-[#D2AD36]"
                  min="1"
                  max={selectedInvoice.totalAmount - selectedInvoice.paidAmount}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 dark:text-slate-300 text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0A192E] dark:bg-[#0A192E] bg-slate-50 border border-[#1E3A5F] text-white dark:text-white text-slate-900 text-sm focus:outline-none focus:border-[#D2AD36]"
                >
                  <option value="PAYSTACK">Paystack (Card / Transfer / USSD)</option>
                  <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[#1E3A5F]/60 dark:border-[#1E3A5F]/60 border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 rounded-xl bg-[#1E3A5F]/50 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="px-5 py-2 rounded-xl bg-[#D2AD36] hover:bg-[#b8952b] text-[#0A192E] font-bold text-xs transition"
                >
                  {paying ? "Processing..." : "Confirm & Pay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
