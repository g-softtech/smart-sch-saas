"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient, ApiError } from '@/lib/api-client';

interface Credential {
  id: string;
  guardianId: string;
  status: 'ISSUED' | 'ACTIVE' | 'REVOKED' | 'REPLACED';
  issuedAt: string;
  revokedAt: string | null;
  revocationReason: string | null;
}

interface PickupAuthorization {
  id: string;
  guardianId: string;
  studentId: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  validFrom: string;
  validUntil: string | null;
  createdAt: string;
}

export default function GuardianManagementPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const guardianId = params.guardianId as string;

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [authorizations, setAuthorizations] = useState<PickupAuthorization[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [issueLoading, setIssueLoading] = useState(false);
  const [revokeCredLoading, setRevokeCredLoading] = useState<string | null>(null);

  const [authLoading, setAuthLoading] = useState(false);
  const [revokeAuthLoading, setRevokeAuthLoading] = useState<string | null>(null);

  const [newToken, setNewToken] = useState<string | null>(null);

  // New Auth form state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [credsData, authsData] = await Promise.all([
        apiClient.get(`/api/v1/movement/guardian-credentials/guardian/${guardianId}`),
        apiClient.get(`/api/v1/movement/pickup-authorizations/student/${studentId}`)
      ]);
      setCredentials((credsData as Credential[]) || []);
      // Filter authorizations to only show this guardian's
      const auths = (authsData as PickupAuthorization[]) || [];
      setAuthorizations(auths.filter(a => a.guardianId === guardianId));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load guardian data');
      }
    } finally {
      setLoading(false);
    }
  }, [guardianId, studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleIssueCredential = async () => {
    try {
      setIssueLoading(true);
      setError(null);
      const data = (await apiClient.post(`/api/v1/movement/guardian-credentials/issue`, {
        guardianId
      })) as { token: string };
      setNewToken(data.token);
      await fetchData();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to issue credential');
    } finally {
      setIssueLoading(false);
    }
  };

  const handleRevokeCredential = async (credentialId: string) => {
    if (!window.confirm("Are you sure you want to revoke this Guardian QR card?")) return;
    try {
      setRevokeCredLoading(credentialId);
      setError(null);
      await apiClient.patch(`/api/v1/movement/guardian-credentials/${credentialId}/revoke`, {
        reason: 'Manually revoked by admin'
      });
      if (newToken) setNewToken(null);
      await fetchData();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to revoke credential');
    } finally {
      setRevokeCredLoading(null);
    }
  };

  const handleCreateAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validFrom) return;
    try {
      setAuthLoading(true);
      setError(null);
      await apiClient.post(`/api/v1/movement/pickup-authorizations`, {
        studentId,
        guardianId,
        validFrom: new Date(validFrom).toISOString(),
        validUntil: validUntil ? new Date(validUntil).toISOString() : null
      });
      setIsAuthModalOpen(false);
      setValidFrom('');
      setValidUntil('');
      await fetchData();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to create authorization');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRevokeAuth = async (authId: string) => {
    if (!window.confirm("Are you sure you want to revoke this pickup authorization?")) return;
    try {
      setRevokeAuthLoading(authId);
      setError(null);
      await apiClient.patch(`/api/v1/movement/pickup-authorizations/${authId}/revoke`, {});
      await fetchData();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to revoke authorization');
    } finally {
      setRevokeAuthLoading(null);
    }
  };

  const activeCredential = credentials.find(c => c.status === 'ACTIVE' || c.status === 'ISSUED');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Guardian Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage secure Guardian QR credentials and Pickup Authorizations.</p>
        </div>
        <Link
          href={`/dashboard/students/${studentId}`}
          className="text-sm font-medium text-brand-teal hover:text-brand-navy"
        >
          &larr; Back to Student
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Left Column: Credential Management */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
              <h2 className="text-xl font-semibold text-brand-navy dark:text-white mb-6">Guardian QR Credential</h2>

              {activeCredential ? (
                <div className="flex flex-col items-center">
                  {newToken ? (
                    <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 mb-4 text-center w-full flex flex-col items-center">
                      <QRCodeSVG value={newToken} size={200} level="H" />
                      <p className="text-xs text-gray-500 mt-3 font-semibold text-brand-gold">GUARDIAN QR CREDENTIAL</p>
                      <p className="text-xs text-gray-400 mt-1">This raw token will never be shown again.</p>
                      <button
                        onClick={() => window.print()}
                        className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm font-medium transition-colors"
                      >
                        <svg className="w-4 h-4 inline-block mr-1 -mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Print Guardian Credential
                      </button>

                      {/* Print-only container */}
                      <div className="hidden print:flex fixed inset-0 bg-white flex-col items-center justify-center z-50">
                        <div className="w-[3.375in] h-[2.125in] border-2 border-brand-navy rounded-xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden bg-white">
                          <div className="absolute top-0 left-0 w-full h-1 bg-brand-teal"></div>
                          <div className="absolute bottom-0 right-0 w-full h-1 bg-brand-gold"></div>

                          <div className="flex flex-col h-full justify-between z-10 w-1/2">
                            <div>
                              <h1 className="text-xs font-bold text-brand-navy tracking-wider uppercase mb-1">SchoolOS</h1>
                              <p className="text-[10px] font-semibold text-brand-gold">Guardian Credential</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 font-mono">Present for Pickup</p>
                            </div>
                          </div>

                          <div className="w-[100px] h-[100px] bg-white p-1 rounded-lg border border-gray-200 flex-shrink-0 z-10">
                            <QRCodeSVG value={newToken} size={90} level="H" />
                          </div>
                        </div>
                        <p className="mt-4 text-[10px] text-gray-400">Please cut along the border. Present this code for authorized student pickup.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 mb-4 flex flex-col items-center justify-center text-center">
                      <div className="h-20 w-20 text-gray-400 mb-2">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500">QR Code hidden for security</p>
                      <p className="text-xs text-gray-400 mt-1">If the Guardian loses their credential, revoke it and issue a new one.</p>
                    </div>
                  )}

                  <div className="w-full mt-4 space-y-2 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Status:</span>
                      <span className="font-semibold text-green-600">{activeCredential.status}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Issued:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-300">
                        {new Date(activeCredential.issuedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevokeCredential(activeCredential.id)}
                    disabled={revokeCredLoading === activeCredential.id}
                    className="mt-6 w-full py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {revokeCredLoading === activeCredential.id ? 'Revoking...' : 'Revoke Guardian Credential'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">No Active Credential</h3>
                  <p className="mt-1 text-sm text-gray-500 px-4">This Guardian needs a secure QR credential to authorize student departures.</p>
                  <button
                    onClick={handleIssueCredential}
                    disabled={issueLoading}
                    className="mt-6 inline-flex items-center px-6 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-brand-teal hover:bg-brand-navy transition-colors disabled:opacity-50"
                  >
                    {issueLoading ? 'Issuing...' : 'Issue New Guardian QR'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Pickup Authorizations */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-brand-navy dark:text-white">Pickup Authorizations</h2>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3 py-1.5 text-sm font-medium text-brand-teal bg-brand-teal/10 hover:bg-brand-teal/20 rounded-lg transition-colors"
                >
                  + New Authorization
                </button>
              </div>

              <div className="space-y-4">
                {authorizations.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No pickup authorizations found.</p>
                ) : (
                  authorizations.map(auth => (
                    <div key={auth.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          auth.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {auth.status}
                        </span>
                        {auth.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleRevokeAuth(auth.id)}
                            disabled={revokeAuthLoading === auth.id}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            {revokeAuthLoading === auth.id ? 'Revoking...' : 'Revoke'}
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">Valid From</p>
                          <p className="font-medium text-gray-900 dark:text-white">{new Date(auth.validFrom).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">Valid Until</p>
                          <p className="font-medium text-gray-900 dark:text-white">{auth.validUntil ? new Date(auth.validUntil).toLocaleDateString() : 'Indefinite'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-brand-navy dark:text-white">Create Pickup Authorization</h2>
            </div>
            <form onSubmit={handleCreateAuth} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid From *</label>
                <input
                  type="date"
                  value={validFrom}
                  onChange={e => setValidFrom(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid Until (Optional)</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={e => setValidUntil(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                  disabled={authLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authLoading || !validFrom}
                  className="px-6 py-2 bg-brand-teal text-white font-medium rounded-lg hover:bg-brand-navy transition-colors disabled:opacity-50"
                >
                  {authLoading ? 'Creating...' : 'Create Authorization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
