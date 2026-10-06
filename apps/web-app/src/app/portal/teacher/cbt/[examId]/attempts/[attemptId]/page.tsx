"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { ArrowLeft, CheckCircle, AlertCircle, RefreshCw, Save, User, FileText } from "lucide-react";

export default function TeacherAttemptReviewPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const attemptId = params.attemptId as string;

  const [attemptDetail, setAttemptDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State to hold manual scores input by the teacher
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`api/v1/academics/teacher/cbt/attempts/${attemptId}`);
      const data = (res as any).data || res;
      setAttemptDetail(data);

      // Pre-populate manual scores state from existing awardedScore for subjective questions
      const initialScores: Record<string, number> = {};
      if (data && data.questions) {
        data.questions.forEach((q: any) => {
          if (q.requiresManualReview && q.awardedScore !== null && q.awardedScore !== undefined && q.answerId) {
            initialScores[q.answerId] = q.awardedScore;
          }
        });
      }
      setManualScores(initialScores);

    } catch (e: any) {
      setError(e.message || "Failed to load attempt details.");
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    if (attemptId) fetchData();
  }, [attemptId, fetchData]);

  const handleScoreChange = (answerId: string, value: string, maxPoints: number) => {
    const score = Number(value);
    if (isNaN(score)) return;
    if (score < 0 || score > maxPoints) return;
    
    setManualScores(prev => ({
      ...prev,
      [answerId]: score
    }));
  };

  const handleSaveReview = async () => {
    if (!attemptDetail) return;
    
    // Prepare ReviewAttemptDto
    const answersToUpdate = Object.entries(manualScores).map(([answerId, awardedScore]) => ({
      answerId,
      awardedScore
    }));

    if (answersToUpdate.length === 0) {
      alert("No subjective scores to save.");
      return;
    }

    setSaving(true);
    try {
      await apiClient.put(`api/v1/academics/teacher/cbt/attempts/${attemptId}/review`, {
        answers: answersToUpdate
      });
      alert("Review scores saved successfully!");
      fetchData(); // Refresh to get updated total score and status
    } catch (e: any) {
      alert("Failed to save review: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const renderStudentAnswer = (q: any) => {
    if (!q.answerPayload) return <span className="text-slate-500 italic">No answer provided</span>;

    if (q.questionType === "SUBJECTIVE") {
      return <div className="whitespace-pre-wrap text-slate-300">{q.answerPayload.text || q.answerPayload.answer || "-"}</div>;
    }
    
    if (q.questionType === "SINGLE_CHOICE" || q.questionType === "TRUE_FALSE") {
      const idx = q.answerPayload.selectedOption;
      if (idx !== undefined && idx !== null && q.options && q.options[idx]) {
        return <span className="text-slate-300">{q.options[idx]}</span>;
      }
      return <span className="text-slate-500 italic">Invalid option selected</span>;
    }

    if (q.questionType === "MULTIPLE_CHOICE") {
      const arr = q.answerPayload.selectedOptions;
      if (Array.isArray(arr) && arr.length > 0 && q.options) {
        return (
          <ul className="list-disc pl-5 text-slate-300">
            {arr.map((idx: number) => (
              <li key={idx}>{q.options[idx] || "Unknown"}</li>
            ))}
          </ul>
        );
      }
      return <span className="text-slate-500 italic">Invalid options selected</span>;
    }

    return <span className="text-slate-500 italic">Unsupported format</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <div className="animate-spin h-6 w-6 border-2 border-[#D2AD36] border-t-transparent rounded-full mr-3"></div>
        Loading attempt details...
      </div>
    );
  }

  if (error || !attemptDetail) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="p-4 bg-rose-900/20 border border-rose-500/50 rounded-xl text-rose-400 text-sm">
          {error || "Attempt not found"}
        </div>
      </div>
    );
  }

  const { student, exam, questions, status, totalScore } = attemptDetail;

  if (exam?.id !== examId) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="p-4 bg-rose-900/20 border border-rose-500/50 rounded-xl text-rose-400 text-sm">
          Attempt does not belong to the requested exam.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href={`/portal/teacher/cbt/${examId}`} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition mb-4 w-max">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Exam
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Review Attempt</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {student?.lastName}, {student?.firstName} ({student?.admissionNumber})</span>
              <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {exam?.title}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              <span
                className={`px-2 py-0.5 rounded font-bold uppercase tracking-wide ${
                  status === "GRADED"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : status === "PENDING_REVIEW"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-blue-500/10 text-blue-400"
                }`}
              >
                {status}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-sm text-slate-400">Total Score</div>
            <div className="text-3xl font-bold text-[#D2AD36]">
              {totalScore !== null && totalScore !== undefined ? totalScore : "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Review Section */}
      <div className="bg-[#0A192E] border border-[#1E3A5F] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#1E3A5F] flex justify-between items-center bg-[#070B14]">
          <h2 className="text-lg font-semibold text-white">Student Answers</h2>
          <button
            onClick={handleSaveReview}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#D2AD36] text-[#0A192E] font-bold text-sm rounded-lg hover:bg-[#e0b943] transition disabled:opacity-50"
          >
            {saving ? <div className="animate-spin h-4 w-4 border-2 border-[#0A192E] border-t-transparent rounded-full" /> : <Save className="h-4 w-4" />}
            Save Review
          </button>
        </div>

        <div className="p-5 space-y-6">
          {questions?.map((q: any, index: number) => (
            <div key={q.questionId} className="p-4 bg-[#0B1B32] border border-[#1E3A5F] rounded-lg">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#1E3A5F] text-slate-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-slate-200 text-sm font-medium">{q.questionText}</h3>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">
                      {q.questionType.replace("_", " ")} • {q.points} Points
                    </div>
                  </div>
                </div>
                {q.requiresManualReview && (
                  <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase rounded flex items-center gap-1 shrink-0">
                    <AlertCircle className="h-3 w-3" /> Needs Review
                  </span>
                )}
              </div>

              <div className="ml-9 p-3 bg-[#070B14] border border-[#1E3A5F]/50 rounded-lg mb-4">
                <div className="text-[10px] uppercase text-slate-500 mb-2 font-semibold">Student Response:</div>
                {renderStudentAnswer(q)}
              </div>

              <div className="ml-9 flex items-center justify-end border-t border-[#1E3A5F] pt-3">
                {q.requiresManualReview ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-400">Awarded Score:</span>
                    <input
                      type="number"
                      min="0"
                      max={q.points}
                      value={q.answerId && manualScores[q.answerId] !== undefined ? manualScores[q.answerId] : ""}
                      onChange={(e) => handleScoreChange(q.answerId, e.target.value, q.points)}
                      disabled={!q.answerId}
                      className="w-20 bg-[#070B14] border border-[#1E3A5F] text-white text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-[#D2AD36]"
                    />
                    <span className="text-xs text-slate-500">/ {q.points}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-400">Auto-Graded Score:</span>
                    <span className={`text-lg font-bold ${q.awardedScore === q.points ? "text-emerald-400" : q.awardedScore === 0 ? "text-rose-400" : "text-amber-400"}`}>
                      {q.awardedScore !== null ? q.awardedScore : "-"}
                    </span>
                    <span className="text-xs text-slate-500">/ {q.points}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {(!questions || questions.length === 0) && (
            <div className="text-center py-8 text-slate-400 text-sm">
              No questions found for this attempt.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
