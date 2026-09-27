"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { User, Phone, Mail, MapPin, Briefcase, Users, AlertCircle } from "lucide-react";

export default function ParentProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const res = await apiClient.get<any>("/api/v1/portal/parent/profile");
        setProfile(res?.data || res);
      } catch (err: any) {
        console.error("Failed to load parent profile:", err);
        setError(err.message || "Failed to load profile details");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
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
            <User className="h-6 w-6 text-amber-400" />
            <span>My Guardian Profile</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Personal guardian account information and linkage summary
          </p>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-[#0B192C] border border-slate-800/80 shadow-xl space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-2xl">
            {profile?.firstName?.[0]}
            {profile?.lastName?.[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              {profile?.firstName} {profile?.lastName}
            </h2>
            <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">
              Verified Guardian
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/60 flex items-center space-x-3">
            <Mail className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <span className="text-xs text-slate-400">Email Address</span>
              <p className="text-sm font-semibold text-slate-200">{profile?.email || "N/A"}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/60 flex items-center space-x-3">
            <Phone className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs text-slate-400">Phone Number</span>
              <p className="text-sm font-semibold text-slate-200">{profile?.phone || "N/A"}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/60 flex items-center space-x-3">
            <MapPin className="h-5 w-5 text-teal-400 shrink-0" />
            <div>
              <span className="text-xs text-slate-400">Residential Address</span>
              <p className="text-sm font-semibold text-slate-200">{profile?.address || "N/A"}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/60 flex items-center space-x-3">
            <Briefcase className="h-5 w-5 text-purple-400 shrink-0" />
            <div>
              <span className="text-xs text-slate-400">Occupation</span>
              <p className="text-sm font-semibold text-slate-200">{profile?.occupation || "N/A"}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/60 flex items-center space-x-3 md:col-span-2">
            <Users className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <span className="text-xs text-slate-400">Linked Children Count</span>
              <p className="text-sm font-semibold text-amber-300">
                {profile?.linkedChildrenCount || 0} student(s) linked
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
