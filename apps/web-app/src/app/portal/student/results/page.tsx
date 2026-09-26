"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Award, AlertCircle, CheckCircle } from "lucide-react";

export default function StudentResultsPage() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        setLoading(true);
        const res = await apiClient.get<any>("/api/v1/portal/student/results");
        setResults(res.data || []);
      } catch (err: any) {
        console.error("Failed to load results:", err);
        setError(err.message || "Failed to load academic results");
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Award className="h-6 w-6 text-emerald-400" />
            Academic Results & Grades
          </h1>
          <p className="text-sm text-slate-400">View your published subject scores, assessment breakdowns, and grades.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          {results.map((r) => (
            <div key={r.id} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="font-bold text-lg text-white">{r.subject?.name || "Subject"}</h2>
                  <p className="text-xs text-slate-400">
                    {r.academicYear?.name} • {r.term?.name}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-emerald-400">
                    {r.totalScore !== null ? `${r.totalScore} pts` : "N/A"}
                  </span>
                  {r.grade && (
                    <span className="ml-2 px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                      Grade: {r.grade}
                    </span>
                  )}
                </div>
              </div>

              {/* Assessment Score Components */}
              {r.scores && r.scores.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assessment Components</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {r.scores.map((score: any) => (
                      <div key={score.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                        <span className="text-xs text-slate-300 font-medium">{score.type}</span>
                        <span className="text-sm font-bold text-white">
                          {score.score} / {score.maxScore}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-2">
          <Award className="h-10 w-10 mx-auto text-slate-600" />
          <h3 className="font-bold text-white text-base">No Results Published Yet</h3>
          <p className="text-xs">Your subject report cards will appear here once published by your school.</p>
        </div>
      )}
    </div>
  );
}
