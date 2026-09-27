"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Clock, CheckCircle, AlertCircle, Calendar } from "lucide-react";

export default function ParentChildAttendancePage() {
  const params = useParams();
  const childId = params.childId as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAttendance() {
      try {
        setLoading(true);
        const res = await apiClient.get<any>(`/api/v1/portal/parent/children/${childId}/attendance`);
        setData(res?.data || res);
      } catch (err: any) {
        console.error("Failed to load attendance:", err);
        setError(err.message || "Failed to load attendance logs");
      } finally {
        setLoading(false);
      }
    }
    fetchAttendance();
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

  const { attendanceRecords, arrivals } = data || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 dark:text-slate-100 text-slate-900 flex items-center space-x-2">
            <Clock className="h-6 w-6 text-[#039771]" />
            <span>Attendance & Campus Gate Arrivals</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time campus arrival timestamp logs and daily attendance records
          </p>
        </div>
      </div>

      {/* Arrival Logs */}
      <div className="p-6 rounded-3xl bg-[#112240] dark:bg-[#112240] bg-white border border-[#1E3A5F] dark:border-[#1E3A5F] border-slate-200 shadow-lg space-y-4">
        <h2 className="text-base font-bold text-slate-100 dark:text-slate-100 text-slate-900 flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-[#039771]" />
          <span>Campus Gate Arrival Log</span>
        </h2>

        {arrivals && arrivals.length > 0 ? (
          <div className="space-y-3">
            {arrivals.map((arr: any) => (
              <div
                key={arr.id}
                className="p-4 rounded-2xl bg-[#0A192E]/60 dark:bg-[#0A192E]/60 bg-slate-50 border border-[#1E3A5F]/60 dark:border-[#1E3A5F]/60 border-slate-200 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-[#039771]/10 text-[#039771]">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 dark:text-slate-200 text-slate-800">
                      {new Date(arr.arrivalTime).toLocaleDateString()}
                    </span>
                    <p className="text-[10px] text-slate-400">Scan Source: {arr.source}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-[#039771]">
                    {new Date(arr.arrivalTime).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No campus arrival records found.</p>
        )}
      </div>
    </div>
  );
}
