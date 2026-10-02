"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import {
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  Filter,
} from "lucide-react";

export default function AdminLessonNotesReviewPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("SUBMITTED");

  const [lessonNotes, setLessonNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Review Modal State
  const [reviewingNote, setReviewingNote] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const fetchReferenceData = useCallback(async () => {
    try {
      setLoading(true);
      const [ayRes, termsRes, classesRes] = await Promise.all([
        apiClient.get<any>("/api/v1/academics/academic-years"),
        apiClient.get<any>("/api/v1/academics/terms"),
        apiClient.get<any>("/api/v1/academics/classes"),
      ]);
      setAcademicYears(ayRes?.data || ayRes || []);
      setTerms(termsRes?.data || termsRes || []);
      setClasses(classesRes?.data || classesRes || []);
    } catch (err: any) {
      console.error("Failed to fetch reference data:", err);
      setError("Failed to load academic reference data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLessonNotes = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedYearId) queryParams.append("academicYearId", selectedYearId);
      if (selectedTermId) queryParams.append("termId", selectedTermId);
      if (selectedClassId) queryParams.append("classId", selectedClassId);
      if (selectedStatus) queryParams.append("status", selectedStatus);

      const res = await apiClient.get<any>(`/api/v1/academics/lesson-notes?${queryParams.toString()}`);
      setLessonNotes(res?.data || res || []);
    } catch (err: any) {
      console.error("Failed to load lesson notes:", err);
      setError("Failed to load lesson notes for review.");
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, selectedTermId, selectedClassId, selectedStatus]);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  useEffect(() => {
    fetchLessonNotes();
  }, [fetchLessonNotes]);

  const handleApprove = async (noteId: string) => {
    try {
      setError(null);
      setSuccess(null);
      await apiClient.post(`/api/v1/academics/lesson-notes/${noteId}/approve`);
      setSuccess("Lesson note approved successfully.");
      setReviewingNote(null);
      fetchLessonNotes();
    } catch (err: any) {
      setError(err.message || "Failed to approve lesson note.");
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingNote || !rejectionReason.trim()) return;

    try {
      setError(null);
      setSuccess(null);
      await apiClient.post(`/api/v1/academics/lesson-notes/${reviewingNote.id}/reject`, {
        reason: rejectionReason,
      });

      setSuccess("Lesson note rejected and returned to teacher with feedback.");
      setReviewingNote(null);
      setIsRejectOpen(false);
      setRejectionReason("");
      fetchLessonNotes();
    } catch (err: any) {
      setError(err.message || "Failed to reject lesson note.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="h-3 w-3" /> APPROVED
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="h-3 w-3" /> PENDING REVIEW
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="h-3 w-3" /> REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20">
            DRAFT
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-8 text-white border border-slate-800 shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-[#D2AD36] text-xs font-bold uppercase tracking-wider mb-3">
            Academic Governance
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            Lesson Notes Review & Approval
          </h1>
          <p className="mt-2 text-slate-300 text-sm">
            Review, approve, or reject weekly teacher lesson plans across all classes and subjects.
          </p>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Control Bar */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Academic Year
          </label>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#D2AD36]"
          >
            <option value="">All Academic Years</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {ay.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Term
          </label>
          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#D2AD36]"
          >
            <option value="">All Terms</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#D2AD36]"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Review Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#D2AD36]"
          >
            <option value="SUBMITTED">Pending Review (Submitted)</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="DRAFT">Drafts</option>
          </select>
        </div>
      </div>

      {/* Lesson Notes List */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#D2AD36]" />
          Lesson Notes Submissions ({lessonNotes.length})
        </h2>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D2AD36]"></div>
          </div>
        ) : lessonNotes.length > 0 ? (
          <div className="space-y-4">
            {lessonNotes.map((note) => (
              <div
                key={note.id}
                className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-600 transition"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-bold text-[#D2AD36] uppercase tracking-wider">
                      Week {note.weekNumber}
                    </span>
                    {getStatusBadge(note.status)}
                  </div>
                  <h3 className="text-base font-bold text-white">{note.title}</h3>
                  <p className="text-xs text-slate-400">
                    Subject: <span className="text-slate-200 font-semibold">{note.subject?.name}</span> • Class:{" "}
                    <span className="text-slate-200 font-semibold">
                      {note.class?.name} {note.arm?.name ? `(${note.arm.name})` : ""}
                    </span> • Teacher:{" "}
                    <span className="text-slate-200 font-semibold">
                      {note.teacher?.firstName} {note.teacher?.lastName}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const res = await apiClient.get<any>(`/api/v1/academics/lesson-notes/${note.id}`);
                        setReviewingNote(res?.data || res);
                      } catch (err: any) {
                        setError("Failed to fetch detailed lesson note.");
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Eye className="h-4 w-4" /> Review Note
                  </button>
                  {note.status === "SUBMITTED" && (
                    <>
                      <button
                        onClick={() => handleApprove(note.id)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <CheckCircle className="h-4 w-4" /> Approve
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await apiClient.get<any>(`/api/v1/academics/lesson-notes/${note.id}`);
                            setReviewingNote(res?.data || res);
                            setIsRejectOpen(true);
                          } catch (err: any) {
                            setError("Failed to fetch lesson note.");
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic py-6 text-center">
            No lesson notes matching the selected filter criteria.
          </p>
        )}
      </div>

      {/* Review Modal */}
      {reviewingNote && !isRejectOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0A192E] border border-slate-700 rounded-2xl max-w-3xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-[#D2AD36] uppercase tracking-wider">
                  Week {reviewingNote.weekNumber} • {reviewingNote.status}
                </span>
                <h2 className="text-xl font-extrabold text-white">{reviewingNote.title}</h2>
                <p className="text-xs text-slate-400">
                  Teacher: {reviewingNote.teacher?.firstName} {reviewingNote.teacher?.lastName} • Subject:{" "}
                  {reviewingNote.subject?.name} • Class: {reviewingNote.class?.name}
                </p>
              </div>
              <button
                onClick={() => setReviewingNote(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <div>
                <span className="font-bold text-white block text-xs uppercase">Topic</span>
                <p>{reviewingNote.topic} {reviewingNote.subtopic ? `(${reviewingNote.subtopic})` : ""}</p>
              </div>

              <div>
                <span className="font-bold text-white block text-xs uppercase">Learning Objectives</span>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {Array.isArray(reviewingNote.objectives)
                    ? reviewingNote.objectives.map((o: string, idx: number) => <li key={idx}>{o}</li>)
                    : <li>{reviewingNote.objectives}</li>}
                </ul>
              </div>

              {reviewingNote.materials && (
                <div>
                  <span className="font-bold text-white block text-xs uppercase">Instructional Materials</span>
                  <p className="text-xs">{reviewingNote.materials}</p>
                </div>
              )}

              <div>
                <span className="font-bold text-white block text-xs uppercase">Presentation Steps</span>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  {Array.isArray(reviewingNote.presentationSteps)
                    ? reviewingNote.presentationSteps.map((s: string, idx: number) => <li key={idx}>{s}</li>)
                    : <li>{reviewingNote.presentationSteps}</li>}
                </ol>
              </div>

              {/* Audit History */}
              {reviewingNote.auditLogs && reviewingNote.auditLogs.length > 0 && (
                <div className="pt-4 border-t border-slate-800">
                  <span className="font-bold text-white block text-xs uppercase mb-2">Workflow History</span>
                  <div className="space-y-2 text-xs">
                    {reviewingNote.auditLogs.map((log: any) => (
                      <div key={log.id} className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/40 flex justify-between">
                        <div>
                          <span className="font-bold text-[#D2AD36]">{log.action}</span>
                          {log.reason && <p className="text-rose-300 mt-1">Reason: {log.reason}</p>}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {reviewingNote.status === "SUBMITTED" && (
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRejectOpen(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <XCircle className="h-4 w-4" /> Reject Note
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(reviewingNote.id)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" /> Approve Note
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectOpen && reviewingNote && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A192E] border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Reject Lesson Note</h3>
            <p className="text-xs text-slate-300">
              Provide feedback for <span className="font-bold text-white">{reviewingNote.title}</span>. The teacher will be able to correct and resubmit.
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Rejection Reason / Feedback (Required)
                </label>
                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  placeholder="Explain what needs correction..."
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRejectOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
