"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { MonitorCheck, Clock, Calendar, ChevronRight } from "lucide-react";

export default function TeacherCBTExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get("api/v1/academics/teacher/cbt/exams");
      setExams(Array.isArray(data) ? data : data?.data || []);
    } catch (e: any) {
      setError(e.message || "Failed to load CBT exams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MonitorCheck className="h-6 w-6 text-[#D2AD36]" />
            CBT Exams
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            View and monitor Computer Based Tests assigned to your classes
          </p>
        </div>
        <button
          onClick={fetchExams}
          className="text-xs font-semibold px-4 py-2 bg-[#1E3A5F] hover:bg-[#2A4A7F] text-slate-200 rounded-lg transition"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <div className="animate-spin h-6 w-6 border-2 border-[#D2AD36] border-t-transparent rounded-full mr-3"></div>
          Loading exams...
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-900/20 border border-rose-500/50 rounded-xl text-rose-400 text-sm">
          {error}
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-20 bg-[#0A192E] rounded-xl border border-[#1E3A5F]">
          <MonitorCheck className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-300">No CBT Exams Found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            There are currently no Computer Based Tests linked to your assigned subjects and classes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => (
            <Link
              key={exam.id}
              href={`/portal/teacher/cbt/${exam.id}`}
              className="group bg-[#0A192E] border border-[#1E3A5F] hover:border-[#D2AD36]/50 rounded-xl p-5 transition flex flex-col"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-slate-100 group-hover:text-white line-clamp-2">
                  {exam.title}
                </h3>
                <span
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${
                    exam.status === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : exam.status === "PUBLISHED"
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      : exam.status === "CLOSED"
                      ? "bg-slate-800 text-slate-400 border border-slate-700"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {exam.status}
                </span>
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex items-center text-xs text-slate-400">
                  <span className="w-16 font-medium text-slate-500">Subject:</span>
                  <span className="text-slate-300 truncate">
                    {exam.assessmentComponent?.subject || "N/A"}
                  </span>
                </div>
                <div className="flex items-center text-xs text-slate-400">
                  <span className="w-16 font-medium text-slate-500">Class:</span>
                  <span className="text-slate-300">
                    {exam.assessmentComponent?.class || "N/A"}
                    {exam.assessmentComponent?.arm ? ` (${exam.assessmentComponent.arm})` : ""}
                  </span>
                </div>
                <div className="flex items-center text-xs text-slate-400">
                  <span className="w-16 font-medium text-slate-500">Component:</span>
                  <span className="text-slate-300 truncate">
                    {exam.assessmentComponent?.title || "N/A"}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#1E3A5F] flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1" title="Duration">
                    <Clock className="w-3.5 h-3.5" />
                    {exam.durationMinutes}m
                  </div>
                  <div className="flex items-center gap-1" title="Availability">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(exam.availableFrom).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[#D2AD36] font-medium group-hover:underline">
                  Details <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
