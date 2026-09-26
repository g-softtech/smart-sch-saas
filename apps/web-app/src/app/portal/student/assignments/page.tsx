"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { FileText, Send, CheckCircle, Clock, AlertCircle, X } from "lucide-react";

export default function StudentAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [textContent, setTextContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  async function fetchAssignments() {
    try {
      setLoading(true);
      const res = await apiClient.get<any>("/api/v1/portal/student/assignments");
      setAssignments(res.data || []);
    } catch (err: any) {
      console.error("Failed to load assignments:", err);
      setError(err.message || "Failed to load homework assignments");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssignment || !textContent.trim()) return;

    try {
      setSubmitting(true);
      await apiClient.post(`/api/v1/portal/student/assignments/${selectedAssignment.id}/submit`, {
        textContent,
      });
      setSubmitSuccess("Assignment submitted successfully!");
      setTextContent("");
      setSelectedAssignment(null);
      await fetchAssignments();
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-amber-400" />
            Homework & Tasks
          </h1>
          <p className="text-sm text-slate-400">View your assigned homework tasks and submit solutions.</p>
        </div>
      </div>

      {submitSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span>{submitSuccess}</span>
          </div>
          <button onClick={() => setSubmitSuccess(null)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((a) => (
            <div key={a.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-base text-white">{a.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{a.description}</p>
                </div>
                <div>
                  {a.submission ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {a.submission.status}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Pending
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                <div className="flex items-center text-slate-400 gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                </div>

                {a.submission ? (
                  <div className="text-right">
                    {a.submission.score !== null && a.submission.score !== undefined ? (
                      <span className="font-bold text-emerald-400">Score: {a.submission.score} pts</span>
                    ) : (
                      <span className="text-slate-400 italic">Submitted (Awaiting Grade)</span>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedAssignment(a)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium flex items-center gap-1 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Submit Solution
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submission Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="font-bold text-lg text-white">Submit Assignment: {selectedAssignment.title}</h2>
              <button onClick={() => setSelectedAssignment(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Your Solution Text
                </label>
                <textarea
                  rows={5}
                  required
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Enter your answers or solution text here..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold flex items-center gap-2"
                >
                  {submitting ? "Submitting..." : "Submit Homework"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
