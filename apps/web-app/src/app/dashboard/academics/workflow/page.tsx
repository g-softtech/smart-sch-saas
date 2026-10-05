"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  CheckCircle,
  XCircle,
  Globe,
  RotateCcw,
  Eye,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileText,
  Clock,
  User,
  BookOpen,
  Calendar,
  Layers,
  Search,
  X,
  CheckCircle2,
} from "lucide-react";

interface AcademicYear {
  id: string;
  name: string;
}

interface Term {
  id: string;
  name: string;
}

interface ClassItem {
  id: string;
  name: string;
}

interface SubjectItem {
  id: string;
  name: string;
}

interface GradebookSubmissionItem {
  id: string;
  tenantId: string;
  schoolId: string;
  academicYearId: string;
  academicYear: { id: string; name: string };
  termId: string;
  term: { id: string; name: string };
  classId: string;
  class: { id: string; name: string };
  armId: string | null;
  arm: { id: string; name: string } | null;
  subjectId: string;
  subject: { id: string; name: string };
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "PUBLISHED" | "REJECTED";
  submittedBy: string;
  submittedAt: string | null;
  rejectionReason: string | null;
  updatedAt: string;
}

interface SubmissionDetailData {
  submission: GradebookSubmissionItem;
  enrollments: any[];
  subjectResults: any[];
  auditLogs: any[];
}

export default function GradebookWorkflowPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  // Filter States
  const [filterYearId, setFilterYearId] = useState("");
  const [filterTermId, setFilterTermId] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [submissions, setSubmissions] = useState<GradebookSubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Submission Detail Modal
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<SubmissionDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Reason Modals
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reasonInput, setReasonInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Reference Data Load
  useEffect(() => {
    async function loadRefData() {
      try {
        const [yRes, tRes, cRes, sRes] = await Promise.all([
          apiClient.get<AcademicYear[]>("/api/v1/academics/academic-years"),
          apiClient.get<Term[]>("/api/v1/academics/terms"),
          apiClient.get<ClassItem[]>("/api/v1/academics/classes"),
          apiClient.get<SubjectItem[]>("/api/v1/academics/subjects"),
        ]);
        setAcademicYears(yRes || []);
        setTerms(tRes || []);
        setClasses(cRes || []);
        setSubjects(sRes || []);
      } catch (err: any) {
        console.error("Failed to load reference data for workflow filters", err);
      }
    }
    loadRefData();
  }, []);

  // Fetch Submissions List
  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filterYearId) params.append("academicYearId", filterYearId);
      if (filterTermId) params.append("termId", filterTermId);
      if (filterClassId) params.append("classId", filterClassId);
      if (filterSubjectId) params.append("subjectId", filterSubjectId);
      if (filterStatus) params.append("status", filterStatus);

      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await apiClient.get<GradebookSubmissionItem[]>(
        `/api/v1/academics/gradebook/workflow/submissions${query}`
      );
      setSubmissions(res || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch gradebook submissions");
    } fontFinally: {
      setLoading(false);
    }
  }, [filterYearId, filterTermId, filterClassId, filterSubjectId, filterStatus]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Open Details Modal
  const openSubmissionDetails = async (id: string) => {
    setSelectedSubmissionId(id);
    setDetailLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await apiClient.get<SubmissionDetailData>(
        `/api/v1/academics/gradebook/workflow/submissions/${id}`
      );
      setDetailData(res);
    } catch (err: any) {
      setActionError(err.message || "Failed to load submission details");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setSelectedSubmissionId(null);
    setDetailData(null);
    setRejectModalOpen(false);
    setReopenModalOpen(false);
    setReasonInput("");
  };

  // Workflow Actions
  const handleApprove = async () => {
    if (!selectedSubmissionId) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await apiClient.post("/api/v1/academics/gradebook/workflow/approve", {
        submissionId: selectedSubmissionId,
      });
      setActionSuccess("Gradebook submission approved successfully.");
      await openSubmissionDetails(selectedSubmissionId);
      await fetchSubmissions();
    } catch (err: any) {
      setActionError(err.message || "Failed to approve gradebook");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedSubmissionId) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await apiClient.post("/api/v1/academics/gradebook/workflow/publish", {
        submissionId: selectedSubmissionId,
      });
      setActionSuccess("Gradebook published to Student and Parent portals.");
      await openSubmissionDetails(selectedSubmissionId);
      await fetchSubmissions();
    } catch (err: any) {
      setActionError(err.message || "Failed to publish gradebook");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedSubmissionId || !reasonInput.trim()) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await apiClient.post("/api/v1/academics/gradebook/workflow/reject", {
        submissionId: selectedSubmissionId,
        reason: reasonInput.trim(),
      });
      setActionSuccess("Gradebook submission rejected and returned to teacher.");
      setRejectModalOpen(false);
      setReasonInput("");
      await openSubmissionDetails(selectedSubmissionId);
      await fetchSubmissions();
    } catch (err: any) {
      setActionError(err.message || "Failed to reject gradebook");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenSubmit = async () => {
    if (!selectedSubmissionId || !reasonInput.trim()) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await apiClient.post("/api/v1/academics/gradebook/workflow/reopen", {
        submissionId: selectedSubmissionId,
        reason: reasonInput.trim(),
      });
      setActionSuccess("Published gradebook reopened and reverted to DRAFT.");
      setReopenModalOpen(false);
      setReasonInput("");
      await openSubmissionDetails(selectedSubmissionId);
      await fetchSubmissions();
    } catch (err: any) {
      setActionError(err.message || "Failed to reopen gradebook");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn p-6 sm:p-8 bg-[#070B14] min-h-screen text-slate-100 font-sans">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E3A5F] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <Layers className="h-8 w-8 text-[#D2AD36]" />
            Academics Gradebook Workflow & Approvals
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review teacher gradebook submissions, perform administrative audit approvals, publish results, or reopen published gradebooks.
          </p>
        </div>

        <button
          onClick={fetchSubmissions}
          disabled={loading}
          className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#2A4D7C] text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 text-[#D2AD36] ${loading ? "animate-spin" : ""}`} />
          Refresh Submissions
        </button>
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

      {/* Filter Bar */}
      <div className="bg-[#0A192E] border border-[#1E3A5F] rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#D2AD36] uppercase tracking-wider">
          <Filter className="h-4 w-4" />
          Filter Submissions
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Academic Year */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Academic Year</label>
            <select
              value={filterYearId}
              onChange={(e) => setFilterYearId(e.target.value)}
              className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          {/* Term */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Term</label>
            <select
              value={filterTermId}
              onChange={(e) => setFilterTermId(e.target.value)}
              className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
            >
              <option value="">All Terms</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Class</label>
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Workflow Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="DRAFT">DRAFT</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3 bg-[#0A192E]/60 border border-[#1E3A5F] rounded-3xl">
          <Loader2 className="h-10 w-10 animate-spin text-[#D2AD36]" />
          <p className="text-sm font-medium">Fetching workflow submissions...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <span>{error}</span>
        </div>
      ) : submissions.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-2 bg-[#0A192E]/60 border border-[#1E3A5F] rounded-3xl">
          <FileText className="h-10 w-10 text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-white">No gradebook submissions found.</p>
          <p className="text-xs text-slate-500">Adjust your filter criteria above or check back when teachers submit gradebooks.</p>
        </div>
      ) : (
        <div className="bg-[#0A192E] border border-[#1E3A5F] rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-[#070B14] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#1E3A5F]">
                <tr>
                  <th className="py-3.5 px-4">Class / Arm</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Term / Year</th>
                  <th className="py-3.5 px-4">Submitter ID</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E3A5F]/60">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#1E3A5F]/30 transition">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {sub.class.name} {sub.arm ? `(${sub.arm.name})` : ""}
                    </td>
                    <td className="py-3.5 px-4 text-[#D2AD36] font-semibold">
                      {sub.subject.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {sub.term.name} ({sub.academicYear.name})
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                      {sub.submittedBy || "N/A"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(sub.updatedAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${
                          sub.status === "PUBLISHED"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : sub.status === "APPROVED"
                            ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                            : sub.status === "SUBMITTED"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : sub.status === "REJECTED"
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                            : "bg-slate-700/50 text-slate-300 border-slate-600"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openSubmissionDetails(sub.id)}
                        className="px-3 py-1.5 bg-[#1E3A5F] hover:bg-[#2A4D7C] text-slate-200 font-bold text-[11px] rounded-xl transition inline-flex items-center gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5 text-[#D2AD36]" />
                        Review Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBMISSION DETAIL & WORKFLOW ACTIONS MODAL */}
      {selectedSubmissionId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#0A192E] border border-[#1E3A5F] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#1E3A5F] flex items-center justify-between bg-[#070B14]">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#D2AD36]" />
                  Gradebook Submission Details & Review
                </h2>
                {detailData && (
                  <p className="text-xs text-slate-400 mt-1">
                    {detailData.submission.class.name} {detailData.submission.arm ? `(${detailData.submission.arm.name})` : ""} &bull;{" "}
                    <span className="text-[#D2AD36] font-semibold">{detailData.submission.subject.name}</span>
                  </p>
                )}
              </div>
              <button
                onClick={closeDetailsModal}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#1E3A5F] transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-200">
              {actionError && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {detailLoading || !detailData ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <Loader2 className="h-10 w-10 animate-spin text-[#D2AD36]" />
                  <p className="text-sm font-medium">Loading submission score matrix & audit history...</p>
                </div>
              ) : (
                <>
                  {/* Status Overview Card */}
                  <div className="bg-[#070B14] border border-[#1E3A5F] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">Current Status</span>
                      <span
                        className={`text-sm font-extrabold px-2.5 py-0.5 rounded-md inline-block mt-0.5 ${
                          detailData.submission.status === "PUBLISHED"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : detailData.submission.status === "APPROVED"
                            ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                            : detailData.submission.status === "SUBMITTED"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : detailData.submission.status === "REJECTED"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-slate-700/50 text-slate-300"
                        }`}
                      >
                        {detailData.submission.status}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">Submitted By</span>
                      <span className="text-xs font-mono font-bold text-white">{detailData.submission.submittedBy || "N/A"}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">Academic Year / Term</span>
                      <span className="text-xs font-semibold text-slate-300">
                        {detailData.submission.academicYear.name} - {detailData.submission.term.name}
                      </span>
                    </div>
                  </div>

                  {/* Rejection Reason if Present */}
                  {detailData.submission.rejectionReason && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
                      <span className="font-bold text-rose-200 block">Rejection Reason:</span>
                      <p className="font-mono text-slate-200">{detailData.submission.rejectionReason}</p>
                    </div>
                  )}

                  {/* Roster & Score Matrix Summary Table */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-[#D2AD36]" />
                      Student Roster Score Matrix ({detailData.subjectResults.length} records)
                    </h3>

                    {(() => {
                      // Extract unique assessment components from subjectResults scores
                      const compMap = new Map<string, { id: string; title: string; type: string; maxScore?: number; weight?: number }>();
                      detailData.subjectResults.forEach((res: any) => {
                        if (Array.isArray(res.scores)) {
                          res.scores.forEach((s: any) => {
                            const idKey = s.componentId || s.type;
                            if (idKey && !compMap.has(idKey)) {
                              compMap.set(idKey, {
                                id: idKey,
                                title: s.title || s.type,
                                type: s.type || "COMPONENT",
                                maxScore: s.maxScore,
                                weight: s.weight,
                              });
                            }
                          });
                        }
                      });

                      const components = Array.from(compMap.values());

                      return (
                        <div className="overflow-x-auto rounded-2xl border border-[#1E3A5F]">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#070B14] text-slate-400 uppercase font-mono text-[10px] border-b border-[#1E3A5F]">
                              <tr>
                                <th className="py-2.5 px-3">Student Name</th>
                                <th className="py-2.5 px-3">Student No.</th>
                                {components.length > 0 ? (
                                  components.map((c) => (
                                    <th key={c.id} className="py-2.5 px-3 text-center min-w-[100px]">
                                      <div className="font-bold text-slate-200">{c.title}</div>
                                      <div className="text-[9px] text-slate-400 font-normal lowercase">
                                        {c.type} {c.maxScore ? `(max ${c.maxScore})` : ""} {c.weight ? `[${c.weight}%]` : ""}
                                      </div>
                                    </th>
                                  ))
                                ) : (
                                  <>
                                    <th className="py-2.5 px-3 text-center">CA Score</th>
                                    <th className="py-2.5 px-3 text-center">Exam Score</th>
                                  </>
                                )}
                                <th className="py-2.5 px-3 text-center">Total Score</th>
                                <th className="py-2.5 px-3 text-center">Grade</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1E3A5F]/60 bg-[#070B14]/40">
                              {detailData.enrollments.map((en) => {
                                const res = detailData.subjectResults.find((r) => r.enrollmentId === en.id);
                                const caObj = res?.scores?.find((s: any) => s.type === "CA");
                                const examObj = res?.scores?.find((s: any) => s.type === "EXAM");

                                return (
                                  <tr key={en.id} className="hover:bg-[#1E3A5F]/20">
                                    <td className="py-2.5 px-3 font-bold text-white">
                                      {en.student.lastName}, {en.student.firstName}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-slate-400">
                                      {en.student.studentNumber || "N/A"}
                                    </td>
                                    {components.length > 0 ? (
                                      components.map((c) => {
                                        const sObj = res?.scores?.find(
                                          (s: any) => s.componentId === c.id || s.type === c.type
                                        );
                                        return (
                                          <td key={c.id} className="py-2.5 px-3 text-center font-mono">
                                            {sObj ? (
                                              <div className="flex flex-col items-center justify-center gap-0.5">
                                                <span className="font-semibold text-slate-100">
                                                  {sObj.isAbsent ? "ABS" : sObj.score}
                                                </span>
                                                {sObj.provenance && (
                                                  <span
                                                    className={`text-[8px] px-1 py-0.2 rounded font-sans font-extrabold uppercase ${
                                                      sObj.provenance === "CBT"
                                                        ? "bg-purple-900/60 text-purple-300 border border-purple-500/40"
                                                        : "bg-slate-800 text-slate-300"
                                                    }`}
                                                  >
                                                    {sObj.provenance}
                                                  </span>
                                                )}
                                              </div>
                                            ) : (
                                              "-"
                                            )}
                                          </td>
                                        );
                                      })
                                    ) : (
                                      <>
                                        <td className="py-2.5 px-3 text-center font-mono">
                                          {caObj ? (caObj.isAbsent ? "ABS" : caObj.score) : "-"}
                                        </td>
                                        <td className="py-2.5 px-3 text-center font-mono">
                                          {examObj ? (examObj.isAbsent ? "ABS" : examObj.score) : "-"}
                                        </td>
                                      </>
                                    )}
                                    <td className="py-2.5 px-3 text-center font-bold font-mono text-[#D2AD36]">
                                      {res?.totalScore !== undefined && res?.totalScore !== null ? res.totalScore : "-"}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-bold">
                                      {res?.grade ? (
                                        <span className="px-2 py-0.5 rounded bg-[#1E3A5F] text-slate-200">
                                          {res.grade}
                                        </span>
                                      ) : (
                                        "-"
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Audit Trail Timeline */}
                  {detailData.auditLogs && detailData.auditLogs.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#D2AD36]" />
                        Workflow Audit History Log
                      </h3>
                      <div className="space-y-2 bg-[#070B14] p-4 rounded-2xl border border-[#1E3A5F]">
                        {detailData.auditLogs.map((log: any, lIdx: number) => (
                          <div key={lIdx} className="flex items-start justify-between text-[11px] border-b border-[#1E3A5F]/40 pb-2 last:border-0 last:pb-0">
                            <div>
                              <span className="font-bold text-white">{log.action || log.toStatus}</span>
                              <span className="text-slate-400 ml-2">by user {log.actorUserId || "SYSTEM"}</span>
                              {log.reason && (
                                <p className="text-slate-300 font-mono mt-0.5">&quot;{log.reason}&quot;</p>
                              )}
                            </div>
                            <span className="text-slate-500 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-6 border-t border-[#1E3A5F] bg-[#070B14] flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={closeDetailsModal}
                className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#2A4D7C] text-slate-200 font-bold text-xs rounded-xl transition"
              >
                Close
              </button>

              {detailData && (
                <div className="flex flex-wrap items-center gap-3">
                  {/* Approve Action */}
                  {detailData.submission.status === "SUBMITTED" && (
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve Submission
                    </button>
                  )}

                  {/* Reject Action */}
                  {detailData.submission.status === "SUBMITTED" && (
                    <button
                      onClick={() => setRejectModalOpen(true)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject with Reason
                    </button>
                  )}

                  {/* Publish Action */}
                  {detailData.submission.status === "APPROVED" && (
                    <button
                      onClick={handlePublish}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-[#D2AD36] hover:bg-[#b8952b] text-[#0A192E] font-extrabold text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <Globe className="h-4 w-4" />
                      Publish Results
                    </button>
                  )}

                  {/* Reopen Action */}
                  {detailData.submission.status === "PUBLISHED" && (
                    <button
                      onClick={() => setReopenModalOpen(true)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reopen Published Gradebook
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT REASON MODAL */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A192E] border border-rose-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-rose-300 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-400" />
              Reject Gradebook Submission
            </h3>
            <p className="text-xs text-slate-300">
              Provide a mandatory rejection reason for the teacher. This reason will be displayed in their gradebook portal so they can make corrections.
            </p>
            <textarea
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="Enter rejection reason (at least 3 characters)..."
              rows={3}
              className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => { setRejectModalOpen(false); setReasonInput(""); }}
                className="px-3.5 py-2 bg-[#1E3A5F] text-slate-200 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={actionLoading || reasonInput.trim().length < 3}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl disabled:opacity-40"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REOPEN REASON MODAL */}
      {reopenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A192E] border border-amber-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-amber-300 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-400" />
              Reopen Published Gradebook
            </h3>
            <p className="text-xs text-slate-300">
              Reopening a published gradebook will unpublish the results from Student & Parent portals and reset status to DRAFT for teacher edits.
            </p>
            <textarea
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="Enter reopen reason (at least 3 characters)..."
              rows={3}
              className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => { setReopenModalOpen(false); setReasonInput(""); }}
                className="px-3.5 py-2 bg-[#1E3A5F] text-slate-200 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleReopenSubmit}
                disabled={actionLoading || reasonInput.trim().length < 3}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold rounded-xl disabled:opacity-40"
              >
                Confirm Reopen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
