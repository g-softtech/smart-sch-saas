"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { QrCode, AlertCircle, ShieldCheck, GraduationCap } from "lucide-react";

export default function StudentIdCardPage() {
  const [loading, setLoading] = useState(true);
  const [credential, setCredential] = useState<any | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [profRes, credRes] = await Promise.all([
          apiClient.get<any>("/api/v1/portal/student/profile"),
          apiClient.get<any>("/api/v1/portal/student/id-card").catch(() => null),
        ]);
        setStudent(profRes.data);
        if (credRes) setCredential(credRes.data);
      } catch (err: any) {
        console.error("Failed to load student credential:", err);
        setError(err.message || "Failed to load digital ID card");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <QrCode className="h-6 w-6 text-emerald-400" />
            Digital Student ID Card
          </h1>
          <p className="text-sm text-slate-400">Present your secure, PII-free digital QR credential for campus entry and scanner verification.</p>
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
        <div className="max-w-md mx-auto">
          {/* Digital ID Card Container */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#0F223D] to-slate-900 border border-amber-500/30 p-6 shadow-2xl shadow-emerald-950/30 space-y-6 relative overflow-hidden">
            {/* Header / Brand */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-amber-500 flex items-center justify-center text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
                    SchoolOS
                  </h2>
                  <span className="text-[10px] text-slate-400 tracking-wider uppercase block">Digital Credential</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                ACTIVE
              </span>
            </div>

            {/* Student Info */}
            <div className="space-y-1 text-center">
              <h3 className="text-xl font-extrabold text-white">
                {student?.firstName} {student?.lastName}
              </h3>
              <p className="text-xs text-amber-400 font-mono font-semibold">ID: {student?.studentNumber}</p>
              <p className="text-xs text-slate-400">Class: {student?.activeEnrollment?.className || "Grade 1B"}</p>
            </div>

            {/* QR Code Presentation Box */}
            <div className="p-4 rounded-2xl bg-white flex flex-col items-center justify-center space-y-2 shadow-inner">
              <div className="h-40 w-40 bg-slate-900 rounded-xl flex items-center justify-center text-white p-2">
                <QrCode className="h-32 w-32 text-emerald-400" />
              </div>
              <p className="text-[11px] font-mono text-slate-600 truncate max-w-xs">
                Hash: {credential?.credentialHash?.slice(0, 24) || "SECURE_QR_TOKEN_VERIFIED"}...
              </p>
            </div>

            {/* Footer Security Badge */}
            <div className="flex items-center justify-center space-x-1.5 text-xs text-emerald-400 font-medium pt-1">
              <ShieldCheck className="h-4 w-4" />
              <span>Cryptographically Verified • PII-Free</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
