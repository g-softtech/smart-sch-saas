"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";

interface StaffProfile {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  staffNumber: string;
  designation?: string;
  type: string;
  status: string;
  joiningDate: string;
  dateOfBirth?: string;
  departmentId?: string;
  hasPhoto?: boolean;
  photoUrl?: string | null;
}

interface InvitationStatus {
  isProvisioned: boolean;
  status: "NOT_PROVISIONED" | "INVITED" | "PENDING" | "EXPIRED" | "ACTIVE";
  email?: string;
  expiresAt?: string;
}

export default function StaffProfilePage() {
  const params = useParams();
  const staffId = params.staffId as string;

  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [invitationStatus, setInvitationStatus] = useState<InvitationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Credential Modal State
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [credentialLoading, setCredentialLoading] = useState(false);
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [issuedCredential, setIssuedCredential] = useState<{ rawToken: string } | null>(null);

  // Photo Upload Modal State
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", middleName: "", email: "", phone: "", designation: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Portal Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteWarning, setInviteWarning] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [lastActivationUrl, setLastActivationUrl] = useState<string | null>(null);

  const fetchProfile = useCallback(
    async (isRefresh = false) => {
      if (!staffId) return;
      try {
        if (!isRefresh) setLoading(true);
        setError(null);

        const [response, statusRes] = await Promise.all([
          apiClient.get(`api/v1/staff/${staffId}`),
          apiClient.get(`api/v1/portal/account/staff/${staffId}/invitation-status`).catch(() => null),
        ]);

        const profile = response as unknown as StaffProfile;
        setStaff(profile || null);
        if (statusRes) setInvitationStatus(statusRes as InvitationStatus);

        if (!isRefresh && profile && profile.status) {
          setTargetStatus(profile.status);
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(
            isRefresh
              ? "Mutation succeeded, but failed to refresh profile data. Please reload the page."
              : err.message || "Failed to load staff profile",
          );
        } else {
          setError(
            isRefresh
              ? "Mutation succeeded, but an unexpected error occurred while refreshing. Please reload."
              : "An unexpected error occurred",
          );
        }
      } finally {
        if (!isRefresh) setLoading(false);
      }
    },
    [staffId],
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStatus) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      await apiClient.post(`api/v1/staff/${staffId}/status`, { targetStatus });
      setIsStatusModalOpen(false);
      fetchProfile(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) setStatusError(err.message);
      else setStatusError("Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialLoading(true);
    setCredentialError(null);
    setIssuedCredential(null);
    try {
      const response = await apiClient.post(
        `api/v1/staff/${staffId}/credentials`,
        { type: "QR" },
      );
      setIssuedCredential(response as { rawToken: string });
    } catch (err: unknown) {
      if (err instanceof ApiError) setCredentialError(err.message);
      else setCredentialError("Failed to issue credential");
    } finally {
      setCredentialLoading(false);
    }
  };

  // Open & Handle Edit Modal
  const openEditModal = () => {
    if (!staff) return;
    setEditForm({
      firstName: staff.firstName,
      lastName: staff.lastName,
      middleName: staff.middleName || "",
      email: staff.email || "",
      phone: staff.phone || "",
      designation: staff.designation || "",
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);

    const payload: Record<string, any> = {};
    if (editForm.firstName?.trim()) payload.firstName = editForm.firstName.trim();
    if (editForm.lastName?.trim()) payload.lastName = editForm.lastName.trim();
    if (editForm.middleName?.trim()) payload.middleName = editForm.middleName.trim();
    if (editForm.email?.trim()) payload.email = editForm.email.trim();
    if (editForm.phone?.trim()) payload.phone = editForm.phone.trim();
    if (editForm.designation?.trim()) payload.designation = editForm.designation.trim();

    try {
      await apiClient.patch(`api/v1/staff/${staffId}`, payload);
      setIsEditModalOpen(false);
      fetchProfile(true);
    } catch (err: any) {
      setEditError(err.message || "Failed to update staff profile");
    } finally {
      setEditLoading(false);
    }
  };

  // Open & Handle Photo Modal
  const openPhotoModal = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoError(null);
    setIsPhotoModalOpen(true);
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setPhotoError("Image size must be less than 5MB");
        return;
      }
      setPhotoFile(file);
      setPhotoError(null);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) return;

    setPhotoLoading(true);
    setPhotoError(null);

    const formData = new FormData();
    formData.append("file", photoFile);

    try {
      await apiClient.postFormData(`api/v1/staff/${staffId}/photo`, formData);
      setIsPhotoModalOpen(false);
      fetchProfile(true);
    } catch (err: any) {
      setPhotoError(err.message || "Failed to upload profile photo");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handlePhotoDelete = async () => {
    if (!confirm("Are you sure you want to remove this profile photo?")) return;
    setPhotoLoading(true);
    try {
      await apiClient.delete(`api/v1/staff/${staffId}/photo`);
      setIsPhotoModalOpen(false);
      fetchProfile(true);
    } catch (err: any) {
      setPhotoError(err.message || "Failed to delete profile photo");
    } finally {
      setPhotoLoading(false);
    }
  };

  // Open & Handle Portal Invitation Modal
  const openInviteModal = () => {
    setInviteEmail(staff?.email || "");
    setInviteSuccess(null);
    setInviteWarning(null);
    setInviteError(null);
    setLastActivationUrl(null);
    setIsInviteModalOpen(true);
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteLoading(true);
    setInviteSuccess(null);
    setInviteWarning(null);
    setInviteError(null);
    setLastActivationUrl(null);

    try {
      const res: any = await apiClient.post(`api/v1/portal/account/staff/${staffId}/provision`, {
        email: inviteEmail.trim(),
      });
      if (res.emailSent) {
        setInviteSuccess(`Portal invitation successfully sent! Activation link emailed to ${res.email}.`);
      } else {
        setInviteWarning(res.emailError || "Portal account prepared, but invitation email could not be sent. Please retry.");
        if (res.activationUrl) setLastActivationUrl(res.activationUrl);
      }
      fetchProfile(true);
    } catch (err: any) {
      setInviteError(err.message || "Failed to dispatch teacher portal invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
          <p className="font-medium">{error || "Staff profile not found."}</p>
          <Link
            href="/dashboard/staff"
            className="mt-4 inline-block text-brand-teal hover:underline font-medium"
          >
            &larr; Back to Staff Directory
          </Link>
        </div>
      </div>
    );
  }

  const isTeacher = staff.type === "TEACHING";

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/staff"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
            title="Back to Staff Directory"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>

          {/* Avatar Photo Preview */}
          <div className="relative group cursor-pointer" onClick={openPhotoModal}>
            {staff.hasPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={staff.photoUrl || `/api/v1/staff/${staff.id}/photo`}
                alt={`${staff.firstName} Avatar`}
                className="w-16 h-16 rounded-full object-cover border-2 border-brand-teal shadow"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-xl border-2 border-slate-700 shadow">
                {staff.firstName.charAt(0)}
                {staff.lastName.charAt(0)}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold">
              Edit
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {staff.firstName} {staff.middleName} {staff.lastName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-mono font-medium text-brand-teal">{staff.staffNumber}</span>
              <span>&bull;</span>
              <span className="capitalize">{staff.type.replace("_", " ").toLowerCase()}</span>
              <span>&bull;</span>
              <span>Joined: {new Date(staff.joiningDate).toLocaleDateString()}</span>
              <span>&bull;</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  staff.status === "ACTIVE"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : staff.status === "SUSPENDED"
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {staff.status}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openEditModal}
            className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl transition-colors"
          >
            Edit Profile
          </button>
          {isTeacher && (
            <button
              onClick={openInviteModal}
              className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Invite to Teacher Portal
            </button>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Personal & Contact Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3">
              Staff Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Email Address</label>
                <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                  {staff.email || <span className="text-amber-500 text-sm">Not provided (Required for portal invite)</span>}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Phone Number</label>
                <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{staff.phone || "N/A"}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Designation / Role</label>
                <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{staff.designation || "N/A"}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Gender</label>
                <p className="text-base font-medium text-gray-900 dark:text-white mt-1 capitalize">{staff.gender ? staff.gender.toLowerCase() : "N/A"}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Date of Birth</label>
                <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                  {staff.dateOfBirth ? new Date(staff.dateOfBirth).toLocaleDateString() : "N/A"}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Staff Category</label>
                <p className="text-base font-medium text-gray-900 dark:text-white mt-1 capitalize">{staff.type.replace("_", " ").toLowerCase()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Portal Access & Credentials Status */}
        <div className="space-y-6">
          {/* Portal Access Status Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-amber-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457-.39-2.823-1.07-4" />
                </svg>
                Teacher Portal Access
              </h3>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  invitationStatus?.status === "ACTIVE"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : invitationStatus?.status === "INVITED" || invitationStatus?.status === "PENDING"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : invitationStatus?.status === "EXPIRED"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {invitationStatus?.status || "NOT_PROVISIONED"}
              </span>
            </div>

            <p className="text-xs text-slate-300">
              {invitationStatus?.status === "ACTIVE"
                ? "This staff member has activated their Teacher Portal account."
                : invitationStatus?.status === "INVITED" || invitationStatus?.status === "PENDING"
                  ? "An invitation has been dispatched to this teacher's email address."
                  : "Teacher Portal access is not provisioned for this staff member."}
            </p>

            {isTeacher && (
              <button
                onClick={openInviteModal}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl transition-colors shadow"
              >
                {invitationStatus?.status === "ACTIVE"
                  ? "Resend Portal Invitation"
                  : invitationStatus?.status === "INVITED"
                    ? "Resend Invitation Email"
                    : "Provision & Invite to Teacher Portal"}
              </button>
            )}
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3">
              Administrative Operations
            </h3>

            <div className="space-y-3">
              <button
                onClick={() => setIsStatusModalOpen(true)}
                className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white transition-colors flex items-center justify-between"
              >
                <span>Change Employment Status</span>
                <span className="text-gray-400">&rarr;</span>
              </button>

              <button
                onClick={() => setIsCredentialModalOpen(true)}
                className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white transition-colors flex items-center justify-between"
              >
                <span>Issue Physical QR Credential</span>
                <span className="text-gray-400">&rarr;</span>
              </button>

              <button
                onClick={openPhotoModal}
                className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white transition-colors flex items-center justify-between"
              >
                <span>Manage Profile Avatar Picture</span>
                <span className="text-gray-400">&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL: Edit Profile ──────────────────────────────────────────────── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Staff Profile</h3>
            {editError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{editError}</div>}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="teacher@school.com"
                  className="w-full px-3 py-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+234 800 000 0000"
                  className="w-full px-3 py-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Designation</label>
                <input
                  type="text"
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 text-sm font-bold bg-brand-teal text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Profile Photo Upload ──────────────────────────────────────── */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Profile Avatar Picture</h3>
            {photoError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{photoError}</div>}

            <div className="flex flex-col items-center justify-center space-y-4">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-full object-cover border-4 border-brand-teal shadow-md" />
              ) : staff.hasPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={staff.photoUrl || `/api/v1/staff/${staff.id}/photo`} alt="Current" className="w-32 h-32 rounded-full object-cover border-4 border-slate-700 shadow-md" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-3xl border-4 border-slate-700 shadow-md">
                  {staff.firstName.charAt(0)}{staff.lastName.charAt(0)}
                </div>
              )}

              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handlePhotoFileChange}
                className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-600 cursor-pointer"
              />
              <p className="text-xs text-gray-400 text-center">Accepted formats: JPEG, PNG, WebP (Max size: 5MB)</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
              {staff.hasPhoto ? (
                <button
                  type="button"
                  onClick={handlePhotoDelete}
                  disabled={photoLoading}
                  className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl"
                >
                  Delete Current Photo
                </button>
              ) : <div />}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePhotoUploadSubmit}
                  disabled={!photoFile || photoLoading}
                  className="px-4 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl disabled:opacity-50"
                >
                  {photoLoading ? "Uploading..." : "Save Photo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Portal Invitation ─────────────────────────────────────────── */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 border border-slate-800">
            <h3 className="text-xl font-bold text-amber-400">Invite to Teacher Portal</h3>
            <p className="text-xs text-slate-300">
              Provision a portal account for <strong>{staff.firstName} {staff.lastName}</strong> ({staff.staffNumber}).
            </p>

            {inviteSuccess && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl text-xs space-y-1">
                <p className="font-bold">{inviteSuccess}</p>
              </div>
            )}

            {inviteWarning && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-xs space-y-2">
                <p className="font-bold">{inviteWarning}</p>
                {lastActivationUrl && (
                  <div className="pt-2 border-t border-amber-500/20">
                    <p className="text-[10px] text-slate-400">Manual Activation Link:</p>
                    <code className="text-[11px] bg-black/40 p-1.5 rounded block break-all text-amber-300 select-all mt-1">
                      {lastActivationUrl}
                    </code>
                  </div>
                )}
              </div>
            )}

            {inviteError && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs">{inviteError}</div>}

            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Recipient Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teacher@school.com"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="px-4 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl disabled:opacity-50"
                >
                  {inviteLoading ? "Sending..." : "Send Invitation Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Change Status ────────────────────────────────────────────── */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Update Employment Status</h3>
            {statusError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{statusError}</div>}
            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Select New Status</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl dark:bg-gray-900 dark:border-gray-700 text-sm"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="RESIGNED">RESIGNED</option>
                  <option value="RETIRED">RETIRED</option>
                  <option value="TERMINATED">TERMINATED</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusLoading}
                  className="px-4 py-2 text-sm font-bold bg-brand-teal text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  {statusLoading ? "Updating..." : "Confirm Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Issue QR Credential ───────────────────────────────────────── */}
      {isCredentialModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Issue Physical QR Credential</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Issuing a new physical QR credential will revoke any existing active credentials for this staff member.
            </p>

            {issuedCredential ? (
              <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-xs font-bold text-green-700">Credential Token Issued Successfully!</p>
                <code className="text-xs bg-white p-2 rounded block break-all font-mono border text-gray-800">
                  {issuedCredential.rawToken}
                </code>
                <p className="text-[11px] text-gray-500">Save this raw token string. It will never be shown again.</p>
              </div>
            ) : null}

            {credentialError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{credentialError}</div>}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => { setIsCredentialModalOpen(false); setIssuedCredential(null); }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-xl"
              >
                {issuedCredential ? "Close" : "Cancel"}
              </button>
              {!issuedCredential && (
                <button
                  type="button"
                  onClick={handleCredentialSubmit}
                  disabled={credentialLoading}
                  className="px-4 py-2 text-sm font-bold bg-brand-teal text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  {credentialLoading ? "Generating..." : "Generate Credential"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
