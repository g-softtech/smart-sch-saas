"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Calendar, Clock, AlertCircle } from "lucide-react";

export default function StudentTimetablePage() {
  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTimetable() {
      try {
        setLoading(true);
        const res = await apiClient.get<any>("/api/v1/portal/student/timetable");
        setTimetable(Array.isArray(res) ? res : res?.data || []);
      } catch (err: any) {
        console.error("Failed to load timetable:", err);
        setError(err.message || "Failed to load timetable");
      } finally {
        setLoading(false);
      }
    }
    fetchTimetable();
  }, []);

  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-emerald-400" />
            My Weekly Timetable
          </h1>
          <p className="text-sm text-slate-400">View your scheduled subjects, time slots, and teachers.</p>
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {days.map((day) => {
            const dayEntries = timetable.filter((t) => t.dayOfWeek === day);
            return (
              <div key={day} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <h2 className="font-bold text-sm text-emerald-400 tracking-wider uppercase border-b border-slate-800 pb-2">
                  {day}
                </h2>
                {dayEntries.length > 0 ? (
                  <div className="space-y-2">
                    {dayEntries.map((entry) => (
                      <div key={entry.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1">
                        <div className="flex items-center text-xs text-amber-400 gap-1 font-medium">
                          <Clock className="h-3 w-3" />
                          <span>{entry.period?.startTime || "Period"} - {entry.period?.endTime || ""}</span>
                        </div>
                        <h3 className="font-semibold text-sm text-white">{entry.subject?.name || "Subject"}</h3>
                        {entry.staff && (
                          <p className="text-xs text-slate-400">Teacher: {entry.staff.firstName} {entry.staff.lastName}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic py-4 text-center">No scheduled periods</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
