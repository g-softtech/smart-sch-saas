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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 dark:text-slate-100 text-slate-900 flex items-center space-x-2">
            <User className="h-6 w-6 text-[#D2AD36]" />
            <span>My Guardian Profile</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Personal guardian account information and linkage summary
          </p>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-[#112240] dark:bg-[#112240] bg-white border border-[#1E3A5F] dark:border-[#1E3A5F] border-slate-200 shadow-xl space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-2xl bg-[#D2AD36]/10 border border-[#D2AD36]/30 flex items-center justify-center text-[#D2AD36] font-bold text-2xl shrink-0">
            {profile?.firstName?.[0]}
            {profile?.lastName?.[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 dark:text-slate-100 text-slate-900">
              {profile?.firstName} {profile?.lastName}
            </h2>
            <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-[#039771]/10 text-[#039771] text-xs font-semibold border border-[#039771]/30">
              Verified Guardian
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#1E3A5F]/60 dark:border-[#1E3A5F]/60 border-slate-200">
          <div className="p-4 rounded-2xl bg-[#0A192E]/60 dark:bg-[#0A192E]/60 bg-slate-50 border border-[#1E3A5F]/60 dark:border-[#1E3A5F]/60 border-slate-200 flex items-center space-x-3">
            <Mail className="h-5 w-5 text-[#D2AD36] shrink-0" />
            <div>
              <span className="text-xs text-slate-400">Email Address</span>
              <p className="text-sm font-semibold text-slate-200 dark:text-slate-200 text-slate-800">{profile?.email || "N/A"}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0A192E]/60 dark:bg-[#0A192E]/60 bg-slate-50 border border-[#1E3A5F]/60 dark:border-[#1E3A5F]/60 border-slate-200 flex items-center space-x-3">
            <Phone className="h-5 w-5 text-[#039771] shrink-0" />
            <div>
              <span className="text-xs text-slate-400">Phone Number</span>
              <p className="text-sm font-semibold text-slate-200 dark:text-slate-200 text-slate-800">{profile?.phone || "N/A"}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0A192E]/60 dark:bg-[#0A192E]/60 bg-slate-50 border border-[#1E3A5F]/60 dark:border-[#1E3A5F]/60 border-slate-200 flex items-center space-x-3">
            <MapPin className="h-5 w-5 text-[#D2AD36] shrink-0" />
            <div>
              <span className="text-xs text-slate-400">Residential Address</span>
              <p className="text-sm font-semibold text-slate-200 dark:text-slate-200 text-slate-800">{profile?.address || "N/A"}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0A192E]/60 dark:bg-[#0A192E]/60 bg-slate-50 border border-[#1E3A5F]/60 dark:border-[#1E3A5F]/60 border-slate-200 flex items-center space-x-3">
            <Briefcase className="h-5 w-5 text-slate-400 shrink-0" />
            <div>
              <span className="text-xs text-slate-400">Occupation</span>
              <p className="text-sm font-semibold text-slate-200 dark:text-slate-200 text-slate-800">{profile?.occupation || "N/A"}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0A192E]/60 dark:bg-[#0A192E]/60 bg-slate-50 border border-[#1E3A5F]/60 dark:border-[#1E3A5F]/60 border-slate-200 flex items-center space-x-3 md:col-span-2">
            <Users className="h-5 w-5 text-[#D2AD36] shrink-0" />
            <div>
              <span className="text-xs text-slate-400">Linked Children Count</span>
              <p className="text-sm font-semibold text-[#D2AD36]">
                {profile?.linkedChildrenCount || 0} student(s) linked
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
