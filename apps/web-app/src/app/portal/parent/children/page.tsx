"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Users, FileText, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ParentChildrenPage() {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChildren() {
      try {
        setLoading(true);
        const res = await apiClient.get<any>("/api/v1/portal/parent/children");
        setChildren(Array.isArray(res) ? res : res?.data || []);
      } catch (err: any) {
        console.error("Failed to load children:", err);
        setError(err.message || "Failed to load linked children");
      } finally {
        setLoading(false);
      }
    }
    fetchChildren();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
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
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <Users className="h-6 w-6 text-amber-400" />
            <span>My Linked Children</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative list of student profiles linked to your guardian account
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {children.length > 0 ? (
          children.map((child: any) => (
            <div
              key={child.id}
              className="p-6 rounded-3xl bg-[#0B192C] border border-slate-800/80 shadow-lg space-y-4"
            >
              <div className="flex items-center space-x-4">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xl shrink-0">
                  {child.firstName[0]}
                  {child.lastName[0]}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">
                    {child.firstName} {child.lastName}
                  </h3>
                  <p className="text-xs text-slate-400">ID: {child.studentNumber}</p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold">
                    Relationship: {child.relationship || "Guardian"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60">
                <div>
                  <span className="text-slate-400">School:</span>
                  <p className="font-semibold text-slate-200">{child.school?.name || "N/A"}</p>
                </div>
                <div>
                  <span className="text-slate-400">Class:</span>
                  <p className="font-semibold text-amber-300">
                    {child.class?.name || "N/A"} {child.arm?.name ? `(${child.arm.name})` : ""}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Gender:</span>
                  <p className="font-semibold text-slate-200">{child.gender}</p>
                </div>
                <div>
                  <span className="text-slate-400">Primary Guardian:</span>
                  <p className="font-semibold text-emerald-400">{child.isPrimary ? "Yes" : "No"}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60">
                <Link
                  href={`/portal/parent/children/${child.id}/results`}
                  className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-center text-xs font-semibold text-slate-200 transition flex flex-col items-center justify-center space-y-1"
                >
                  <FileText className="h-4 w-4 text-amber-400" />
                  <span>Report Cards</span>
                </Link>
                <Link
                  href={`/portal/parent/children/${child.id}/attendance`}
                  className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-center text-xs font-semibold text-slate-200 transition flex flex-col items-center justify-center space-y-1"
                >
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span>Attendance</span>
                </Link>
                <Link
                  href={`/portal/parent/children/${child.id}/movement`}
                  className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-center text-xs font-semibold text-slate-200 transition flex flex-col items-center justify-center space-y-1"
                >
                  <ShieldCheck className="h-4 w-4 text-teal-400" />
                  <span>Pickup Passes</span>
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 p-12 text-center bg-[#0B192C] border border-slate-800/80 rounded-3xl text-slate-400 text-sm">
            No linked children found for your guardian account.
          </div>
        )}
      </div>
    </div>
  );
}
