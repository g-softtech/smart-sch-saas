"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Camera,
  Trash2,
  KeyRound,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface TeacherProfile {
  id: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  type: string;
  joiningDate: string;
  schoolId: string;
  schoolName: string;
  tenantId: string;
  hasPhoto: boolean;
  photoUrl?: string | null;
}

export default function TeacherProfilePage() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Phone editing
  const [phone, setPhone] = useState("");
  const [updatingPhone, setUpdatingPhone] = useState(false);

  // Photo uploading
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);
        const res: any = await apiClient.get("api/v1/portal/teacher/profile");
        setProfile(res);
        setPhone(res.phone || "");
      } catch (err: any) {
        setError(err.message || "Failed to load teacher profile");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handlePhoneUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingPhone(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.patch("api/v1/portal/teacher/profile", { phone });
      setSuccess("Phone number updated successfully!");
      const updated: any = await apiClient.get("api/v1/portal/teacher/profile");
      setProfile(updated);
    } catch (err: any) {
      setError(err.message || "Failed to update phone number");
    } finally {
      setUpdatingPhone(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Profile image size must be less than 5MB.");
        return;
      }
      setPhotoFile(file);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) return;

    setUploadingPhoto(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", photoFile);

    try {
      await apiClient.postFormData("api/v1/portal/teacher/profile/photo", formData);
      setSuccess("Profile photo updated successfully!");
      setPhotoFile(null);
      setPhotoPreview(null);
      const updated: any = await apiClient.get("api/v1/portal/teacher/profile");
      setProfile(updated);
    } catch (err: any) {
      setError(err.message || "Failed to upload profile photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async () => {
    if (!confirm("Are you sure you want to remove your profile photo?")) return;

    setUploadingPhoto(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.delete("api/v1/portal/teacher/profile/photo");
      setSuccess("Profile photo removed.");
      setPhotoFile(null);
      setPhotoPreview(null);
      const updated: any = await apiClient.get("api/v1/portal/teacher/profile");
      setProfile(updated);
    } catch (err: any) {
      setError(err.message || "Failed to remove photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#D2AD36]" />
        <p className="text-sm font-medium">Loading Teacher Profile...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Teacher Profile</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your personal details, contact information, and avatar picture.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-[#039771]/10 border border-[#039771]/30 text-[#039771] text-xs flex items-center gap-2 font-bold">
          <CheckCircle2 className="h-4 w-4" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-bold">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Quick Info */}
        <div className="bg-[#0A192E]/90 border border-[#1E3A5F] rounded-3xl p-6 shadow-xl flex flex-col items-center text-center space-y-6">
          <div className="relative group">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt="Preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-[#D2AD36] shadow-lg"
              />
            ) : profile.hasPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photoUrl || "/api/v1/portal/teacher/profile/photo"}
                alt={profile.firstName}
                className="w-32 h-32 rounded-full object-cover border-4 border-[#D2AD36] shadow-lg"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-[#070B14] text-[#D2AD36] border-4 border-[#D2AD36] flex items-center justify-center font-bold text-3xl shadow-lg">
                {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">
              {profile.firstName} {profile.middleName} {profile.lastName}
            </h2>
            <p className="text-xs text-[#D2AD36] font-semibold mt-1">{profile.designation || "Teaching Staff"}</p>
            <p className="text-xs font-mono text-slate-400 mt-1">{profile.staffNumber}</p>
          </div>

          {/* Photo Action Form */}
          <form onSubmit={handlePhotoUpload} className="w-full space-y-3 border-t border-[#1E3A5F] pt-4">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider text-left">
              Update Avatar Picture
            </label>
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#D2AD36] file:text-[#0A192E] hover:file:bg-[#c19c2b] cursor-pointer"
            />
            {photoFile && (
              <button
                type="submit"
                disabled={uploadingPhoto}
                className="w-full py-2 bg-[#D2AD36] hover:bg-[#c19c2b] text-[#0A192E] font-bold text-xs rounded-xl shadow transition"
              >
                {uploadingPhoto ? "Uploading..." : "Save Selected Photo"}
              </button>
            )}
            {profile.hasPhoto && !photoFile && (
              <button
                type="button"
                onClick={handlePhotoDelete}
                disabled={uploadingPhoto}
                className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold rounded-xl border border-rose-500/30 transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove Current Photo
              </button>
            )}
          </form>
        </div>

        {/* Right Column: Contact & Professional Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#0A192E]/90 border border-[#1E3A5F] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white border-b border-[#1E3A5F] pb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-[#D2AD36]" />
              Account & Employment Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-[#D2AD36]" />
                  Email Address:
                </span>
                <span className="font-medium text-slate-100 block text-sm">{profile.email || "N/A"}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-[#D2AD36]" />
                  School:
                </span>
                <span className="font-medium text-slate-100 block text-sm">{profile.schoolName}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#D2AD36]" />
                  Joining Date:
                </span>
                <span className="font-medium text-slate-100 block text-sm">
                  {new Date(profile.joiningDate).toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-semibold">Employment Type:</span>
                <span className="font-medium text-slate-100 block text-sm uppercase">{profile.type}</span>
              </div>
            </div>

            {/* Editable Phone Form */}
            <form onSubmit={handlePhoneUpdate} className="pt-6 border-t border-[#1E3A5F] space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#D2AD36]" />
                Update Phone Contact
              </h4>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="flex-1 px-4 py-2.5 bg-[#070B14] border border-[#1E3A5F] rounded-xl text-slate-100 text-sm focus:outline-none focus:border-[#D2AD36]"
                />
                <button
                  type="submit"
                  disabled={updatingPhone}
                  className="px-5 py-2.5 bg-[#D2AD36] hover:bg-[#c19c2b] text-[#0A192E] font-bold text-xs rounded-xl shadow transition"
                >
                  {updatingPhone ? "Saving..." : "Save Phone"}
                </button>
              </div>
            </form>

            {/* Password Security Link */}
            <div className="pt-6 border-t border-[#1E3A5F] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-[#D2AD36]" />
                  Password & Security
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Need to change your login password?</p>
              </div>
              <Link
                href="/forgot-password"
                className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#2A4D7C] text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Reset Password
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
