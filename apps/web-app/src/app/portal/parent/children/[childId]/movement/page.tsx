"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { ShieldCheck, Plus, CheckCircle, AlertCircle, UserCheck } from "lucide-react";

export default function ParentChildMovementPage() {
  const params = useParams();
  const childId = params.childId as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Authorization Form State
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchMovement();
  }, [childId]);

  async function fetchMovement() {
    try {
      setLoading(true);
      const res = await apiClient.get<any>(`/api/v1/portal/parent/children/${childId}/movement`);
      setData(res?.data || res);
    } catch (err: any) {
      console.error("Failed to load movement logs:", err);
      setError(err.message || "Failed to load movement data");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAuth(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiClient.post(`/api/v1/portal/parent/children/${childId}/movement/authorizations`, {
        authorizedPersonName: name,
        relationship,
        phone,
      });
      setSuccessMsg("Pickup authorization added successfully!");
      setShowForm(false);
      setName("");
      setRelationship("");
      setPhone("");
      fetchMovement();
    } catch (err: any) {
      alert(`Failed to add authorization: ${err.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  }

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

  const { departures, pickupAuthorizations } = data || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 dark:text-slate-100 text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="h-6 w-6 text-[#D2AD36]" />
            <span>Pickup Passes & Departure Logs</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authorize pickup persons and view student gate departure logs
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 rounded-2xl bg-[#D2AD36] hover:bg-[#b8952b] text-[#0A192E] font-bold text-xs transition shadow-lg shadow-[#D2AD36]/20 flex items-center space-x-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Pickup Person</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-[#039771]/10 border border-[#039771]/30 rounded-2xl text-[#039771] text-sm flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add Authorization Form */}
      {showForm && (
        <div className="p-6 rounded-3xl bg-[#112240] dark:bg-[#112240] bg-white border border-[#D2AD36]/40 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 dark:text-slate-100 text-slate-900 flex items-center space-x-2">
            <UserCheck className="h-5 w-5 text-[#D2AD36]" />
            <span>Authorize New Pickup Person</span>
          </h3>

          <form onSubmit={handleCreateAuth} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 dark:text-slate-300 text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0A192E] dark:bg-[#0A192E] bg-slate-50 border border-[#1E3A5F] text-white dark:text-white text-slate-900 text-xs focus:outline-none focus:border-[#D2AD36]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 dark:text-slate-300 text-slate-700 mb-1">Relationship</label>
              <input
                type="text"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g. Uncle / Driver / Aunt"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0A192E] dark:bg-[#0A192E] bg-slate-50 border border-[#1E3A5F] text-white dark:text-white text-slate-900 text-xs focus:outline-none focus:border-[#D2AD36]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 dark:text-slate-300 text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +234..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#0A192E] dark:bg-[#0A192E] bg-slate-50 border border-[#1E3A5F] text-white dark:text-white text-slate-900 text-xs focus:outline-none focus:border-[#D2AD36]"
              />
            </div>

            <div className="md:col-span-3 flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl bg-[#1E3A5F]/50 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[#D2AD36] hover:bg-[#b8952b] text-[#0A192E] font-bold text-xs transition"
              >
                {submitting ? "Saving..." : "Save Authorization"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Authorized Pickup Persons */}
      <div className="p-6 rounded-3xl bg-[#112240] dark:bg-[#112240] bg-white border border-[#1E3A5F] dark:border-[#1E3A5F] border-slate-200 shadow-lg space-y-4">
        <h2 className="text-base font-bold text-slate-100 dark:text-slate-100 text-slate-900">Authorized Pickup Persons</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pickupAuthorizations && pickupAuthorizations.length > 0 ? (
            pickupAuthorizations.map((auth: any) => (
              <div key={auth.id} className="p-4 rounded-2xl bg-[#0A192E]/60 dark:bg-[#0A192E]/60 bg-slate-50 border border-[#1E3A5F]/60 dark:border-[#1E3A5F]/60 border-slate-200 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200 dark:text-slate-200 text-slate-800 text-sm">{auth.authorizedPersonName}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-[#039771]/10 text-[#039771] border border-[#039771]/30 text-[10px] font-semibold">
                    {auth.status}
                  </span>
                </div>
                <p className="text-slate-400">Relationship: <span className="text-slate-200 dark:text-slate-200 text-slate-800">{auth.relationship}</span></p>
                {auth.phone && <p className="text-slate-400">Phone: <span className="text-slate-200 dark:text-slate-200 text-slate-800">{auth.phone}</span></p>}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 col-span-2">No custom pickup authorizations added.</p>
          )}
        </div>
      </div>
    </div>
  );
}
