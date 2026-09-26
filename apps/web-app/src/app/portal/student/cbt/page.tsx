"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Clock, Play, CheckCircle, AlertCircle, X, CheckSquare } from "lucide-react";

export default function StudentCBTPage() {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [attempt, setAttempt] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{ [qId: string]: number }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any | null>(null);

  useEffect(() => {
    fetchCBTExams();
  }, []);

  async function fetchCBTExams() {
    try {
      setLoading(true);
      const res = await apiClient.get<any>("/api/v1/portal/student/cbt");
      setExams(res.data || []);
    } catch (err: any) {
      console.error("Failed to load CBT exams:", err);
      setError(err.message || "Failed to load CBT examinations");
    } finally {
      setLoading(false);
    }
  }

  async function startExam(exam: any) {
    try {
      setActiveExam(exam);
      setLoading(true);
      const res = await apiClient.post<any>(`/api/v1/portal/student/cbt/${exam.id}/start`, {});
      setAttempt(res.data);

      // Fetch exam questions
      const qRes = await apiClient.get<any>(`/api/v1/cbt/${exam.id}/attempts/questions`);
      setQuestions(qRes.data || []);
    } catch (err: any) {
      alert(`Failed to start CBT exam: ${err.message}`);
      setActiveExam(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitCBT() {
    if (!activeExam) return;

    try {
      setSubmitting(true);
      const formattedAnswers = Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      }));

      const res = await apiClient.post<any>(`/api/v1/portal/student/cbt/${activeExam.id}/submit`, {
        answers: formattedAnswers,
      });

      setSubmitResult(res.data);
      setActiveExam(null);
      setAttempt(null);
      await fetchCBTExams();
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
            <Clock className="h-6 w-6 text-emerald-400" />
            CBT Examinations
          </h1>
          <p className="text-sm text-slate-400">Take computer-based examinations and view your auto-graded scores.</p>
        </div>
      </div>

      {submitResult && (
        <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6" />
            <div>
              <h3 className="font-bold text-base">Exam Completed & Auto-Graded!</h3>
              <p className="text-sm">Total Score: <span className="font-extrabold text-white">{submitResult.totalScore} pts</span></p>
            </div>
          </div>
          <button onClick={() => setSubmitResult(null)} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
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
          {exams.map((e) => (
            <div key={e.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-base text-white">{e.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{e.instructions}</p>
                </div>
                <div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    e.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}>
                    {e.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                <div className="text-slate-400">
                  <span>Duration: <strong className="text-white">{e.durationMinutes} mins</strong></span>
                  <span className="mx-2">•</span>
                  <span>Max Score: <strong className="text-white">{e.maxScore}</strong></span>
                </div>

                {e.attempt ? (
                  <div className="text-right font-semibold text-emerald-400">
                    Score: {e.attempt.totalScore} pts ({e.attempt.status})
                  </div>
                ) : (
                  <button
                    onClick={() => startExam(e)}
                    disabled={e.status !== "ACTIVE"}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Start Exam
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CBT Exam Taking Interface Modal */}
      {activeExam && attempt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="font-extrabold text-xl text-white">{activeExam.title}</h2>
                <p className="text-xs text-slate-400 mt-1">Duration: {activeExam.durationMinutes} minutes</p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1.5">
                <Clock className="h-4 w-4 animate-pulse" />
                <span>Timer Active</span>
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((q, qIndex) => (
                <div key={q.id} className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-sm text-white">
                      Q{qIndex + 1}. {q.questionText}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">({q.points} pts)</span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {q.options.map((opt: string, optIndex: number) => {
                      const isSelected = answers[q.id] === optIndex;
                      return (
                        <label
                          key={optIndex}
                          onClick={() => setAnswers({ ...answers, [q.id]: optIndex })}
                          className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-emerald-500/20 border-emerald-500 text-white"
                              : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q_${q.id}`}
                            checked={isSelected}
                            onChange={() => {}}
                            className="hidden"
                          />
                          <div className={`h-5 w-5 rounded-full border flex items-center justify-center text-xs font-bold ${
                            isSelected ? "border-emerald-400 bg-emerald-500 text-white" : "border-slate-600 text-slate-400"
                          }`}>
                            {String.fromCharCode(65 + optIndex)}
                          </div>
                          <span className="text-sm">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to exit the exam? Unsubmitted answers will be lost.")) {
                    setActiveExam(null);
                    setAttempt(null);
                  }
                }}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 text-sm hover:text-white"
              >
                Exit Exam
              </button>
              <button
                type="button"
                onClick={handleSubmitCBT}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <CheckSquare className="h-4 w-4" />
                {submitting ? "Grading..." : "Submit Examination"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
