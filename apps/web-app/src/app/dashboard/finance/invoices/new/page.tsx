"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import {
  useAcademicYears,
  useTerms,
  useFeeStructures,
  useStudentSearch,
  useStudentEnrollments,
  studentDisplayName,
  type Student,
} from "@/hooks/useFinanceSelectors";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Search,
  UserRound,
  X,
  RefreshCw,
} from "lucide-react";

// ─── Student Search Combobox ──────────────────────────────────────────────────

function StudentSearchCombobox({
  selected,
  onSelect,
  onClear,
}: {
  selected: Student | null;
  onSelect: (s: Student) => void;
  onClear: () => void;
}) {
  const { query, results, loading, error, search } = useStudentSearch();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      search(e.target.value);
      setOpen(true);
    },
    [search],
  );

  if (selected) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-gold/5 border border-brand-gold/30 dark:border-brand-gold/40">
        <div className="flex-shrink-0 h-9 w-9 rounded-full bg-brand-gold/10 flex items-center justify-center">
          <UserRound className="h-5 w-5 text-brand-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {[selected.firstName, selected.middleName, selected.lastName].filter(Boolean).join(" ")}
          </p>
          {(selected.admissionNumber ?? selected.studentNumber) && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selected.admissionNumber ?? selected.studentNumber}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Clear student selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          id="student-search"
          type="text"
          placeholder="Search by name or admission number…"
          value={query}
          onChange={handleInput}
          onFocus={() => query.length >= 2 && setOpen(true)}
          className="w-full rounded-lg border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy text-gray-900 dark:text-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold placeholder-gray-400"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 dark:border-brand-border-dark bg-white dark:bg-brand-navy shadow-xl overflow-hidden max-h-64 overflow-y-auto">
          {error && (
            <div className="p-3 text-sm text-red-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          {!loading && !error && results.length === 0 && query.trim().length >= 2 && (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              No students found for &ldquo;{query}&rdquo;
            </div>
          )}
          {!loading && query.trim().length < 2 && (
            <div className="p-4 text-sm text-gray-400 dark:text-gray-500 text-center">
              Type at least 2 characters to search
            </div>
          )}
          {results.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelect(s);
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-brand-navy-surface text-left transition-colors border-b border-gray-100 dark:border-brand-border-dark last:border-0"
            >
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold font-semibold text-xs">
                {s.firstName?.[0]}{s.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {[s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ")}
                </p>
                {(s.admissionNumber ?? s.studentNumber) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {s.admissionNumber ?? s.studentNumber}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface PersistentContext {
  academicYearId: string;
  termId: string;
  feeStructureId: string;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generateAnother, setGenerateAnother] = useState(false);

  // Student
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Context that persists across "Generate Another"
  const [context, setContext] = useState<PersistentContext>({
    academicYearId: "",
    termId: "",
    feeStructureId: "",
  });

  // Invoice-specific fields
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // Load enrollment context when student is selected
  const { activeEnrollment, loading: enrollLoading } = useStudentEnrollments(
    selectedStudent?.id ?? null,
  );

  // Prefill from enrollment
  useEffect(() => {
    if (!activeEnrollment) return;
    setContext((prev) => ({
      ...prev,
      academicYearId: activeEnrollment.academicYearId || prev.academicYearId,
    }));
  }, [activeEnrollment]);

  const { data: academicYears, loading: ayLoading } = useAcademicYears();
  const { data: terms, loading: termsLoading } = useTerms(context.academicYearId || null);
  const { data: feeStructures, loading: fsLoading } = useFeeStructures(
    context.academicYearId || null,
    context.termId || null,
    null, // Don't filter by class for invoices — show all applicable
  );

  // Reset term when academic year changes
  useEffect(() => {
    setContext((prev) => ({ ...prev, termId: "", feeStructureId: "" }));
  }, [context.academicYearId]);

  // Reset fee structure when term changes
  useEffect(() => {
    setContext((prev) => ({ ...prev, feeStructureId: "" }));
  }, [context.termId]);

  const selectedAY = academicYears.find((y) => y.id === context.academicYearId);
  const selectedTerm = terms.find((t) => t.id === context.termId);
  const selectedFS = feeStructures.find((f) => f.id === context.feeStructureId);

  const handleStudentClear = useCallback(() => {
    setSelectedStudent(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedStudent) {
      setErrorMsg("Please select a student.");
      return;
    }
    if (!context.academicYearId || !context.termId) {
      setErrorMsg("Please select an Academic Year and Term.");
      return;
    }
    if (!dueDate) {
      setErrorMsg("Due date is required.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("api/v1/finance/invoices", {
        studentId: selectedStudent.id,
        academicYearId: context.academicYearId,
        termId: context.termId,
        feeStructureId: context.feeStructureId || undefined,
        dueDate: new Date(dueDate).toISOString(),
        notes: notes.trim() || undefined,
      });

      const studentName = [selectedStudent.firstName, selectedStudent.lastName].filter(Boolean).join(" ");
      setSuccessMsg(`Invoice generated for ${studentName}.`);
      setGenerateAnother(true);

      // Clear student and invoice-specific fields, preserve context
      setSelectedStudent(null);
      setDueDate("");
      setNotes("");
    } catch (error: Error | unknown) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to generate invoice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Generate Invoice</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create a new invoice for a student
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard/finance/invoices")}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          ← Back to Invoices
        </button>
      </div>

      {/* Generate Another Banner */}
      {generateAnother && successMsg && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{successMsg}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Academic year, term and fee structure context has been retained. Select another student to continue.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setGenerateAnother(false);
                setSuccessMsg(null);
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Generate Another
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/finance/invoices")}
              className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              View All Invoices
            </button>
          </div>
        </div>
      )}

      {/* Error alert */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student selector */}
        <div className="bg-white dark:bg-brand-navy-surface rounded-xl shadow-sm border border-gray-200 dark:border-brand-border-dark p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Student
          </h2>
          <StudentSearchCombobox
            selected={selectedStudent}
            onSelect={setSelectedStudent}
            onClear={handleStudentClear}
          />

          {/* Enrollment context hint */}
          {enrollLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Loading enrollment context…</span>
            </div>
          )}
          {!enrollLoading && selectedStudent && activeEnrollment && (
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 text-xs">
              <span className="text-blue-600 dark:text-blue-400 font-medium">Active enrollment:</span>
              {activeEnrollment.academicYear && (
                <span className="text-blue-700 dark:text-blue-300">{activeEnrollment.academicYear.name}</span>
              )}
              {activeEnrollment.class && (
                <span className="text-blue-700 dark:text-blue-300">· {activeEnrollment.class.name}</span>
              )}
              {activeEnrollment.arm && (
                <span className="text-blue-700 dark:text-blue-300">· {activeEnrollment.arm.name}</span>
              )}
              <span className="text-blue-500 dark:text-blue-400 ml-auto">(prefilled below)</span>
            </div>
          )}
          {!enrollLoading && selectedStudent && !activeEnrollment && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              No active enrollment found. Please select academic year and term manually.
            </div>
          )}
        </div>

        {/* Academic context */}
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
                id="inv-academicYearId"
                required
                disabled={ayLoading}
                value={context.academicYearId}
                onChange={(e) => setContext((c) => ({ ...c, academicYearId: e.target.value }))}
                className="w-full appearance-none rounded-lg border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy text-gray-900 dark:text-white px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold disabled:opacity-50"
              >
                <option value="">{ayLoading ? "Loading…" : "Select academic year"}</option>
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
                id="inv-termId"
                required
                disabled={!context.academicYearId || termsLoading}
                value={context.termId}
                onChange={(e) => setContext((c) => ({ ...c, termId: e.target.value }))}
                className="w-full appearance-none rounded-lg border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy text-gray-900 dark:text-white px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold disabled:opacity-50"
              >
                <option value="">
                  {!context.academicYearId
                    ? "Select academic year first"
                    : termsLoading
                    ? "Loading terms…"
                    : terms.length === 0
                    ? "No terms found"
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

          {/* Fee Structure */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Fee Structure <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <select
                id="inv-feeStructureId"
                disabled={!context.termId || fsLoading}
                value={context.feeStructureId}
                onChange={(e) => setContext((c) => ({ ...c, feeStructureId: e.target.value }))}
                className="w-full appearance-none rounded-lg border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy text-gray-900 dark:text-white px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold disabled:opacity-50"
              >
                <option value="">
                  {!context.termId
                    ? "Select term first"
                    : fsLoading
                    ? "Loading fee structures…"
                    : feeStructures.length === 0
                    ? "No fee structures found — invoice will be manual"
                    : "Select fee structure (optional)"}
                </option>
                {feeStructures.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              {fsLoading ? (
                <Loader2 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
              ) : (
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              )}
            </div>
            {!context.feeStructureId && context.termId && !fsLoading && (
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                Without a fee structure, the invoice will be created without pre-populated line items.
              </p>
            )}
          </div>

          {/* Summary pill */}
          {(selectedAY || selectedTerm || selectedFS) && (
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
              {selectedFS && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {selectedFS.name}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Invoice details */}
        <div className="bg-white dark:bg-brand-navy-surface rounded-xl shadow-sm border border-gray-200 dark:border-brand-border-dark p-6 space-y-5">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Invoice Details
          </h2>

          <div>
            <label htmlFor="inv-dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Due Date <span className="text-red-500">*</span>
            </label>
            <input
              id="inv-dueDate"
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold"
            />
          </div>

          <div>
            <label htmlFor="inv-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="inv-notes"
              rows={2}
              placeholder="Any additional notes for this invoice…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold placeholder-gray-400 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/finance/invoices")}
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
            {loading ? "Generating…" : "Generate Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
