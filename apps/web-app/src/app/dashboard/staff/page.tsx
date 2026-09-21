"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api-client";
import { DataTable, Column } from "@/components/DataTable";

const TAKE = 50;

interface StaffProfile {
  id: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  type: string;
  status: string;
}

export default function StaffPage() {
  const [data, setData] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("MALE"); // default
  const [joiningDate, setJoiningDate] = useState("");
  const [designation, setDesignation] = useState("");
  const [staffType, setStaffType] = useState("TEACHING"); // default

  // Submission State
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  const fetchStaff = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);

    try {
      const skip = page * TAKE;
      const endpoint = `api/v1/staff?skip=${skip}&take=${TAKE}`;
      const response = await apiClient.get(endpoint);

      const fetchedData = Array.isArray(response) ? response : [];

      setData(fetchedData);
      setPageIndex(page);
      setHasMore(fetchedData.length === TAKE);
      setInitialized(true);
    } catch (err: unknown) {
      let errorMessage = "Failed to load staff.";
      if (err instanceof ApiError) {
        if (err.status === 403) {
          errorMessage = "You do not have permission to view this data.";
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized && !loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchStaff(0);
    }
  }, [initialized, loading, fetchStaff]);

  const handleNext = () => {
    if (hasMore) {
      fetchStaff(pageIndex + 1);
    }
  };

  const handlePrev = () => {
    if (pageIndex > 0) {
      fetchStaff(pageIndex - 1);
    }
  };

  const MIN_STAFF_AGE = 18;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !joiningDate || !staffType)
      return;

    // ── Date Validation ────────────────────────────────────────────────
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const joining = new Date(joiningDate);

      if (dob >= joining) {
        setCreateError("Date of Birth must be before the Joining Date.");
        return;
      }

      // Minimum age check: must be at least MIN_STAFF_AGE years old by joining date
      const minBirthYear = new Date(joining);
      minBirthYear.setFullYear(minBirthYear.getFullYear() - MIN_STAFF_AGE);
      if (dob > minBirthYear) {
        setCreateError(
          `Staff member must be at least ${MIN_STAFF_AGE} years old on their joining date.`,
        );
        return;
      }
    }
    // ──────────────────────────────────────────────────────────────────

    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(false);

    try {
      interface CreateStaffPayload {
        firstName: string;
        lastName: string;
        middleName?: string;
        dateOfBirth?: string;
        gender?: string;
        joiningDate: string;
        designation?: string;
        type: string;
      }

      const payload: CreateStaffPayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        joiningDate,
        type: staffType,
      };

      if (middleName.trim()) payload.middleName = middleName.trim();
      if (dateOfBirth) payload.dateOfBirth = dateOfBirth;
      if (designation.trim()) payload.designation = designation.trim();

      await apiClient.post("api/v1/staff", payload);

      setCreateSuccess(true);

      // Reset form
      setFirstName("");
      setLastName("");
      setMiddleName("");
      setDateOfBirth("");
      setGender("MALE");
      setJoiningDate("");
      setDesignation("");
      setStaffType("TEACHING");

      setTimeout(() => {
        setIsCreateModalOpen(false);
        setCreateSuccess(false);
      }, 1500);

      // Refresh list
      fetchStaff(0);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setCreateError(err.message || "Failed to create staff member");
      } else {
        setCreateError(
          err instanceof Error ? err.message : "An error occurred",
        );
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const columns: Column<StaffProfile>[] = [
    { header: "ID", accessor: "id", hideOnMobile: true },
    {
      header: "Name",
      accessor: (item) => {
        const first = item.firstName || "";
        const last = item.lastName || "";
        return (
          <Link
            href={`/dashboard/staff/${item.id}`}
            className="text-brand-navy dark:text-brand-gold hover:opacity-80 transition-opacity font-medium"
          >
            {`${first} ${last}`.trim() || "Unknown Staff"}
          </Link>
        );
      },
    },
    { header: "Designation", accessor: (item) => item.designation || "N/A" },
    {
      header: "Type",
      accessor: (item) => (
        <span className="inline-flex items-center rounded-md bg-gray-50 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10 dark:ring-gray-400/20">
          {item.type}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: (item) => {
        const isActive = item.status === "ACTIVE";
        return (
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${isActive ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 ring-green-600/20 dark:ring-green-500/30" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 ring-red-600/10 dark:ring-red-500/30"}`}
          >
            {item.status}
          </span>
        );
      },
    },
    {
      header: "Actions",
      accessor: (item) => (
        <Link
          href={`/dashboard/staff/${item.id}`}
          className="text-brand-teal hover:text-brand-navy dark:hover:text-brand-offwhite transition-colors font-medium text-sm"
        >
          View Profile
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy dark:text-brand-offwhite">
            Staff
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-brand-gray-text">
            Manage staff profiles, credentials, and access.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center rounded-md bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 dark:focus:ring-offset-brand-navy"
        >
          Add Staff
        </button>
      </div>

      <div className="border-b border-gray-200 dark:border-brand-border-dark">
        <nav
          className="-mb-px flex space-x-8 overflow-x-auto"
          aria-label="Tabs"
        >
          <button
            className="whitespace-nowrap border-b-2 border-brand-gold py-4 px-1 text-sm font-medium text-brand-navy dark:text-brand-gold transition-colors"
            aria-current="page"
          >
            Staff Directory
          </button>
        </nav>
      </div>

      {error ? (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-900/30">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                Error loading staff
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <DataTable
          data={data}
          columns={columns}
          loading={loading}
          onNext={handleNext}
          onPrev={handlePrev}
          hasMore={hasMore}
          pageIndex={pageIndex}
          emptyMessage="No staff found in this workspace."
        />
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500/75 dark:bg-brand-navy/80 backdrop-blur-sm transition-opacity"
              onClick={() => !createLoading && setIsCreateModalOpen(false)}
            />
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-brand-navy-surface border border-gray-200 dark:border-brand-border-dark px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-brand-navy dark:text-brand-offwhite">
                  Add New Staff Member
                </h3>
                <form onSubmit={handleCreateSubmit} className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                    {/* First Name */}
                    <div>
                      <label
                        htmlFor="firstName"
                        className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite"
                      >
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="firstName"
                          id="firstName"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          disabled={createLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                    {/* Last Name */}
                    <div>
                      <label
                        htmlFor="lastName"
                        className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite"
                      >
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="lastName"
                          id="lastName"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          disabled={createLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                    {/* Middle Name */}
                    <div>
                      <label
                        htmlFor="middleName"
                        className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite"
                      >
                        Middle Name
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="middleName"
                          id="middleName"
                          value={middleName}
                          onChange={(e) => setMiddleName(e.target.value)}
                          disabled={createLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                    {/* Gender */}
                    <div>
                      <label
                        htmlFor="gender"
                        className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite"
                      >
                        Gender
                      </label>
                      <div className="mt-1">
                        <select
                          id="gender"
                          name="gender"
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          disabled={createLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        >
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label
                        htmlFor="dateOfBirth"
                        className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite"
                      >
                        Date of Birth
                      </label>
                      <div className="mt-1">
                        <input
                          type="date"
                          name="dateOfBirth"
                          id="dateOfBirth"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          disabled={createLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                    {/* Joining Date */}
                    <div>
                      <label
                        htmlFor="joiningDate"
                        className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite"
                      >
                        Joining Date <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1">
                        <input
                          type="date"
                          name="joiningDate"
                          id="joiningDate"
                          required
                          value={joiningDate}
                          onChange={(e) => setJoiningDate(e.target.value)}
                          disabled={createLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                    {/* Designation */}
                    <div>
                      <label
                        htmlFor="designation"
                        className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite"
                      >
                        Designation
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="designation"
                          id="designation"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          disabled={createLoading}
                          placeholder="e.g. Mathematics Teacher"
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        />
                      </div>
                    </div>

                    {/* Staff Type */}
                    <div>
                      <label
                        htmlFor="staffType"
                        className="block text-sm font-medium leading-6 text-brand-navy dark:text-brand-offwhite"
                      >
                        Staff Type <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1">
                        <select
                          id="staffType"
                          name="staffType"
                          required
                          value={staffType}
                          onChange={(e) => setStaffType(e.target.value)}
                          disabled={createLoading}
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-brand-offwhite bg-white dark:bg-brand-navy shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark focus:ring-2 focus:ring-inset focus:ring-brand-gold sm:text-sm sm:leading-6 px-3"
                        >
                          <option value="TEACHING">Teaching</option>
                          <option value="NON_TEACHING">Non-Teaching</option>
                          <option value="ADMINISTRATION">Administration</option>
                          <option value="SUPPORT">Support</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {createError && (
                    <div className="mt-4 text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-900/30">
                      {createError}
                    </div>
                  )}
                  {createSuccess && (
                    <div className="mt-4 text-sm text-brand-teal p-2 bg-brand-teal/10 rounded border border-brand-teal/20">
                      Staff member created successfully!
                    </div>
                  )}

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="submit"
                      disabled={createLoading || createSuccess}
                      className="inline-flex w-full justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-gold-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold sm:col-start-2 disabled:opacity-50 transition-colors"
                    >
                      {createLoading ? "Creating..." : "Create Staff"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      disabled={createLoading}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-brand-navy px-3 py-2 text-sm font-semibold text-gray-900 dark:text-brand-offwhite shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark hover:bg-gray-50 dark:hover:bg-brand-navy-surface sm:col-start-1 sm:mt-0 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
