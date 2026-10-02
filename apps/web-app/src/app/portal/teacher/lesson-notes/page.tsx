"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import {
  FileText,
  Plus,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Edit3,
  Eye,
  XCircle,
  BookOpen,
} from "lucide-react";

export default function TeacherLessonNotesPage() {
  const [scopes, setScopes] = useState<any[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [lessonNotes, setLessonNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [viewingNote, setViewingNote] = useState<any | null>(null);

  // Form state
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [objectives, setObjectives] = useState("");
  const [materials, setMaterials] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [presentationSteps, setPresentationSteps] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [homeworkAssignment, setHomeworkAssignment] = useState("");

  const fetchScope = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>("/api/v1/academics/teacher-gradebook/scope");
      const list = res?.data || res || [];
      setScopes(list);
      if (list.length > 0) {
        setSelectedAssignmentId(list[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load teacher scopes:", err);
      setError("Failed to load assigned subject teaching scopes.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLessonNotes = useCallback(async () => {
    if (!selectedAssignmentId) return;
    const selectedScope = scopes.find((s) => s.id === selectedAssignmentId);
    if (!selectedScope) return;

    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        academicYearId: selectedScope.academicYearId,
        termId: selectedScope.termId,
        classId: selectedScope.classId,
        subjectId: selectedScope.subjectId,
      });
      if (selectedScope.armId) {
        queryParams.append("armId", selectedScope.armId);
      }

      const res = await apiClient.get<any>(`/api/v1/academics/lesson-notes?${queryParams.toString()}`);
      setLessonNotes(res?.data || res || []);
    } catch (err: any) {
      console.error("Failed to load lesson notes:", err);
      setError("Failed to load lesson notes for selected subject.");
    } finally {
      setLoading(false);
    }
  }, [selectedAssignmentId, scopes]);

  useEffect(() => {
    fetchScope();
  }, [fetchScope]);

  useEffect(() => {
    if (selectedAssignmentId) {
      fetchLessonNotes();
    }
  }, [selectedAssignmentId, fetchLessonNotes]);

  const resetForm = () => {
    setWeekNumber(1);
    setTitle("");
    setTopic("");
    setSubtopic("");
    setObjectives("");
    setMaterials("");
    setIntroduction("");
    setPresentationSteps("");
    setEvaluation("");
    setHomeworkAssignment("");
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentId) return;

    try {
      setError(null);
      setSuccess(null);
      await apiClient.post("/api/v1/academics/lesson-notes", {
        assignmentId: selectedAssignmentId,
        weekNumber: Number(weekNumber),
        title,
        topic,
        subtopic,
        objectives: objectives.split("\n").filter((o) => o.trim() !== ""),
        materials,
        introduction,
        presentationSteps: presentationSteps.split("\n").filter((s) => s.trim() !== ""),
        evaluation,
        assignment: homeworkAssignment,
      });

      setSuccess("Lesson note created successfully in DRAFT state.");
      setIsCreateOpen(false);
      resetForm();
      fetchLessonNotes();
    } catch (err: any) {
      setError(err.message || "Failed to create lesson note.");
    }
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    try {
      setError(null);
      setSuccess(null);
      await apiClient.put(`/api/v1/academics/lesson-notes/${editingNote.id}`, {
        weekNumber: Number(weekNumber),
        title,
        topic,
        subtopic,
        objectives: typeof objectives === "string" ? objectives.split("\n").filter((o) => o.trim() !== "") : objectives,
        materials,
        introduction,
        presentationSteps: typeof presentationSteps === "string" ? presentationSteps.split("\n").filter((s) => s.trim() !== "") : presentationSteps,
        evaluation,
        assignment: homeworkAssignment,
      });

      setSuccess("Lesson note updated successfully.");
      setEditingNote(null);
      resetForm();
      fetchLessonNotes();
    } catch (err: any) {
      setError(err.message || "Failed to update lesson note.");
    }
  };

  const handleSubmitNote = async (noteId: string) => {
    try {
      setError(null);
      setSuccess(null);
      await apiClient.post(`/api/v1/academics/lesson-notes/${noteId}/submit`);
      setSuccess("Lesson note submitted for administrative review.");
      fetchLessonNotes();
    } catch (err: any) {
      setError(err.message || "Failed to submit lesson note.");
    }
  };

  const openEditModal = (note: any) => {
    setEditingNote(note);
    setWeekNumber(note.weekNumber);
    setTitle(note.title);
    setTopic(note.topic);
    setSubtopic(note.subtopic || "");
    setObjectives(Array.isArray(note.objectives) ? note.objectives.join("\n") : "");
    setMaterials(note.materials || "");
    setIntroduction(note.introduction || "");
    setPresentationSteps(Array.isArray(note.presentationSteps) ? note.presentationSteps.join("\n") : "");
    setEvaluation(note.evaluation || "");
    setHomeworkAssignment(note.assignment || "");
  };

  const openViewModal = async (noteId: string) => {
    try {
      const res = await apiClient.get<any>(`/api/v1/academics/lesson-notes/${noteId}`);
      setViewingNote(res?.data || res);
    } catch (err: any) {
      setError("Failed to fetch detailed lesson note.");
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
            <Clock className="h-3 w-3" /> SUBMITTED
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
            <Edit3 className="h-3 w-3" /> DRAFT
          </span>
        );
    }
  };

  const selectedScope = scopes.find((s) => s.id === selectedAssignmentId);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-8 text-white border border-blue-800/40 shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-[#D2AD36] text-xs font-bold uppercase tracking-wider mb-3">
            Academic Operations
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            Lesson Planning & Notes
          </h1>
          <p className="mt-2 text-slate-300 text-sm">
            Create, edit, and submit weekly lesson plans for administrative approval.
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

      {/* Scope Selector Card */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Select Teaching Assignment
          </label>
          {scopes.length > 0 ? (
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#D2AD36]"
            >
              {scopes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.className} {s.armName ? `(${s.armName})` : "(Class-Wide)"} — {s.subjectName}{" "}
                  {s.isPrimary ? "[Primary]" : "[Co-Teacher]"}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-slate-400 italic">No assigned subject scopes found.</p>
          )}
        </div>

        {selectedScope && (
          <button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D2AD36] text-[#0A192E] font-bold text-sm hover:bg-[#D2AD36]/90 transition shadow-lg shadow-[#D2AD36]/20"
          >
            <Plus className="h-4 w-4" /> Create Lesson Note
          </button>
        )}
      </div>

      {/* Lesson Notes List */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#D2AD36]" />
          Lesson Notes for {selectedScope?.subjectName || "Subject"}
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
                className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3 hover:border-slate-600 transition"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-[#D2AD36] uppercase tracking-wider block">
                      Week {note.weekNumber}
                    </span>
                    <h3 className="text-base font-bold text-white">{note.title}</h3>
                    <p className="text-xs text-slate-400">Topic: {note.topic}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(note.status)}
                    <button
                      onClick={() => openViewModal(note.id)}
                      className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-200 transition"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {(note.status === "DRAFT" || note.status === "REJECTED") && (
                      <>
                        <button
                          onClick={() => openEditModal(note)}
                          className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition"
                          title="Edit Content"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSubmitNote(note.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition flex items-center gap-1"
                        >
                          <Send className="h-3 w-3" /> Submit
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {note.status === "REJECTED" && note.rejectionReason && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
                    <span className="font-bold block">Rejection Feedback:</span>
                    <p>{note.rejectionReason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic py-6 text-center">
            No lesson notes created for this subject yet. Click &quot;Create Lesson Note&quot; to begin.
          </p>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(isCreateOpen || editingNote) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0A192E] border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-extrabold text-white">
              {editingNote ? "Edit Lesson Note" : "Create New Lesson Note"}
            </h2>

            <form onSubmit={editingNote ? handleUpdateNote : handleCreateNote} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Week Number</label>
                  <input
                    type="number"
                    min={1}
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2AD36]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Lesson Title"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2AD36]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  placeholder="Main Topic"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2AD36]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Subtopic (Optional)</label>
                <input
                  type="text"
                  value={subtopic}
                  onChange={(e) => setSubtopic(e.target.value)}
                  placeholder="Subtopic"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2AD36]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Learning Objectives (One per line)</label>
                <textarea
                  rows={3}
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  required
                  placeholder="1. Students will be able to..."
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2AD36]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Instructional Materials / Aids</label>
                <input
                  type="text"
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  placeholder="Charts, Flashcards, Textbooks..."
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2AD36]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Introduction</label>
                <textarea
                  rows={2}
                  value={introduction}
                  onChange={(e) => setIntroduction(e.target.value)}
                  placeholder="Teacher introduces lesson by..."
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2AD36]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Presentation Steps (One per line)</label>
                <textarea
                  rows={4}
                  value={presentationSteps}
                  onChange={(e) => setPresentationSteps(e.target.value)}
                  required
                  placeholder="Step 1: Teacher explains...&#10;Step 2: Guided practice..."
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2AD36]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Evaluation / Comprehension Check</label>
                <input
                  type="text"
                  value={evaluation}
                  onChange={(e) => setEvaluation(e.target.value)}
                  placeholder="Quick questions..."
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2AD36]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Homework / Assignment Notes</label>
                <input
                  type="text"
                  value={homeworkAssignment}
                  onChange={(e) => setHomeworkAssignment(e.target.value)}
                  placeholder="Exercises on page 45..."
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2AD36]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingNote(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#D2AD36] text-[#0A192E] text-xs font-bold hover:bg-[#D2AD36]/90 transition"
                >
                  {editingNote ? "Save Changes" : "Create Note (Draft)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewingNote && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0A192E] border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-[#D2AD36] uppercase tracking-wider">
                  Week {viewingNote.weekNumber}
                </span>
                <h2 className="text-xl font-extrabold text-white">{viewingNote.title}</h2>
                <p className="text-xs text-slate-400">
                  Subject: {viewingNote.subject?.name} • Class: {viewingNote.class?.name}
                </p>
              </div>
              <button
                onClick={() => setViewingNote(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <div>
                <span className="font-bold text-white block text-xs uppercase">Topic</span>
                <p>{viewingNote.topic} {viewingNote.subtopic ? `(${viewingNote.subtopic})` : ""}</p>
              </div>

              <div>
                <span className="font-bold text-white block text-xs uppercase">Learning Objectives</span>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {Array.isArray(viewingNote.objectives)
                    ? viewingNote.objectives.map((o: string, idx: number) => <li key={idx}>{o}</li>)
                    : <li>{viewingNote.objectives}</li>}
                </ul>
              </div>

              {viewingNote.materials && (
                <div>
                  <span className="font-bold text-white block text-xs uppercase">Materials</span>
                  <p className="text-xs">{viewingNote.materials}</p>
                </div>
              )}

              <div>
                <span className="font-bold text-white block text-xs uppercase">Presentation Steps</span>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  {Array.isArray(viewingNote.presentationSteps)
                    ? viewingNote.presentationSteps.map((s: string, idx: number) => <li key={idx}>{s}</li>)
                    : <li>{viewingNote.presentationSteps}</li>}
                </ol>
              </div>

              {/* Audit History */}
              {viewingNote.auditLogs && viewingNote.auditLogs.length > 0 && (
                <div className="pt-4 border-t border-slate-800">
                  <span className="font-bold text-white block text-xs uppercase mb-2">Workflow History</span>
                  <div className="space-y-2 text-xs">
                    {viewingNote.auditLogs.map((log: any) => (
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
          </div>
        </div>
      )}
    </div>
  );
}
