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
  gender?: string;
  staffNumber: string;
  designation?: string;
  type: string;
  status: string;
  joiningDate: string;
  dateOfBirth?: string;
  departmentId?: string;
}

export default function StaffProfilePage() {
  const params = useParams();
  const staffId = params.staffId as string;

  const [staff, setStaff] = useState<StaffProfile | null>(null);
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
  const [issuedCredential, setIssuedCredential] = useState<{
    rawToken: string;
  } | null>(null);

  const fetchProfile = useCallback(
    async (isRefresh = false) => {
      if (!staffId) return;
      try {
        if (!isRefresh) {
          setLoading(true);
        }
        setError(null);

        const response = await apiClient.get(`api/v1/staff/${staffId}`);
        setStaff((response as unknown as StaffProfile) || null);
        if (
          !isRefresh &&
          response &&
          (response as { status?: string }).status
        ) {
          setTargetStatus((response as { status?: string }).status!);
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
        if (!isRefresh) {
          setLoading(false);
        }
      }
    },
    [staffId],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
        <Link
          href="/dashboard/staff"
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
          title="Back to Staff Directory"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {staff.firstName} {staff.middleName} {staff.lastName}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-brand-teal">
              {staff.staffNumber}
            </span>
            <span>&bull;</span>
            <span className="capitalize">
              {staff.type.replace("_", " ").toLowerCase()}
            </span>
            <span>&bull;</span>
            <span>
              Joined: {new Date(staff.joiningDate).toLocaleDateString()}
            </span>
            <span>&bull;</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                staff.status === "ACTIVE"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : staff.status === "SUSPENDED"
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : staff.status === "TERMINATED"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {staff.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          {/* Identity Information Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-brand-navy dark:text-white">
                Identity Information
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Designation
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {staff.designation || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Staff Type
                </p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {staff.type.replace("_", " ").toLowerCase()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Gender
                </p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {staff.gender ? staff.gender.toLowerCase() : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Date of Birth
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {staff.dateOfBirth
                    ? new Date(staff.dateOfBirth).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Actions Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-brand-navy dark:text-white mb-6">
              Management Actions
            </h2>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Update Status
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Change staff employment status.
                  </p>
                </div>
                <button
                  onClick={() => setIsStatusModalOpen(true)}
                  className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors w-full sm:w-auto text-brand-navy dark:text-brand-offwhite"
                >
                  Change Status
                </button>
              </div>

              <div className={`bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 ${staff.status !== 'ACTIVE' ? 'opacity-60' : ''}`}>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Access Credentials
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {staff.status !== 'ACTIVE'
                      ? `QR credentials cannot be issued for ${staff.status.toLowerCase()} staff.`
                      : 'Issue a new QR code credential.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIssuedCredential(null);
                    setCredentialError(null);
                    setIsCredentialModalOpen(true);
                  }}
                  disabled={staff.status !== 'ACTIVE'}
                  title={staff.status !== 'ACTIVE' ? `Cannot issue credentials to ${staff.status.toLowerCase()} staff` : undefined}
                  className="px-4 py-2 bg-brand-gold text-brand-navy rounded-lg text-sm font-semibold hover:bg-brand-gold-hover transition-colors w-full sm:w-auto disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Issue QR Credential
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}

      {/* Update Status Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-brand-navy dark:text-white">
                Update Staff Status
              </h2>
            </div>
            <form onSubmit={handleStatusSubmit} className="p-6 space-y-4">
              {statusError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                  {statusError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Status *
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none dark:text-white transition-all"
                  required
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="RESIGNED">Resigned</option>
                  <option value="RETIRED">Retired</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>

              <div className="text-gray-700 dark:text-gray-300 text-sm bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900/50 mt-4">
                <p className="font-semibold mb-1 text-yellow-800 dark:text-yellow-500">
                  Notice
                </p>
                <p>
                  Changing the status to a non-active state may immediately
                  revoke system access and privileges.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  disabled={statusLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusLoading || targetStatus === staff.status}
                  className="px-6 py-2 bg-brand-teal text-white font-medium rounded-lg hover:bg-brand-navy transition-colors disabled:opacity-50 flex items-center"
                >
                  {statusLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : null}
                  Confirm Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Credential Modal */}
      {isCredentialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-brand-navy dark:text-white">
                Issue QR Credential
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {credentialError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                  {credentialError}
                </div>
              )}

              {issuedCredential ? (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-lg">
                    <p className="text-green-800 dark:text-green-400 font-semibold mb-2">
                      Credential Issued Successfully
                    </p>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 break-all text-left">
                      <p className="text-xs text-gray-500 mb-1">Raw Token:</p>
                      <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                        {issuedCredential.rawToken}
                      </code>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCredentialModalOpen(false)}
                    className="w-full px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCredentialSubmit}>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                    You are about to issue a new QR credential for{" "}
                    <strong>
                      {staff.firstName} {staff.lastName}
                    </strong>
                    . Generating a new credential will invalidate previous ones
                    of this type.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCredentialModalOpen(false)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      disabled={credentialLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={credentialLoading}
                      className="px-6 py-2 bg-brand-gold text-brand-navy font-bold rounded-lg hover:bg-brand-gold-hover transition-colors disabled:opacity-50 flex items-center"
                    >
                      {credentialLoading ? (
                        <div className="w-5 h-5 border-2 border-brand-navy border-t-transparent rounded-full animate-spin mr-2"></div>
                      ) : null}
                      Issue Now
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
