"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { Calendar, Clock, BookOpen, Loader2, AlertCircle } from "lucide-react";

interface TimetableItem {
  id: string;
  dayOfWeek: string;
  periodName: string;
  startTime: string;
  endTime: string;
  className: string;
  classId: string;
  armName?: string;
  armId?: string;
  subjectName: string;
  subjectId: string;
  termName: string;
  academicYearName: string;
}

const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export default function TeacherTimetablePage() {
  const [entries, setEntries] = useState<TimetableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("MONDAY");

  useEffect(() => {
    // Set initial selected day to current day if weekday
    const daysMap = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const today = daysMap[new Date().getDay()];
    if (DAYS_OF_WEEK.includes(today)) {
      setSelectedDay(today);
    }
  }, []);

  useEffect(() => {
    async function loadTimetable() {
      try {
        setLoading(true);
        setError(null);
        const res: any = await apiClient.get("api/v1/portal/teacher/timetable");
        setEntries(res || []);
      } catch (err: any) {
        setError(err.message || "Failed to load timetable");
      } finally {
        setLoading(false);
      }
    }
    loadTimetable();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#D2AD36]" />
        <p className="text-sm font-medium">Loading Teaching Timetable...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const activeEntries = entries.filter((e) => e.dayOfWeek === selectedDay);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
          <Calendar className="h-7 w-7 text-[#D2AD36]" />
          Teaching Timetable
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Authorized weekly schedule of assigned teaching periods across classes and arms.
        </p>
      </div>

      {/* Day Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1E3A5F] pb-3 overflow-x-auto">
        {DAYS_OF_WEEK.map((day) => {
          const count = entries.filter((e) => e.dayOfWeek === day).length;
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                isSelected
                  ? "bg-[#D2AD36] text-[#0A192E] shadow-lg shadow-[#D2AD36]/20"
                  : "bg-[#0A192E] text-slate-300 hover:bg-[#1E3A5F] border border-[#1E3A5F]"
              }`}
            >
              <span>{day}</span>
              {count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isSelected ? "bg-[#0A192E] text-[#D2AD36]" : "bg-[#1E3A5F] text-slate-200"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Schedule Cards */}
      <div className="bg-[#0A192E]/90 border border-[#1E3A5F] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-[#1E3A5F] pb-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">{selectedDay} Schedule</h2>
          <span className="text-xs font-semibold text-[#D2AD36]">
            {activeEntries.length} Period{activeEntries.length === 1 ? "" : "s"}
          </span>
        </div>

        {activeEntries.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Clock className="h-10 w-10 text-slate-600 mx-auto" />
            <p className="text-sm font-medium">No teaching periods scheduled for {selectedDay}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeEntries.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-[#070B14] border border-[#1E3A5F] hover:border-[#D2AD36]/50 transition space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#1E3A5F]/60 pb-3">
                  <span className="px-3 py-1 rounded-xl bg-[#D2AD36]/10 text-[#D2AD36] font-mono font-bold text-xs border border-[#D2AD36]/20">
                    {item.startTime} - {item.endTime}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">{item.periodName}</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{item.subjectName}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#1E3A5F] text-slate-200 text-xs font-semibold">
                      {item.className} {item.armName ? `(${item.armName})` : ""}
                    </span>
                    <span className="text-[11px] text-slate-400">{item.academicYearName} &bull; {item.termName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
