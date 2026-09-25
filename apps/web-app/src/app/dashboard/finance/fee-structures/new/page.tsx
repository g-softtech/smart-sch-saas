"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import {
  useAcademicYears,
  useTerms,
  useClasses,
} from "@/hooks/useFinanceSelectors";
import { AlertCircle, ChevronDown, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";

interface FeeItem {
  name: string;
  amount: string;
  isMandatory: boolean;
}

export default function NewFeeStructurePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selectors
  const [academicYearId, setAcademicYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<FeeItem[]>([{ name: "", amount: "", isMandatory: true }]);

  const { data: academicYears, loading: ayLoading, error: ayError } = useAcademicYears();
  const { data: terms, loading: termsLoading } = useTerms(academicYearId || null);
  const { data: classes, loading: classesLoading } = useClasses();

  // Reset dependent fields when parent changes
  useEffect(() => { setTermId(""); }, [academicYearId]);

  const selectedAY = academicYears.find((y) => y.id === academicYearId);
  const selectedTerm = terms.find((t) => t.id === termId);
  const selectedClass = classes.find((c) => c.id === classId);

  // Fee items management
  const addItem = () => setItems([...items, { name: "", amount: "", isMandatory: true }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof FeeItem, value: string | boolean) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  };

  const totalAmount = items.reduce((sum, item) => {
    const n = parseFloat(item.amount) || 0;
    return sum + n;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!academicYearId || !termId || !classId) {
      setErrorMsg("Please select Academic Year, Term, and Class.");
      return;
    }
    if (!name.trim()) {
      setErrorMsg("Fee structure name is required.");
      return;
    }
    const validItems = items.filter((item) => item.name.trim() && parseFloat(item.amount) > 0);
    if (validItems.length === 0) {
      setErrorMsg("At least one valid fee item (with name and amount > 0) is required.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("api/v1/finance/fee-structures", {
        academicYearId,
        termId,
        classId,
        name: name.trim(),
        description: description.trim() || undefined,
        items: validItems.map((item) => ({
          name: item.name.trim(),
          amount: parseFloat(item.amount),
          isMandatory: item.isMandatory,
        })),
      });
      setSuccessMsg(`Fee structure "${name}" created successfully.`);
      setTimeout(() => router.push("/dashboard/finance/fee-structures"), 1500);
    } catch (error: Error | unknown) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to create fee structure. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Fee Structure</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Define a termly fee template for a class
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Alerts */}
      {ayError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Could not load academic years: {ayError}. Please refresh.</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Context selectors */}
        <div className="bg-white dark:bg-brand-navy-surface rounded-xl shadow-sm border border-gray-200 dark:border-brand-border-dark p-6 space-y-5">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Academic Context
          </h2>

          {/* Academic Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Academic Year <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="academicYearId"
                required
                disabled={ayLoading}
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy text-gray-900 dark:text-white px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {ayLoading ? "Loading academic years…" : "Select academic year"}
                </option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
              {ayLoading ? (
                <Loader2 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
              ) : (
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>

          {/* Term */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Term <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="termId"
                required
                disabled={!academicYearId || termsLoading}
                value={termId}
                onChange={(e) => setTermId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy text-gray-900 dark:text-white px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!academicYearId
                    ? "Select academic year first"
                    : termsLoading
                    ? "Loading terms…"
                    : terms.length === 0
                    ? "No terms found for this year"
                    : "Select term"}
                </option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {termsLoading ? (
                <Loader2 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
              ) : (
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>

          {/* Class */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Class <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="classId"
                required
                disabled={classesLoading}
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy text-gray-900 dark:text-white px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {classesLoading ? "Loading classes…" : "Select class"}
                </option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {classesLoading ? (
                <Loader2 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
              ) : (
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>

          {/* Selection summary pill */}
          {(selectedAY || selectedTerm || selectedClass) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedAY && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-gold/10 text-brand-gold border border-brand-gold/30">
                  {selectedAY.name}
                </span>
              )}
              {selectedTerm && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {selectedTerm.name}
                </span>
              )}
              {selectedClass && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {selectedClass.name}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Fee structure details */}
        <div className="bg-white dark:bg-brand-navy-surface rounded-xl shadow-sm border border-gray-200 dark:border-brand-border-dark p-6 space-y-5">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Fee Structure Details
          </h2>

          <div>
            <label htmlFor="fee-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="fee-name"
              type="text"
              required
              placeholder="e.g. JSS 1 First Term Fees 2026/2027"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold placeholder-gray-400"
            />
          </div>

          <div>
            <label htmlFor="fee-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="fee-desc"
              rows={2}
              placeholder="Brief description of this fee structure…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold placeholder-gray-400 resize-none"
            />
          </div>
        </div>

        {/* Fee items */}
        <div className="bg-white dark:bg-brand-navy-surface rounded-xl shadow-sm border border-gray-200 dark:border-brand-border-dark p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Fee Items
            </h2>
            {totalAmount > 0 && (
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Total: ₦{totalAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-brand-navy/50 border border-gray-200 dark:border-brand-border-dark">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Fee name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tuition"
                      value={item.name}
                      onChange={(e) => updateItem(i, "name", e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy text-gray-900 dark:text-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Amount (₦)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={item.amount}
                      onChange={(e) => updateItem(i, "amount", e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy text-gray-900 dark:text-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 pt-5">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.isMandatory}
                      onChange={(e) => updateItem(i, "isMandatory", e.target.checked)}
                      className="h-3.5 w-3.5 accent-brand-gold"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Required</span>
                  </label>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="p-1 text-red-400 hover:text-red-600 transition-colors rounded"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-2 text-sm text-brand-gold hover:text-brand-gold/80 font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add fee item
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-brand-navy border border-gray-300 dark:border-brand-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-brand-navy/80 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand-navy dark:bg-brand-gold dark:text-brand-navy rounded-lg hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Creating…" : "Create Fee Structure"}
          </button>
        </div>
      </form>
    </div>
  );
}
