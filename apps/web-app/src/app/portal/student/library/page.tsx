"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { BookOpen, Clock, AlertCircle, RefreshCw, X, CheckCircle } from "lucide-react";

interface StudentLoan {
  id: string;
  issuedAt: string;
  dueDate: string;
  returnedAt?: string;
  status: "ISSUED" | "OVERDUE" | "RETURNED" | "LOST";
  fineAmount: number;
  invoiceId?: string;
  bookItem: {
    assetTag: string;
    copyNumber: number;
    book: { title: string; author: string; isbn?: string };
    campus?: { name: string };
  };
}

export default function StudentLibraryPage() {
  const [loans, setLoans] = useState<StudentLoan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyLoans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<StudentLoan[]>("/v1/library/student/my-loans");
      setLoans(res || []);
    } catch (err: any) {
      setError(err.message || "Failed to load library loans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyLoans();
  }, [fetchMyLoans]);

  const activeLoans = loans.filter((l) => l.status === "ISSUED" || l.status === "OVERDUE");
  const pastLoans = loans.filter((l) => l.status === "RETURNED" || l.status === "LOST");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
            <BookOpen className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Library Loans</h1>
            <p className="text-sm text-indigo-200">View your active borrowed books, due dates, and circulation history.</p>
          </div>
        </div>

        <button
          onClick={() => fetchMyLoans()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 rounded-xl text-sm font-medium transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Loans */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Active Borrowings ({activeLoans.length})
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {activeLoans.map((l) => (
            <div
              key={l.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-3"
            >
              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mb-2 ${
                    l.status === "OVERDUE"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                  }`}
                >
                  {l.status}
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white">{l.bookItem?.book?.title}</h3>
                <p className="text-xs text-slate-500">by {l.bookItem?.book?.author}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1 text-slate-600 dark:text-slate-400">
                <div>Asset Tag: <span className="font-mono text-slate-900 dark:text-white">{l.bookItem?.assetTag}</span></div>
                <div>Borrowed: {new Date(l.issuedAt).toLocaleDateString()}</div>
                <div className="font-bold text-indigo-600 dark:text-indigo-400">
                  Due Date: {new Date(l.dueDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}

          {activeLoans.length === 0 && (
            <div className="col-span-2 p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-slate-500 text-sm border border-slate-200 dark:border-slate-800">
              You currently have no active borrowed books.
            </div>
          )}
        </div>
      </div>

      {/* Circulation History */}
      <div className="space-y-3 pt-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-slate-400" />
          Borrowing History ({pastLoans.length})
        </h2>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-medium">
              <tr>
                <th className="p-4">Book Title</th>
                <th className="p-4">Asset Tag</th>
                <th className="p-4">Borrowed / Returned</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pastLoans.map((l) => (
                <tr key={l.id}>
                  <td className="p-4 font-medium text-slate-900 dark:text-white">{l.bookItem?.book?.title}</td>
                  <td className="p-4 font-mono text-xs text-slate-500">{l.bookItem?.assetTag}</td>
                  <td className="p-4 text-xs">
                    <div>Issued: {new Date(l.issuedAt).toLocaleDateString()}</div>
                    {l.returnedAt && <div>Returned: {new Date(l.returnedAt).toLocaleDateString()}</div>}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        l.status === "RETURNED"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
              {pastLoans.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No past borrowing history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
