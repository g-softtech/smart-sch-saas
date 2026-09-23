"use client";

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient, ApiError } from '@/lib/api-client';

interface Credential {
  id: string;
  studentId: string;
  status: 'ISSUED' | 'ACTIVE' | 'REVOKED' | 'REPLACED';
  issuedAt: string;
  revokedAt: string | null;
  revocationReason: string | null;
}

export default function StudentIdCardsPage({ params }: { params: Promise<{ studentId: string }> }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.studentId;

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issueLoading, setIssueLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null);

  // For newly issued credential token to display the QR
  const [newToken, setNewToken] = useState<string | null>(null);

  const fetchCredentials = useCallback(async () => {
    try {
      setLoading(true);
      const data = (await apiClient.get(`/api/v1/id-cards/student/${studentId}`)) as Credential[];
      setCredentials(data || []);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load credentials');
      }
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const handleIssue = async () => {
    try {
      setIssueLoading(true);
      setError(null);
      const data = (await apiClient.post(`/api/v1/id-cards/issue`, {
        studentId: studentId
      })) as any;
      setNewToken(data.token);
      await fetchCredentials();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to issue credential');
      }
    } finally {
      setIssueLoading(false);
    }
  };

  const handleRevoke = async (credentialId: string) => {
    if (!window.confirm("Are you sure you want to revoke this ID card? It will immediately stop working.")) return;

    try {
      setRevokeLoading(credentialId);
      setError(null);
      await apiClient.patch(`/api/v1/id-cards/${credentialId}/revoke`, {
        reason: 'Manually revoked by admin'
      });
      if (newToken) setNewToken(null);
      await fetchCredentials();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to revoke credential');
      }
    } finally {
      setRevokeLoading(null);
    }
  };

  const activeCredential = credentials.find(c => c.status === 'ACTIVE' || c.status === 'ISSUED');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ID Card Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage secure QR credentials for this student.</p>
        </div>
        <Link
          href={`/dashboard/students/${studentId}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          &larr; Back to Student
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Active Card Display */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Active ID Card</h2>

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
            </div>
          ) : activeCredential ? (
            <div className="flex flex-col items-center">
              {newToken ? (
                <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 mb-4 w-full flex flex-col items-center">
                  <QRCodeSVG value={newToken} size={200} level="H" />
                  <p className="text-xs text-center text-gray-400 mt-2">New Token Active</p>
                  <button
                    onClick={() => window.print()}
                    className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4 inline-block mr-1 -mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Print ID Card
                  </button>

                  {/* Print-only container */}
                  <div className="hidden print:flex fixed inset-0 bg-white flex-col items-center justify-center z-50">
                    <div className="w-[3.375in] h-[2.125in] border-2 border-brand-navy rounded-xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden bg-white">
                      <div className="absolute top-0 left-0 w-full h-1 bg-brand-teal"></div>
                      <div className="absolute bottom-0 right-0 w-full h-1 bg-brand-gold"></div>

                      <div className="flex flex-col h-full justify-between z-10 w-1/2">
                        <div>
                          <h1 className="text-xs font-bold text-brand-navy tracking-wider uppercase mb-1">SchoolOS</h1>
                          <p className="text-[10px] font-semibold text-gray-800">Student ID Card</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 leading-tight">Student Name</p>
                          <p className="text-[10px] text-gray-500 font-mono mt-1">ID: {studentId.substring(0, 8).toUpperCase()}</p>
                        </div>
                      </div>

                      <div className="w-[100px] h-[100px] bg-white p-1 rounded-lg border border-gray-200 flex-shrink-0 z-10">
                        <QRCodeSVG value={newToken} size={90} level="H" />
                      </div>
                    </div>
                    <p className="mt-4 text-[10px] text-gray-400">Please cut along the border. For internal school use only.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 dark:bg-gray-900 p-8 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 mb-4 flex flex-col items-center justify-center text-center">
                  <div className="h-20 w-20 text-gray-400 mb-2">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">QR Code hidden for security</p>
                  <p className="text-xs text-gray-400 mt-1">If the physical card is lost, revoke it and issue a new one.</p>
                </div>
              )}

              <div className="w-full mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-medium text-green-600">{activeCredential.status}</span>
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
                {revokeLoading === activeCredential.id ? 'Revoking...' : 'Revoke ID Card'}
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No active ID card</h3>
              <p className="mt-1 text-sm text-gray-500">Issue a new secure QR credential to get started.</p>
              <div className="mt-6">
                <button
                  onClick={handleIssue}
                  disabled={issueLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {issueLoading ? 'Issuing...' : 'Issue New ID Card'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Credential History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Credential History</h2>

          <div className="flow-root">
            <ul className="-mb-8">
              {credentials.map((cred, credIdx) => (
                <li key={cred.id}>
                  <div className="relative pb-8">
                    {credIdx !== credentials.length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800 ${
                          cred.status === 'ACTIVE' || cred.status === 'ISSUED'
                            ? 'bg-green-500'
                            : 'bg-gray-400'
                        }`}>
                          {cred.status === 'ACTIVE' || cred.status === 'ISSUED' ? (
                            <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Credential <span className="font-medium text-gray-900 dark:text-white">{cred.status}</span>
                          </p>
                          {cred.revocationReason && (
                            <p className="mt-1 text-xs text-red-500">
                              Revoked: {cred.revocationReason}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-xs whitespace-nowrap text-gray-500 dark:text-gray-400">
                          <time dateTime={cred.issuedAt}>{new Date(cred.issuedAt).toLocaleDateString()}</time>
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
