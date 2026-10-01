"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { FileText, Award, Calendar, AlertCircle } from "lucide-react";

export default function ParentChildResultsPage() {
  const params = useParams();
  const childId = params.childId as string;

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        setLoading(true);
        const res = await apiClient.get<any>(`/api/v1/portal/parent/children/${childId}/results`);
        const payload = res?.data || res;
        if (payload?.results && Array.isArray(payload.results)) {
          setResults(payload.results);
          setSummary(payload.summary || null);
        } else if (Array.isArray(payload)) {
          setResults(payload);
          setSummary(null);
        } else {
          setResults([]);
          setSummary(null);
        }
      } catch (err: any) {
        console.error("Failed to load child results:", err);
        setError(err.message || "Failed to load report cards");
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [childId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D2AD36]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 flex items-center gap-3">
        <AlertCircle className="h-6 w-6 shrink-0" />
        <p className="text-sm font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 dark:text-slate-100 text-slate-900 flex items-center space-x-2">
            <FileText className="h-6 w-6 text-[#D2AD36]" />
            <span>Academic Results & Report Cards</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Official termly academic grades and subject score breakdown for linked child
          </p>
        </div>
      </div>

      {/* Result Summary Card */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#112240] border border-[#1E3A5F] flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Published Subjects</span>
            <span className="text-xl font-bold text-slate-100">{summary.totalSubjects}</span>
          </div>
          <div className="p-4 rounded-2xl bg-[#112240] border border-[#1E3A5F] flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Score</span>
            <span className="text-xl font-bold text-[#D2AD36]">{summary.totalScore} pts</span>
          </div>
          <div className="p-4 rounded-2xl bg-[#112240] border border-[#1E3A5F] flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Average Score</span>
            <span className="text-xl font-bold text-emerald-400">{summary.averageScore !== null ? `${summary.averageScore}%` : "N/A"}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {results.length > 0 ? (
          results.map((res: any) => (
            <div key={res.id} className="p-6 rounded-3xl bg-[#112240] dark:bg-[#112240] bg-white border border-[#1E3A5F] dark:border-[#1E3A5F] border-slate-200 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E3A5F]/60 dark:border-[#1E3A5F]/60 border-slate-200 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-[#D2AD36]/10 text-[#D2AD36]">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100 dark:text-slate-100 text-slate-900">{res.subject?.name || "Subject"}</h3>
                    <p className="text-xs text-slate-400">
                      {res.academicYear?.name} — {res.term?.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Final Score:</span>
                  <p className="text-xl font-extrabold text-[#D2AD36]">
                    {res.totalScore !== null && res.totalScore !== undefined ? `${res.totalScore} pts` : "N/A"}
                  </p>
                  {res.grade && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                      Grade: {res.grade}
                    </span>
                  )}
                </div>
              </div>

              {res.scores && res.scores.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {res.scores.map((sc: any) => (
                    <div key={sc.id} className="p-3 rounded-2xl bg-[#0A192E]/60 dark:bg-[#0A192E]/60 bg-slate-50 border border-[#1E3A5F]/60 dark:border-[#1E3A5F]/60 border-slate-200">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">{sc.type}</span>
                      <p className="font-bold text-slate-200 dark:text-slate-200 text-slate-800 text-sm mt-0.5">{sc.score} pts</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center bg-[#112240] dark:bg-[#112240] bg-white border border-[#1E3A5F] dark:border-[#1E3A5F] border-slate-200 rounded-3xl text-slate-400 text-sm">
            No published academic results found for this child.
          </div>
        )}
      </div>
    </div>
  );
}
