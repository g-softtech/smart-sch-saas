"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Save,
  Send,
  Lock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  ChevronRight,
  ArrowLeft,
  UserX,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface AcademicYear {
  id: string;
  name: string;
  isCurrent?: boolean;
}

interface Term {
  id: string;
  name: string;
  isCurrent?: boolean;
}

interface TeacherScopeItem {
  assignmentId: string;
  academicYearId: string;
  academicYearName: string;
  termId: string;
  termName: string;
  classId: string;
  className: string;
  armId: string | null;
  armName: string | null;
  subjectId: string;
  subjectName: string;
  scope: string;
  isPrimary: boolean;
}

interface StudentScoreItem {
  assessmentScoreId?: string;
  type?: string;
  assessmentComponentId?: string;
  score?: number;
  maxScore: number;
  isAbsent?: boolean;
}

interface GradebookStudent {
  studentId: string;
  enrollmentId: string;
  studentNumber: string | null;
  firstName: string;
  lastName: string;
  scores: StudentScoreItem[];
  totalScore?: number | null;
  grade?: string | null;
  remark?: string | null;
}

interface GradebookSubmission {
  id: string | null;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "PUBLISHED" | "REJECTED";
  submittedAt: string | null;
  submittedBy: string | null;
  rejectionReason: string | null;
}

interface GradebookData {
  academicContext: {
    academicYearId: string;
    academicYearName: string;
    termId: string;
    termName: string;
    classId: string;
    className: string;
    armId: string | null;
    armName: string | null;
    subjectId: string;
    subjectName: string;
    scope: string;
    isPrimary: boolean;
  };
  submission: GradebookSubmission;
  students: GradebookStudent[];
}

interface StudentFormRow {
  studentId: string;
  studentNumber: string | null;
  firstName: string;
  lastName: string;
  caScore: string;
  caMaxScore: number;
  caIsAbsent: boolean;
  examScore: string;
  examMaxScore: number;
  examIsAbsent: boolean;
  totalScore?: number | null;
  grade?: string | null;
  remark?: string | null;
}

export default function TeacherGradebookPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedTermId, setSelectedTermId] = useState<string>("");

  const [scopeLoading, setScopeLoading] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [assignedScopes, setAssignedScopes] = useState<TeacherScopeItem[]>([]);
  const [selectedScope, setSelectedScope] = useState<TeacherScopeItem | null>(null);

  const [gradebookLoading, setGradebookLoading] = useState(false);
  const [gradebookError, setGradebookError] = useState<string | null>(null);
  const [gradebookData, setGradebookData] = useState<GradebookData | null>(null);
  const [studentRows, setStudentRows] = useState<StudentFormRow[]>([]);

  const [search, setSearch] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Initial reference data load
  useEffect(() => {
    async function loadReferenceData() {
      try {
        const [yearsRes, termsRes] = await Promise.all([
          apiClient.get<AcademicYear[]>("/api/v1/academics/academic-years"),
          apiClient.get<Term[]>("/api/v1/academics/terms"),
        ]);
        const yearsList = yearsRes || [];
        const termsList = termsRes || [];

        setAcademicYears(yearsList);
        setTerms(termsList);

        if (yearsList.length > 0) setSelectedYearId(yearsList[0].id);
        if (termsList.length > 0) setSelectedTermId(termsList[0].id);
      } catch (err: any) {
        setScopeError("Failed to load reference academic years and terms.");
      }
    }
    loadReferenceData();
  }, []);

  // Fetch teacher scope whenever Year & Term are selected
  const fetchScope = useCallback(async () => {
    if (!selectedYearId || !selectedTermId) return;
    try {
      setScopeLoading(true);
      setScopeError(null);
      setSelectedScope(null);
      setGradebookData(null);
      setStudentRows([]);

      const scopes = await apiClient.get<TeacherScopeItem[]>(
        `/api/v1/academics/teacher-portal/gradebooks/scope?academicYearId=${selectedYearId}&termId=${selectedTermId}`
      );
      setAssignedScopes(scopes || []);
    } catch (err: any) {
      setScopeError(err.message || "Failed to fetch teacher assignment scopes.");
    } finally {
      setScopeLoading(false);
    }
  }, [selectedYearId, selectedTermId]);

  useEffect(() => {
    if (selectedYearId && selectedTermId) {
      fetchScope();
    }
  }, [selectedYearId, selectedTermId, fetchScope]);

  // Load Gradebook for a selected scope
  const loadGradebook = async (scopeItem: TeacherScopeItem) => {
    setSelectedScope(scopeItem);
    try {
      setGradebookLoading(true);
      setGradebookError(null);
      setActionError(null);
      setActionSuccess(null);

      let url = `/api/v1/academics/teacher-portal/gradebooks?academicYearId=${scopeItem.academicYearId}&termId=${scopeItem.termId}&classId=${scopeItem.classId}&subjectId=${scopeItem.subjectId}`;
      if (scopeItem.armId) {
        url += `&armId=${scopeItem.armId}`;
      }

      const res = await apiClient.get<GradebookData>(url);
      setGradebookData(res);

      // Initialize form rows from student scores
      const rows: StudentFormRow[] = (res.students || []).map((s) => {
        const caScoreObj = s.scores.find(
          (sc) => sc.type === "CA" || sc.assessmentComponentId?.toLowerCase().includes("ca")
        );
        const examScoreObj = s.scores.find(
          (sc) => sc.type === "EXAM" || sc.assessmentComponentId?.toLowerCase().includes("exam")
        );

        // If no explicit CA or EXAM type found, pick by order
        const fallbackCa = caScoreObj || s.scores[0];
        const fallbackExam = examScoreObj || s.scores[1];

        return {
          studentId: s.studentId,
          studentNumber: s.studentNumber,
          firstName: s.firstName,
          lastName: s.lastName,
          caScore: fallbackCa?.score !== undefined && fallbackCa?.score !== null ? String(fallbackCa.score) : "",
          caMaxScore: fallbackCa?.maxScore || 40,
          caIsAbsent: fallbackCa?.isAbsent || false,
          examScore: fallbackExam?.score !== undefined && fallbackExam?.score !== null ? String(fallbackExam.score) : "",
          examMaxScore: fallbackExam?.maxScore || 60,
          examIsAbsent: fallbackExam?.isAbsent || false,
          totalScore: s.totalScore,
          grade: s.grade,
          remark: s.remark,
        };
      });

      setStudentRows(rows);
    } catch (err: any) {
      setGradebookError(err.message || "Failed to load gradebook roster.");
    } finally {
      setGradebookLoading(false);
    }
  };

  // Handle student row score changes
  const handleScoreChange = (
    studentId: string,
    field: "caScore" | "examScore",
    value: string
  ) => {
    setStudentRows((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        return { ...row, [field]: value };
      })
    );
  };

  const handleAbsentToggle = (
    studentId: string,
    field: "caIsAbsent" | "examIsAbsent"
  ) => {
    setStudentRows((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        const newAbsent = !row[field];
        if (field === "caIsAbsent") {
          return { ...row, caIsAbsent: newAbsent, caScore: newAbsent ? "0" : row.caScore };
        } else {
          return { ...row, examIsAbsent: newAbsent, examScore: newAbsent ? "0" : row.examScore };
        }
      })
    );
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!selectedScope || !gradebookData) return;
    try {
      setSavingDraft(true);
      setActionError(null);
      setActionSuccess(null);

      const entries = studentRows.map((row) => ({
        studentId: row.studentId,
        scores: [
          {
            type: "CA",
            score: row.caIsAbsent ? 0 : row.caScore !== "" ? Number(row.caScore) : 0,
            maxScore: row.caMaxScore,
            isAbsent: row.caIsAbsent,
          },
          {
            type: "EXAM",
            score: row.examIsAbsent ? 0 : row.examScore !== "" ? Number(row.examScore) : 0,
            maxScore: row.examMaxScore,
            isAbsent: row.examIsAbsent,
          },
        ],
      }));

      const payload = {
        academicYearId: selectedScope.academicYearId,
        termId: selectedScope.termId,
        classId: selectedScope.classId,
        armId: selectedScope.armId || undefined,
        subjectId: selectedScope.subjectId,
        entries,
      };

      await apiClient.post("/api/v1/academics/teacher-portal/gradebooks/draft", payload);
      setActionSuccess("Gradebook draft saved successfully.");

      // Reload gradebook to refresh total scores/status
      await loadGradebook(selectedScope);
    } catch (err: any) {
      setActionError(err.message || "Failed to save gradebook draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  // Submit Gradebook
  const handleSubmitGradebook = async () => {
    if (!selectedScope || !gradebookData) return;
    try {
      setSubmitting(true);
      setActionError(null);
      setActionSuccess(null);

      // Save draft first to commit current changes
      const entries = studentRows.map((row) => ({
        studentId: row.studentId,
        scores: [
          {
            type: "CA",
            score: row.caIsAbsent ? 0 : row.caScore !== "" ? Number(row.caScore) : 0,
            maxScore: row.caMaxScore,
            isAbsent: row.caIsAbsent,
          },
          {
            type: "EXAM",
            score: row.examIsAbsent ? 0 : row.examScore !== "" ? Number(row.examScore) : 0,
            maxScore: row.examMaxScore,
            isAbsent: row.examIsAbsent,
          },
        ],
      }));

      await apiClient.post("/api/v1/academics/teacher-portal/gradebooks/draft", {
        academicYearId: selectedScope.academicYearId,
        termId: selectedScope.termId,
        classId: selectedScope.classId,
        armId: selectedScope.armId || undefined,
        subjectId: selectedScope.subjectId,
        entries,
      });

      // Execute submission
      await apiClient.post("/api/v1/academics/teacher-portal/gradebooks/submit", {
        academicYearId: selectedScope.academicYearId,
        termId: selectedScope.termId,
        classId: selectedScope.classId,
        armId: selectedScope.armId || undefined,
        subjectId: selectedScope.subjectId,
      });

      setActionSuccess("Gradebook submitted for administrative review.");
      await loadGradebook(selectedScope);
    } catch (err: any) {
      setActionError(err.message || "Failed to submit gradebook.");
    } finally {
      setSubmitting(false);
    }
  };

  const status = gradebookData?.submission.status || "DRAFT";
  const isLocked = status === "SUBMITTED" || status === "APPROVED" || status === "PUBLISHED";

  const filteredRows = studentRows.filter((r) => {
    const term = search.toLowerCase();
    return (
      r.firstName.toLowerCase().includes(term) ||
      r.lastName.toLowerCase().includes(term) ||
      (r.studentNumber && r.studentNumber.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header & Academic Context Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E3A5F] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-[#D2AD36]" />
            Teacher Gradebook Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enter assessment scores, save drafts, and submit academic results for administrative approval.
          </p>
        </div>

        {/* Academic Year & Term Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0A192E] border border-[#1E3A5F] rounded-xl px-3 py-1.5">
            <Calendar className="h-4 w-4 text-[#D2AD36]" />
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id} className="bg-[#070B14] text-white">
                  {y.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-[#0A192E] border border-[#1E3A5F] rounded-xl px-3 py-1.5">
            <BookOpen className="h-4 w-4 text-[#D2AD36]" />
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#070B14] text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchScope}
            disabled={scopeLoading}
            className="p-2 bg-[#1E3A5F] hover:bg-[#2A4D7C] text-slate-200 rounded-xl transition"
            title="Refresh Scopes"
          >
            <RefreshCw className={`h-4 w-4 ${scopeLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Action Messages */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {!selectedScope ? (
        /* ASSIGNED SCOPES LIST VIEW */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#D2AD36]" />
              Assigned Gradebook Scopes
            </h2>
            <span className="text-xs text-slate-400">
              Select a class subject below to view roster & enter scores
            </span>
          </div>

          {scopeLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3 bg-[#0A192E]/60 border border-[#1E3A5F] rounded-3xl">
              <Loader2 className="h-10 w-10 animate-spin text-[#D2AD36]" />
              <p className="text-sm font-medium">Fetching assigned gradebook scopes...</p>
            </div>
          ) : scopeError ? (
            <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <span>{scopeError}</span>
            </div>
          ) : assignedScopes.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2 bg-[#0A192E]/60 border border-[#1E3A5F] rounded-3xl">
              <BookOpen className="h-10 w-10 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-white">No active teaching assignments found for this term.</p>
              <p className="text-xs text-slate-500">Contact your academic administrator if your subject assignment is missing.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignedScopes.map((scope) => (
                <div
                  key={scope.assignmentId}
                  onClick={() => loadGradebook(scope)}
                  className="bg-[#0A192E]/90 border border-[#1E3A5F] hover:border-[#D2AD36] rounded-3xl p-6 shadow-xl cursor-pointer transition group space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[#1E3A5F] pb-3">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-[#D2AD36] transition">
                        {scope.className} {scope.armName ? `(${scope.armName})` : ""}
                      </h3>
                      <span className="text-xs text-[#D2AD36] font-semibold">{scope.subjectName}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-[#D2AD36] group-hover:translate-x-1 transition" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Scope: <strong className="text-slate-200">{scope.scope}</strong>
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${scope.isPrimary ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-700 text-slate-300"}`}>
                      {scope.isPrimary ? "Primary Teacher" : "Co-Teacher"}
                    </span>
                  </div>

                  <div className="pt-2 text-right">
                    <span className="text-xs font-bold text-[#D2AD36] group-hover:underline">
                      Open Gradebook &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* GRADEBOOK GRID SCORE ENTRY VIEW */
        <div className="space-y-6">
          {/* Top Scope Header & Actions Bar */}
          <div className="bg-[#0A192E]/90 border border-[#1E3A5F] rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1E3A5F] pb-6">
              <div>
                <button
                  onClick={() => setSelectedScope(null)}
                  className="mb-3 px-3 py-1.5 bg-[#1E3A5F] hover:bg-[#2A4D7C] text-slate-200 text-xs font-bold rounded-xl transition inline-flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4 text-[#D2AD36]" />
                  Back to Scopes List
                </button>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <span>{selectedScope.className} {selectedScope.armName ? `(${selectedScope.armName})` : ""}</span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="text-[#D2AD36]">{selectedScope.subjectName}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Term: <span className="text-slate-200 font-semibold">{selectedScope.termName}</span> | Academic Year: <span className="text-slate-200 font-semibold">{selectedScope.academicYearName}</span>
                </p>
              </div>

              {/* Status Badge & Action Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Workflow Status Badge */}
                <div className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  status === "PUBLISHED"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : status === "APPROVED"
                    ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                    : status === "SUBMITTED"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : status === "REJECTED"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : "bg-slate-700/50 text-slate-300 border-slate-600"
                }`}>
                  {isLocked ? <Lock className="h-3.5 w-3.5" /> : null}
                  <span>STATUS: {status}</span>
                </div>

                {/* Save Draft Button */}
                {!isLocked && (
                  <button
                    onClick={handleSaveDraft}
                    disabled={savingDraft || submitting}
                    className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#2A4D7C] text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    <Save className={`h-4 w-4 text-[#D2AD36] ${savingDraft ? "animate-spin" : ""}`} />
                    {savingDraft ? "Saving..." : "Save Draft"}
                  </button>
                )}

                {/* Submit Button */}
                {!isLocked && (
                  <button
                    onClick={handleSubmitGradebook}
                    disabled={submitting || savingDraft || !selectedScope.isPrimary}
                    title={!selectedScope.isPrimary ? "Only the primary assigned teacher can submit this gradebook." : "Submit gradebook for admin review"}
                    className="px-4 py-2 bg-[#D2AD36] hover:bg-[#b8952b] text-[#0A192E] text-xs font-extrabold rounded-xl transition flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    <Send className={`h-4 w-4 ${submitting ? "animate-spin" : ""}`} />
                    {submitting ? "Submitting..." : "Submit Gradebook"}
                  </button>
                )}
              </div>
            </div>

            {/* Rejection Alert Banner */}
            {status === "REJECTED" && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-rose-200 text-sm">
                  <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
                  <span>Gradebook Submission Rejected by Admin</span>
                </div>
                <p className="text-slate-300 font-mono text-[11px] bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/20">
                  Reason: &quot;{gradebookData?.submission.rejectionReason || "No explicit reason provided."}&quot;
                </p>
                <p className="text-[11px] text-rose-300/80">
                  You can edit student scores below, save changes as draft, and resubmit for approval.
                </p>
              </div>
            )}

            {/* Locked Info Banner */}
            {isLocked && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-3">
                <Lock className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <p className="font-bold text-amber-300">Gradebook Editing Locked</p>
                  <p className="text-slate-300 text-[11px]">
                    This gradebook has been submitted or approved ({status}). Further edits are disabled unless reopened by an administrator.
                  </p>
                </div>
              </div>
            )}

            {/* Search Input */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search roster by student name..."
                  className="w-full pl-9 pr-4 py-2 bg-[#070B14] border border-[#1E3A5F] rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-[#D2AD36]"
                />
              </div>

              <span className="text-xs text-slate-400 font-medium">
                Enrolled Roster: <span className="text-[#D2AD36] font-bold">{studentRows.length}</span> students
              </span>
            </div>

            {/* Roster Score Grid Table */}
            {gradebookLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#D2AD36]" />
                <p className="text-xs font-medium">Loading gradebook score matrix...</p>
              </div>
            ) : gradebookError ? (
              <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{gradebookError}</span>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <UserX className="h-10 w-10 text-slate-600 mx-auto" />
                <p className="text-sm font-medium text-white">No enrolled students found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#1E3A5F]">
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-[#070B14] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#1E3A5F]">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Student No.</th>
                      <th className="py-3 px-4 text-center">CA Score (Max 40)</th>
                      <th className="py-3 px-4 text-center">CA Absent</th>
                      <th className="py-3 px-4 text-center">Exam Score (Max 60)</th>
                      <th className="py-3 px-4 text-center">Exam Absent</th>
                      <th className="py-3 px-4 text-center">Total Score</th>
                      <th className="py-3 px-4 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E3A5F]/60 bg-[#0A192E]">
                    {filteredRows.map((row, idx) => {
                      const caVal = row.caIsAbsent ? 0 : Number(row.caScore || 0);
                      const examVal = row.examIsAbsent ? 0 : Number(row.examScore || 0);
                      const totalPreview = caVal + examVal;
                      const caInvalid = !row.caIsAbsent && row.caScore !== "" && (Number(row.caScore) < 0 || Number(row.caScore) > row.caMaxScore);
                      const examInvalid = !row.examIsAbsent && row.examScore !== "" && (Number(row.examScore) < 0 || Number(row.examScore) > row.examMaxScore);

                      return (
                        <tr key={row.studentId} className="hover:bg-[#1E3A5F]/30 transition">
                          <td className="py-3 px-4 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-white">
                            {row.lastName}, {row.firstName}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                            {row.studentNumber || "N/A"}
                          </td>

                          {/* CA Score Input */}
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              min={0}
                              max={row.caMaxScore}
                              step={0.5}
                              disabled={isLocked || row.caIsAbsent}
                              value={row.caScore}
                              onChange={(e) => handleScoreChange(row.studentId, "caScore", e.target.value)}
                              placeholder="0"
                              className={`w-20 px-2.5 py-1.5 bg-[#070B14] border rounded-xl text-center text-xs text-white font-mono focus:outline-none disabled:opacity-40 ${
                                caInvalid
                                  ? "border-rose-500 bg-rose-500/10 focus:border-rose-400"
                                  : "border-[#1E3A5F] focus:border-[#D2AD36]"
                              }`}
                            />
                          </td>

                          {/* CA Absent Checkbox */}
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              disabled={isLocked}
                              checked={row.caIsAbsent}
                              onChange={() => handleAbsentToggle(row.studentId, "caIsAbsent")}
                              className="h-4 w-4 rounded accent-[#D2AD36] cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Exam Score Input */}
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              min={0}
                              max={row.examMaxScore}
                              step={0.5}
                              disabled={isLocked || row.examIsAbsent}
                              value={row.examScore}
                              onChange={(e) => handleScoreChange(row.studentId, "examScore", e.target.value)}
                              placeholder="0"
                              className={`w-20 px-2.5 py-1.5 bg-[#070B14] border rounded-xl text-center text-xs text-white font-mono focus:outline-none disabled:opacity-40 ${
                                examInvalid
                                  ? "border-rose-500 bg-rose-500/10 focus:border-rose-400"
                                  : "border-[#1E3A5F] focus:border-[#D2AD36]"
                              }`}
                            />
                          </td>

                          {/* Exam Absent Checkbox */}
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              disabled={isLocked}
                              checked={row.examIsAbsent}
                              onChange={() => handleAbsentToggle(row.studentId, "examIsAbsent")}
                              className="h-4 w-4 rounded accent-[#D2AD36] cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>

                          {/* Total Score */}
                          <td className="py-3 px-4 text-center font-extrabold font-mono text-[#D2AD36]">
                            {row.totalScore !== undefined && row.totalScore !== null
                              ? row.totalScore
                              : totalPreview > 0 ? totalPreview : "-"}
                          </td>

                          {/* Grade Preview */}
                          <td className="py-3 px-4 text-center font-bold">
                            {row.grade ? (
                              <span className="px-2 py-0.5 rounded-md bg-[#1E3A5F] text-slate-200 text-[11px]">
                                {row.grade}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
