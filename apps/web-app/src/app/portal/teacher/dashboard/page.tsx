"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import {
  BookOpen,
  Calendar,
  Users,
  Clock,
  ArrowRight,
  User,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface DashboardData {
  teacherName: string;
  staffNumber: string;
  designation: string;
  hasPhoto: boolean;
  photoUrl: string | null;
  assignedClassesCount: number;
  todayPeriodsCount: number;
  totalStudentsCount: number;
  todaySchedule: Array<{
    periodId: string;
    periodName: string;
    startTime: string;
    endTime: string;
    className: string;
    armName?: string;
    subjectName: string;
    dayOfWeek: string;
  }>;
}

export default function TeacherDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);
        const res: any = await apiClient.get("api/v1/portal/teacher/dashboard");
        setData(res);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#D2AD36]" />
        <p className="text-sm font-medium">Loading Teacher Workspace...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm space-y-3">
        <div className="flex items-center gap-2 font-bold">
          <AlertCircle className="h-5 w-5" />
          <span>Error Loading Teacher Dashboard</span>
        </div>
        <p>{error || "Unable to fetch teacher workspace info."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0A192E] via-[#0F2744] to-[#1E3A5F] border border-[#1E3A5F] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {data.hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.photoUrl || "/api/v1/portal/teacher/profile/photo"}
              alt={data.teacherName}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-[#D2AD36] shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-[#070B14] text-[#D2AD36] border-2 border-[#D2AD36] flex items-center justify-center font-bold text-2xl shadow-lg">
              {data.teacherName.split(" ").map((n) => n[0]).join("")}
            </div>
          )}

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Welcome, {data.teacherName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D2AD36]/20 text-[#D2AD36] border border-[#D2AD36]/30 uppercase">
                {data.designation}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Staff ID: <span className="text-slate-200 font-semibold">{data.staffNumber}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/portal/teacher/profile"
            className="px-4 py-2.5 bg-[#1E3A5F] hover:bg-[#2A4D7C] text-slate-100 text-xs font-bold rounded-xl transition flex items-center gap-2 border border-[#1E3A5F]"
          >
            <User className="h-4 w-4 text-[#D2AD36]" />
            Manage Profile
          </Link>
          <Link
            href="/portal/teacher/timetable"
            className="px-4 py-2.5 bg-[#D2AD36] hover:bg-[#c19c2b] text-[#0A192E] text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-[#D2AD36]/10"
          >
            <Calendar className="h-4 w-4" />
            Full Timetable
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-[#0A192E]/90 border border-[#1E3A5F] rounded-2xl p-6 shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Assigned Classes
            </span>
            <span className="text-3xl font-extrabold text-white mt-1 block">
              {data.assignedClassesCount}
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-amber-400" />
          </div>
        </div>

        <div className="bg-[#0A192E]/90 border border-[#1E3A5F] rounded-2xl p-6 shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Today&apos;s Periods
            </span>
            <span className="text-3xl font-extrabold text-white mt-1 block">
              {data.todayPeriodsCount}
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <Clock className="h-6 w-6 text-teal-400" />
          </div>
        </div>

        <div className="bg-[#0A192E]/90 border border-[#1E3A5F] rounded-2xl p-6 shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Enrolled Students
            </span>
            <span className="text-3xl font-extrabold text-white mt-1 block">
              {data.totalStudentsCount}
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Users className="h-6 w-6 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Today's Schedule Timeline */}
      <div className="bg-[#0A192E]/90 border border-[#1E3A5F] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-[#1E3A5F] pb-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-[#D2AD36]" />
            <h2 className="text-lg font-bold text-white">Today&apos;s Teaching Schedule</h2>
          </div>
          <Link
            href="/portal/teacher/timetable"
            className="text-xs font-bold text-[#D2AD36] hover:underline flex items-center gap-1"
          >
            View Weekly Schedule &rarr;
          </Link>
        </div>

        {data.todaySchedule.length === 0 ? (
          <div className="py-10 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto opacity-75" />
            <p className="text-sm font-medium">No teaching periods scheduled for today!</p>
            <p className="text-xs text-slate-500">Enjoy your free time or prepare for upcoming classes.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.todaySchedule.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#070B14] border border-[#1E3A5F] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#D2AD36]/50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="px-3 py-2 rounded-xl bg-[#D2AD36]/10 border border-[#D2AD36]/30 text-[#D2AD36] font-mono font-bold text-xs">
                    {item.startTime} - {item.endTime}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{item.subjectName}</h3>
                    <p className="text-xs text-slate-400">
                      Period: <span className="text-slate-200">{item.periodName}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-xl bg-[#1E3A5F] text-slate-200 text-xs font-semibold border border-[#1E3A5F]">
                    {item.className} {item.armName ? `(${item.armName})` : ""}
                  </span>
                  <Link
                    href="/portal/teacher/classes"
                    className="p-2 rounded-xl bg-[#0A192E] hover:bg-[#1E3A5F] text-slate-300 transition"
                    title="View Class Roster"
                  >
                    <ArrowRight className="h-4 w-4 text-[#D2AD36]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
