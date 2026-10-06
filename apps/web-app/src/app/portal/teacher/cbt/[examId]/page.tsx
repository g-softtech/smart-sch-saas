"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { ArrowLeft, Clock, Calendar, FileText, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";

export default function TeacherCBTDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [exam, setExam] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [examRes, attemptsRes] = await Promise.all([
        apiClient.get(`api/v1/academics/teacher/cbt/exams/${examId}`),
        apiClient.get(`api/v1/academics/teacher/cbt/exams/${examId}/attempts`)
      ]);
      setExam((examRes as any).data || examRes);
      
      const attemptsData = (attemptsRes as any).data || attemptsRes;
      setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
    } catch (e: any) {
      setError(e.message || "Failed to load exam details or attempts");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (examId) fetchData();
  }, [examId, fetchData]);

  const handleCompile = async () => {
    if (!confirm("Are you sure you want to compile these scores to the Gradebook? Only CLOSED exams should be compiled.")) return;
    setCompiling(true);
    try {
      await apiClient.post(`api/v1/academics/teacher/cbt/exams/${examId}/compile`, {});
      alert("Scores compiled successfully!");
      fetchData();
    } catch (e: any) {
      alert("Compilation failed: " + (e.message || "Unknown error"));
    } finally {
      setCompiling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <div className="animate-spin h-6 w-6 border-2 border-[#D2AD36] border-t-transparent rounded-full mr-3"></div>
        Loading exam data...
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="p-4 bg-rose-900/20 border border-rose-500/50 rounded-xl text-rose-400 text-sm">
          {error || "Exam not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/portal/teacher/cbt" className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition mb-4 w-max">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to CBT Exams
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{exam.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {exam.assessmentComponent?.subject}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              <span>{exam.assessmentComponent?.class} {exam.assessmentComponent?.arm ? `(${exam.assessmentComponent.arm})` : ""}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              <span
                className={`px-2 py-0.5 rounded font-bold uppercase tracking-wide ${
                  exam.status === "ACTIVE"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : exam.status === "PUBLISHED"
                    ? "bg-blue-500/10 text-blue-400"
                    : exam.status === "CLOSED"
                    ? "bg-slate-800 text-slate-400"
                    : "bg-amber-500/10 text-amber-400"
                }`}
              >
                {exam.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-2 border border-[#1E3A5F] hover:bg-[#1E3A5F] rounded-lg text-slate-300 transition"
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            {exam.status === "CLOSED" && (
              <button
                onClick={handleCompile}
                disabled={compiling}
                className="px-4 py-2 bg-[#D2AD36] text-[#0A192E] font-bold text-sm rounded-lg hover:bg-[#e0b943] transition disabled:opacity-50"
              >
                {compiling ? "Compiling..." : "Compile to Gradebook"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0A192E] border border-[#1E3A5F] rounded-xl p-5">
          <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Timing
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-slate-500">DURATION</div>
              <div className="text-sm font-medium text-slate-200">{exam.durationMinutes} minutes</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">AVAILABLE FROM</div>
              <div className="text-sm text-slate-300">{new Date(exam.availableFrom).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">AVAILABLE TO</div>
              <div className="text-sm text-slate-300">{new Date(exam.availableTo).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="bg-[#0A192E] border border-[#1E3A5F] rounded-xl p-5 md:col-span-2">
          <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Instructions & Context
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-slate-500">ASSESSMENT COMPONENT</div>
              <div className="text-sm font-medium text-slate-200">{exam.assessmentComponent?.title}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">INSTRUCTIONS</div>
              <div className="text-sm text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {exam.instructions || "No specific instructions provided."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attempts List */}
      <div className="bg-[#0A192E] border border-[#1E3A5F] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#1E3A5F] flex justify-between items-center bg-[#070B14]">
          <h2 className="text-lg font-semibold text-white">Student Attempts ({attempts.length})</h2>
        </div>

        {attempts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No students have started this exam yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[#0B1B32] text-slate-400 border-b border-[#1E3A5F]">
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Started At</th>
                  <th className="px-5 py-3 font-medium">Submitted At</th>
                  <th className="px-5 py-3 font-medium text-right">Score</th>
                  <th className="px-5 py-3 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E3A5F]">
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-[#0F223D] transition">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-200">
                        {attempt.student?.lastName}, {attempt.student?.firstName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {attempt.student?.studentNumber}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                          attempt.status === "GRADED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : attempt.status === "PENDING_REVIEW"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}
                      >
                        {attempt.status === "GRADED" && <CheckCircle className="h-3 w-3" />}
                        {attempt.status === "PENDING_REVIEW" && <AlertCircle className="h-3 w-3" />}
                        {attempt.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-300 text-xs">
                      {new Date(attempt.startTime).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-slate-300 text-xs">
                      {attempt.endTime ? new Date(attempt.endTime).toLocaleString() : "-"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {attempt.totalScore !== null && attempt.totalScore !== undefined ? (
                        <span className="font-bold text-lg text-white">{attempt.totalScore}</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {(attempt.status === "PENDING_REVIEW" || attempt.status === "GRADED") ? (
                        <Link
                          href={`/portal/teacher/cbt/${examId}/attempts/${attempt.id}`}
                          className="text-[#D2AD36] hover:text-white font-medium text-xs underline underline-offset-4"
                        >
                          Review
                        </Link>
                      ) : (
                        <span className="text-slate-600 text-xs italic">In Progress</span>
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
  );
}
