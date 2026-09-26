"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { BookOpen, Calendar, Clock, FileText, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function StudentDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        const res = await apiClient.get<any>("/api/v1/portal/student/dashboard");
        setData(res.data);
      } catch (err: any) {
        console.error("Failed to load student dashboard:", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 flex items-center gap-3">
        <AlertCircle className="h-6 w-6 shrink-0" />
        <div>
          <h3 className="font-semibold">Unable to load Student Dashboard</h3>
          <p className="text-sm opacity-90">{error}</p>
        </div>
      </div>
    );
  }

  const { student, activeEnrollment, timetable, assignments, cbtExams, recentAttendance } = data || {};

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 p-8 text-white shadow-xl shadow-emerald-950/20">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md mb-3">
            Academic Term Overview
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Welcome back, {student?.name || "Student"}! 👋
          </h1>
          <p className="mt-2 text-emerald-100 text-sm sm:text-base">
            Class: <span className="font-semibold text-white">{activeEnrollment?.className || "Grade 1B"}</span>
            {activeEnrollment?.armName && <span> ({activeEnrollment.armName})</span>}
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-8 translate-y-8">
          <BookOpen className="h-64 w-64 text-white" />
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Pending Tasks</span>
            <span className="text-2xl font-bold text-white">
              {assignments?.filter((a: any) => !a.submission)?.length || 0}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Active CBT Exams</span>
            <span className="text-2xl font-bold text-white">
              {cbtExams?.filter((e: any) => e.status === "ACTIVE")?.length || 0}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Timetable Periods</span>
            <span className="text-2xl font-bold text-white">{timetable?.length || 0}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center space-x-4">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Attendance Rate</span>
            <span className="text-2xl font-bold text-white">100%</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Homework & CBT Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Homework Assignments */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-400" />
              Homework & Tasks
            </h2>
            <Link
              href="/portal/student/assignments"
              className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {assignments && assignments.length > 0 ? (
            <div className="space-y-3">
              {assignments.slice(0, 3).map((a: any) => (
                <div key={a.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-white">{a.title}</h3>
                    <p className="text-xs text-slate-400">Due: {new Date(a.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    {a.submission ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {a.submission.status}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No homework assignments found.</p>
          )}
        </div>

        {/* Active CBT Exams */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-400" />
              CBT Examinations
            </h2>
            <Link
              href="/portal/student/cbt"
              className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {cbtExams && cbtExams.length > 0 ? (
            <div className="space-y-3">
              {cbtExams.slice(0, 3).map((e: any) => (
                <div key={e.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-white">{e.title}</h3>
                    <p className="text-xs text-slate-400">{e.durationMinutes} mins • Max Score: {e.maxScore}</p>
                  </div>
                  <div>
                    {e.attempt ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {e.attempt.status} ({e.attempt.totalScore} pts)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        Ready to Start
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No active CBT exams found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
