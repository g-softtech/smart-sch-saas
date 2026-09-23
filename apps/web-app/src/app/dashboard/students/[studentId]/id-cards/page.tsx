"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { apiClient, ApiError } from "@/lib/api-client";
import PhysicalIdCard, {
  PhysicalIdCardStudent,
  PhysicalIdCardSchool,
} from "@/components/id-cards/PhysicalIdCard";

interface Credential {
  id: string;
  studentId: string;
  status: "ISSUED" | "ACTIVE" | "REVOKED" | "REPLACED";
  issuedAt: string;
  revokedAt: string | null;
  revocationReason: string | null;
}

export default function StudentIdCardsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.studentId;

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issueLoading, setIssueLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null);

  // For newly issued credential token to display the QR
  const [newToken, setNewToken] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [credData, studentData, enrollmentsData] = await Promise.all([
        apiClient.get(`/api/v1/id-cards/student/${studentId}`).catch(() => []),
        apiClient.get(`/api/v1/students/${studentId}`).catch(() => null),
        apiClient
          .get(`/api/v1/students/${studentId}/enrollments`)
          .catch(() => []),
      ]);

      setCredentials((credData as Credential[]) || []);
      setStudent(studentData);
      setEnrollments((enrollmentsData as any[]) || []);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load data");
      }
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleIssue = async () => {
    try {
      setIssueLoading(true);
      setError(null);
      const data = (await apiClient.post(`/api/v1/id-cards/issue`, {
        studentId: studentId,
      })) as any;
      setNewToken(data.token);
      await fetchData();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to issue credential");
      }
    } finally {
      setIssueLoading(false);
    }
  };

  const handleRevoke = async (credentialId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to revoke this ID card? It will immediately stop working.",
      )
    )
      return;

    try {
      setRevokeLoading(credentialId);
      setError(null);
      await apiClient.patch(`/api/v1/id-cards/${credentialId}/revoke`, {
        reason: "Manually revoked by admin",
      });
      if (newToken) setNewToken(null);
      await fetchData();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to revoke credential");
      }
    } finally {
      setRevokeLoading(null);
    }
  };

  const activeCredential = credentials.find(
    (c) => c.status === "ACTIVE" || c.status === "ISSUED",
  );

  // Construct view models for the PhysicalIdCard
  const activeEnrollment = enrollments.find((e) => e.status === "ACTIVE");

  const physicalStudent: PhysicalIdCardStudent | null = student
    ? {
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        studentNumber: student.studentNumber,
        className: activeEnrollment?.class?.name,
        armName: activeEnrollment?.arm?.name,
        photoUrl: undefined, // Explicit placeholder: missing in backend schema
      }
    : null;

  const physicalSchool: PhysicalIdCardSchool = {
    name: student?.school?.name || "SchoolOS Default",
    logoUrl: undefined, // Explicit placeholder: missing in backend schema
    address: undefined, // Explicit placeholder: missing in backend schema
    motto: undefined, // Explicit placeholder: missing in backend schema
  };

  return (
    <div className="p-6 max-w-5xl mx-auto print:p-0 print:m-0">
      <div className="mb-6 flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ID Card Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage secure physical credentials for this student.
          </p>
        </div>
        <Link
          href={`/dashboard/students/${studentId}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          &larr; Back to Student
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 print:hidden">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block">
        {/* Left Column: Active Card Display */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 print:border-none print:shadow-none print:bg-transparent print:p-0">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 print:hidden">
            Active ID Card
          </h2>

          {loading ? (
            <div className="animate-pulse space-y-4 print:hidden">
              <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
            </div>
          ) : activeCredential && physicalStudent ? (
            <div className="flex flex-col items-center print:block">
              {newToken ? (
                <div className="w-full flex flex-col items-center">
                  <div className="print:fixed print:inset-0 print:bg-white print:z-50 print:flex print:flex-col print:items-center print:justify-start print:pt-10">
                    <PhysicalIdCard
                      student={physicalStudent}
                      school={physicalSchool}
                      qrToken={newToken}
                    />
                  </div>

                  <div className="print:hidden bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 w-full flex flex-col items-center">
                    <p className="text-sm text-center text-blue-800 font-medium mb-3">
                      New ID Card Generated Successfully
                    </p>
                    <button
                      onClick={() => window.print()}
                      className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md shadow-sm text-sm font-medium transition-colors"
                    >
                      <svg
                        className="w-4 h-4 inline-block mr-2 -mt-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                        />
                      </svg>
                      Print Physical ID Card
                    </button>
                    <p className="text-xs text-blue-600/70 mt-2 text-center max-w-sm">
                      This is the only time you will see the full QR credential.
                      Please print the card now.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="opacity-90 mb-4 max-w-full overflow-x-auto pb-2 flex justify-center w-full">
                    <div className="transform scale-[0.85] sm:scale-100 origin-top">
                      <PhysicalIdCard
                        student={physicalStudent}
                        school={physicalSchool}
                        qrToken="HIDDEN_FOR_SECURITY"
                      />
                    </div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 mb-4 flex flex-col items-center justify-center text-center w-full max-w-sm">
                    <div className="flex items-center text-gray-500 mb-1">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <span className="text-sm font-medium">
                        QR Code Hidden for Security
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      For security, you cannot reprint an existing ID card. If
                      the physical card is lost, revoke this one and issue a new
                      one.
                    </p>
                  </div>
                </div>
              )}

              <div className="w-full mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-medium text-green-600">
                    {activeCredential.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Issued:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-300">
                    {new Date(activeCredential.issuedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleRevoke(activeCredential.id)}
                disabled={revokeLoading === activeCredential.id}
                className="mt-6 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {revokeLoading === activeCredential.id
                  ? "Revoking..."
                  : "Revoke ID Card"}
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No active ID card
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Issue a new secure QR credential to get started.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleIssue}
                  disabled={issueLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {issueLoading ? "Issuing..." : "Issue New ID Card"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Credential History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Credential History
          </h2>

          <div className="flow-root">
            <ul className="-mb-8">
              {credentials.map((cred, credIdx) => (
                <li key={cred.id}>
                  <div className="relative pb-8">
                    {credIdx !== credentials.length - 1 ? (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span
                          className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800 ${
                            cred.status === "ACTIVE" || cred.status === "ISSUED"
                              ? "bg-green-500"
                              : "bg-gray-400"
                          }`}
                        >
                          {cred.status === "ACTIVE" ||
                          cred.status === "ISSUED" ? (
                            <svg
                              className="h-5 w-5 text-white"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="h-5 w-5 text-white"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Credential{" "}
                            <span className="font-medium text-gray-900 dark:text-white">
                              {cred.status}
                            </span>
                          </p>
                          {cred.revocationReason && (
                            <p className="mt-1 text-xs text-red-500">
                              Revoked: {cred.revocationReason}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-xs whitespace-nowrap text-gray-500 dark:text-gray-400">
                          <time dateTime={cred.issuedAt}>
                            {new Date(cred.issuedAt).toLocaleDateString()}
                          </time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}

              {credentials.length === 0 && !loading && (
                <div className="text-center py-4 text-sm text-gray-500">
                  No credential history found.
                </div>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
