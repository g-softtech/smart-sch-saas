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
  ShieldAlert,
  Cpu,
} from "lucide-react";

interface AcademicYear {
  id: string;
  name: string;
}

interface Term {
  id: string;
  name: string;
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

interface AssessmentComponent {
  id: string;
  academicYearId: string;
  termId: string;
  classId: string;
  armId?: string | null;
  subjectId: string;
  assessmentTypeId?: string;
  assessmentType?: {
    id: string;
    code: string;
    name: string;
  };
  type?: string;
  title: string;
  maxScore: number;
  weight: number;
}

interface StudentScoreItem {
  assessmentScoreId?: string;
  type?: string;
  assessmentComponentId?: string;
  score?: number | null;
  maxScore: number;
  isAbsent?: boolean;
  provenance?: string;
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

interface ComponentScoreForm {
  assessmentComponentId: string;
  type: string;
  score: string;
  maxScore: number;
  isAbsent: boolean;
  provenance?: string;
}

interface DynamicStudentRow {
  studentId: string;
  studentNumber: string | null;
  firstName: string;
  lastName: string;
  componentScores: Record<string, ComponentScoreForm>;
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

  // Authoritative components & config
  const [components, setComponents] = useState<AssessmentComponent[]>([]);
  const [hasGradingConfig, setHasGradingConfig] = useState<boolean>(true);
  const [studentRows, setStudentRows] = useState<DynamicStudentRow[]>([]);

  const [search, setSearch] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Load reference data
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

  // Fetch teacher scope
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

  // Load Gradebook & Dynamic Assessment Components for selected scope
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

      // Fetch Gradebook roster, components, and grading config concurrently
      const [res, compRes, configRes] = await Promise.all([
        apiClient.get<GradebookData>(url),
        apiClient.get<any>(
          `/api/v1/academics/results/components?academicYearId=${scopeItem.academicYearId}&termId=${scopeItem.termId}&classId=${scopeItem.classId}&subjectId=${scopeItem.subjectId}`
        ),
        apiClient.get<any>(
          `/api/v1/academics/results/grading-config?academicYearId=${scopeItem.academicYearId}&termId=${scopeItem.termId}`
        ),
      ]);

      const activeComps: AssessmentComponent[] = compRes?.data || compRes || [];
      const config = configRes?.data !== undefined ? configRes.data : configRes;

      setGradebookData(res);
      setComponents(activeComps);
      setHasGradingConfig(!!config);

      // Build dynamic rows from components
      const rows: DynamicStudentRow[] = (res.students || []).map((s) => {
        const compScores: Record<string, ComponentScoreForm> = {};

        // For each active component, resolve existing score or fallback
        activeComps.forEach((comp) => {
          const match = s.scores.find(
            (sc) => sc.assessmentComponentId === comp.id
          );
          compScores[comp.id] = {
            assessmentComponentId: comp.id,
            type: comp.assessmentType?.code || comp.type || "COMPONENT",
            score: match?.score !== undefined && match?.score !== null ? String(match.score) : "",
            maxScore: comp.maxScore,
            isAbsent: match?.isAbsent || false,
            provenance: match?.provenance,
          };
        });

        // Fallback: If no components configured, map whatever raw scores exist
        if (activeComps.length === 0) {
          s.scores.forEach((sc, idx) => {
            const fallbackId = sc.assessmentComponentId || `comp-${idx}`;
            compScores[fallbackId] = {
              assessmentComponentId: fallbackId,
              type: sc.type || "CA",
              score: sc.score !== undefined && sc.score !== null ? String(sc.score) : "",
              maxScore: sc.maxScore || 100,
              isAbsent: sc.isAbsent || false,
              provenance: sc.provenance,
            };
          });
        }

        return {
          studentId: s.studentId,
          studentNumber: s.studentNumber,
          firstName: s.firstName,
          lastName: s.lastName,
          componentScores: compScores,
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

  // Handle score change for dynamic component
  const handleScoreChange = (studentId: string, componentId: string, val: string) => {
    setStudentRows((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        const currentComp = row.componentScores[componentId];
        if (!currentComp) return row;

        return {
          ...row,
          componentScores: {
            ...row.componentScores,
            [componentId]: {
              ...currentComp,
              score: val,
            },
          },
        };
      })
    );
  };

  // Toggle absent status
  const handleAbsentToggle = (studentId: string, componentId: string) => {
    setStudentRows((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        const currentComp = row.componentScores[componentId];
        if (!currentComp) return row;

        const newAbsent = !currentComp.isAbsent;
        return {
          ...row,
          componentScores: {
            ...row.componentScores,
            [componentId]: {
              ...currentComp,
              isAbsent: newAbsent,
              score: newAbsent ? "0" : currentComp.score,
            },
          },
        };
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
        scores: Object.values(row.componentScores).map((s) => ({
          assessmentComponentId: s.assessmentComponentId.startsWith("comp-") ? undefined : s.assessmentComponentId,
          type: s.type,
          score: s.isAbsent ? 0 : s.score !== "" ? Number(s.score) : 0,
          maxScore: s.maxScore,
          isAbsent: s.isAbsent,
        })),
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

      // Reload gradebook to update total scores and status
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

      await handleSaveDraft();

      const payload = {
        academicYearId: selectedScope.academicYearId,
        termId: selectedScope.termId,
        classId: selectedScope.classId,
        armId: selectedScope.armId || undefined,
        subjectId: selectedScope.subjectId,
      };

      await apiClient.post("/api/v1/academics/teacher-portal/gradebooks/submit", payload);
      setActionSuccess("Gradebook submitted successfully for administrative approval.");

      await loadGradebook(selectedScope);
    } catch (err: any) {
      setActionError(err.message || "Failed to submit gradebook.");
    } finally {
      setSubmitting(false);
    }
  };

  const status = gradebookData?.submission?.status || "DRAFT";
  const isEditable = status === "DRAFT" || status === "REJECTED";

  const filteredRows = studentRows.filter((r) => {
    if (!search.trim()) return true;
    const termStr = search.toLowerCase();
    return (
      r.firstName.toLowerCase().includes(termStr) ||
      r.lastName.toLowerCase().includes(termStr) ||
      (r.studentNumber && r.studentNumber.toLowerCase().includes(termStr))
    );
  });

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-[#D2AD36]" />
            Teacher Gradebook & Scores Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative score entry & submission portal for assigned academic subjects.
          </p>
        </div>
      </div>

      {/* Scope Selector */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#D2AD36]" /> Academic Year & Term Context
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Academic Year</label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
            >
              <option value="">Select Year...</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Term</label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
            >
              <option value="">Select Term...</option>
              {terms
                .filter((t) => !selectedYearId || (t as any).academicYearId === selectedYearId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scope Cards */}
      {scopeLoading ? (
        <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[#D2AD36]" /> Loading assigned gradebook scopes...
        </div>
      ) : scopeError ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {scopeError}
        </div>
      ) : !selectedScope ? (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Gradebook Scopes</h3>
          {assignedScopes.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              No active teaching assignments found for this term.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedScopes.map((scope) => (
                <div
                  key={scope.assignmentId}
                  onClick={() => loadGradebook(scope)}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-[#D2AD36]/50 cursor-pointer transition-all space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#D2AD36]/10 text-[#D2AD36] font-bold text-[10px]">
                      {scope.className} {scope.armName ? `(${scope.armName})` : ""}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-[#D2AD36] transition-colors" />
                  </div>
                  <h4 className="font-bold text-white text-base">{scope.subjectName}</h4>
                  <p className="text-xs text-slate-400">{scope.academicYearName} • {scope.termName}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Selected Gradebook Roster View */
        <div className="space-y-6">
          {/* Top Bar Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <button
              onClick={() => setSelectedScope(null)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Scope List
            </button>

            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  status === "DRAFT"
                    ? "bg-slate-800 text-slate-300 border-slate-700"
                    : status === "SUBMITTED"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : status === "APPROVED"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : status === "PUBLISHED"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}
              >
                Status: {status}
              </span>

              {isEditable && (
                <>
                  <button
                    onClick={handleSaveDraft}
                    disabled={savingDraft || submitting}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {savingDraft && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <Save className="h-3.5 w-3.5 text-[#D2AD36]" /> Save Draft
                  </button>

                  <button
                    onClick={handleSubmitGradebook}
                    disabled={savingDraft || submitting}
                    className="px-4 py-2 rounded-xl bg-[#D2AD36] hover:bg-[#c29d2b] text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <Send className="h-3.5 w-3.5" /> Submit Gradebook
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Warnings & Feedback */}
          {!hasGradingConfig && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300 text-xs flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400" />
              <span>
                <strong>Authoritative Grading Config Missing:</strong> An administrator has not assigned a Grading Scale to this term. Scores can be saved as draft, but total grades cannot be computed until configuration is completed.
              </span>
            </div>
          )}

          {actionError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {actionError}
            </div>
          )}

          {actionSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> {actionSuccess}
            </div>
          )}

          {/* Assessment Configuration */}
          {components.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm mb-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase mb-3">Assessment Configuration</h3>
              <div className="flex flex-wrap items-center gap-4">
                {components.map(comp => (
                  <div key={comp.id} className="text-xs flex flex-col bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-500">{comp.title}</span> 
                    <strong className="text-white">{comp.weight}%</strong>
                  </div>
                ))}
                <div className="text-xs flex flex-col bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-700 ml-2">
                  <span className="text-slate-400">TOTAL</span> 
                  <strong className="text-emerald-400">{components.reduce((acc, c) => acc + (c.weight || 0), 0)}%</strong>
                </div>
              </div>
              <div className="mt-3 text-[10px] text-slate-500">
                These are configured maximum weights. Do not confuse them with the student's calculated score.
              </div>
            </div>
          )}

          {/* Roster & Scores Table */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter student roster..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
                />
              </div>

              <div className="text-xs text-slate-400">
                Class: <strong className="text-white">{selectedScope.className} {selectedScope.armName ? `(${selectedScope.armName})` : ""}</strong> • Subject: <strong className="text-white">{selectedScope.subjectName}</strong>
              </div>
            </div>

            {gradebookLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#D2AD36]" /> Loading roster...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                No enrolled students found matching search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                      <th className="p-3">Student</th>

                      {/* Dynamic Component Columns */}
                      {components.length > 0 ? (
                        components.map((comp) => (
                          <th key={comp.id} className="p-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-white font-bold">{comp.title}</span>
                              <span className="text-[10px] text-[#D2AD36] font-mono">
                                ({comp.assessmentType?.name || comp.assessmentType?.code || comp.type || "Component"} • {comp.maxScore}pts • {comp.weight}%)
                              </span>
                            </div>
                          </th>
                        ))
                      ) : (
                        <th className="p-3 text-center text-amber-400">Unconfigured Assessment Component</th>
                      )}

                      <th className="p-3 text-right">Calculated Score</th>
                      <th className="p-3 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.studentId} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                        <td className="p-3 font-medium text-white">
                          <div>
                            {row.firstName} {row.lastName}
                          </div>
                          {row.studentNumber && <div className="text-[10px] text-slate-500 font-mono">{row.studentNumber}</div>}
                        </td>

                        {/* Dynamic Component Score Inputs */}
                        {components.length > 0 ? (
                          components.map((comp) => {
                            const scoreData = row.componentScores[comp.id] || {
                              assessmentComponentId: comp.id,
                              type: comp.type,
                              score: "",
                              maxScore: comp.maxScore,
                              isAbsent: false,
                            };

                            return (
                              <td key={comp.id} className="p-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <input
                                    type="number"
                                    placeholder={`0-${comp.maxScore}`}
                                    disabled={!isEditable || scoreData.isAbsent}
                                    value={scoreData.score}
                                    onChange={(e) => handleScoreChange(row.studentId, comp.id, e.target.value)}
                                    className="w-20 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center text-xs text-white focus:outline-none focus:border-[#D2AD36] disabled:opacity-40"
                                  />
                                  <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      disabled={!isEditable}
                                      checked={scoreData.isAbsent}
                                      onChange={() => handleAbsentToggle(row.studentId, comp.id)}
                                      className="rounded bg-slate-950 border-slate-800 text-[#D2AD36]"
                                    />
                                    Abs
                                  </label>

                                  {/* Provenance Badge */}
                                  {scoreData.provenance === "CBT" && (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] font-bold border border-blue-500/30 flex items-center gap-1" title="CBT Auto-Compiled Score">
                                      <Cpu className="h-3 w-3" /> CBT
                                    </span>
                                  )}
                                  {scoreData.provenance === "MANUAL" && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-medium" title="Manual Score Entry">
                                      Manual
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })
                        ) : (
                          <td className="p-3 text-center text-slate-500 italic">No component columns</td>
                        )}

                        <td className="p-3 text-right text-sm">
                          {(() => {
                            let provisionalTotal = 0;
                            let hasPreview = false;
                            components.forEach((comp) => {
                              const scoreData = row.componentScores[comp.id];
                              if (scoreData && !scoreData.isAbsent && scoreData.score !== "" && !isNaN(Number(scoreData.score))) {
                                provisionalTotal += (Number(scoreData.score) / (comp.maxScore || 100)) * (comp.weight || 0);
                                hasPreview = true;
                              }
                            });

                            return (
                              <div className="flex flex-col items-end gap-1">
                                {row.totalScore !== null && row.totalScore !== undefined ? (
                                  <div className="font-extrabold text-[#D2AD36]">
                                    {row.totalScore} pts <span className="text-[9px] font-normal text-slate-500 ml-1 uppercase">(Official)</span>
                                  </div>
                                ) : (
                                  <div className="text-slate-500">—</div>
                                )}
                                {hasPreview && (
                                  <div className="text-xs text-amber-500 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20" title="Preview — final result is calculated on Submit">
                                    Preview: {provisionalTotal.toFixed(1)} pts
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-3 text-center font-bold">
                          {row.grade ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {row.grade}
                              </span>
                              <span className="text-[9px] text-slate-500 uppercase">(Official)</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
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
