"use client";

import React, { useState, useEffect } from "react";
import { Lock, CheckCircle, AlertTriangle, Shield, Layers, RefreshCw } from "lucide-react";

interface EntitlementSummary {
  moduleKey: string;
  status: string;
  isEntitled: boolean;
  isEnabledAtSchool: boolean;
  isAvailable: boolean;
  validUntil: string | null;
}

const MODULE_TITLES: Record<string, { title: string; description: string }> = {
  LIBRARY: {
    title: "Library Management",
    description: "Book catalog, loans tracking, member borrowing, and overdue fine billing.",
  },
  TRANSPORT: {
    title: "Transport & Fleet",
    description: "Vehicle management, bus routes, pickup stops, and transport fee allocation.",
  },
  HOSTEL: {
    title: "Hostel & Boarding",
    description: "Dormitory blocks, room bed allocation, warden logs, and boarding fees.",
  },
  CMS: {
    title: "Website Builder / CMS",
    description: "Public landing page CMS, news & announcement publisher, and custom domains.",
  },
  MARKETPLACE: {
    title: "Marketplace & Billing",
    description: "Self-service module subscriptions, add-on purchasing, and entitlement billing.",
  },
  AI: {
    title: "Advanced School AI",
    description: "Advisory AI tools for lesson notes drafting and auto-grading feedback suggestions.",
  },
};

export default function ModuleSettingsPage() {
  const [entitlements, setEntitlements] = useState<EntitlementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const fetchEntitlements = async () => {
    setLoading(true);
    setError(null);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenantId") || "" : "";
      const schoolId = typeof window !== "undefined" ? localStorage.getItem("schoolId") || "" : "";
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

      const res = await fetch("/api/v1/entitlements", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-id": tenantId,
          "x-school-id": schoolId,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load module entitlements summary");
      }

      const data = await res.json();
      setEntitlements(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntitlements();
  }, []);

  const toggleSchoolSetting = async (moduleKey: string, currentEnabled: boolean) => {
    setUpdatingKey(moduleKey);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenantId") || "" : "";
      const schoolId = typeof window !== "undefined" ? localStorage.getItem("schoolId") || "" : "";
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

      const res = await fetch(`/api/v1/schools/module-settings/${moduleKey}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-id": tenantId,
          "x-school-id": schoolId,
        },
        body: JSON.stringify({
          isEnabled: !currentEnabled,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update school module setting");
      }

      await fetchEntitlements();
    } catch (err: any) {
      alert(err.message || "Action failed");
    } finally {
      setUpdatingKey(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            SaaS Module Management & Entitlements
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage commercial module entitlements and local school operational availability.
          </p>
        </div>
        <button
          onClick={fetchEntitlements}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Status
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 flex items-start gap-3 text-sm text-slate-300">
        <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Entitlement Governance Architecture:</span>
          <p className="text-slate-400 text-xs mt-1">
            Commercial licensing (<code className="text-indigo-300">TenantEntitlement</code>) is controlled at the Tenant level.
            Local operational enablement (<code className="text-indigo-300">SchoolModuleSetting</code>) is managed independently per School.
            A module is accessible only when both Tenant Entitlement and School Enablement are active.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading && entitlements.length === 0 ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-48 animate-pulse" />
          ))
        ) : (
          entitlements.map((item) => {
            const meta = MODULE_TITLES[item.moduleKey] || {
              title: item.moduleKey,
              description: "Optional SaaS expansion module.",
            };

            const isUpdating = updatingKey === item.moduleKey;

            return (
              <div
                key={item.moduleKey}
                className={`bg-slate-900 border rounded-xl p-5 flex flex-col justify-between transition-all ${
                  item.isAvailable
                    ? "border-slate-800 hover:border-slate-700"
                    : "border-slate-800/80 opacity-90"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-base font-semibold text-white">{meta.title}</h3>
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        item.isEntitled
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {item.isEntitled ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          {item.status}
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 text-slate-400" />
                          NOT ENTITLED
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{meta.description}</p>

                  {item.validUntil && (
                    <div className="text-[11px] text-slate-500 mb-4">
                      Valid until: {new Date(item.validUntil).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-medium">School Enablement:</span>
                  </div>

                  <button
                    onClick={() => toggleSchoolSetting(item.moduleKey, item.isEnabledAtSchool)}
                    disabled={!item.isEntitled || isUpdating}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      !item.isEntitled
                        ? "bg-slate-800 cursor-not-allowed opacity-50"
                        : item.isEnabledAtSchool
                        ? "bg-indigo-600"
                        : "bg-slate-700"
                    }`}
                    title={
                      !item.isEntitled
                        ? "Commercial entitlement required to enable for school"
                        : item.isEnabledAtSchool
                        ? "Click to disable for school"
                        : "Click to enable for school"
                    }
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        item.isEnabledAtSchool && item.isEntitled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
