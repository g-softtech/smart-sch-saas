"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api-client';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: string;
  status: string;
  admissionDate: string;
  studentNumber: string;
}

interface LinkedGuardian {
  id: string;
  relationship: string;
  isPrimary: boolean;
  isEmergency: boolean;
  guardian: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
}

interface Enrollment {
  id: string;
  status: string;
  enrolledAt: string;
  notes?: string;
  academicYear: { name: string };
  class: { name: string };
  arm?: { name: string };
}

interface AcademicYear {
  id: string;
  name: string;
}

interface ClassObj {
  id: string;
  name: string;
}

interface ArmObj {
  id: string;
  name: string;
  classId: string;
}

export default function StudentProfilePage() {
  const params = useParams();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [guardians, setGuardians] = useState<LinkedGuardian[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reference data state
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassObj[]>([]);
  const [arms, setArms] = useState<ArmObj[]>([]);
  const [academicsError, setAcademicsError] = useState<string | null>(null);

  // Modal states
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Enroll Form
  const [enrollYearId, setEnrollYearId] = useState('');
  const [enrollClassId, setEnrollClassId] = useState('');
  const [enrollArmId, setEnrollArmId] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // Transfer Form
  const [transferClassId, setTransferClassId] = useState('');
  const [transferArmId, setTransferArmId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Withdraw Form
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (isRefresh = false) => {
    if (!studentId) return;
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);

      const [studentRes, guardiansRes, enrollmentsRes] = await Promise.all([
        apiClient.get(`api/v1/students/${studentId}`),
        apiClient.get(`api/v1/students/${studentId}/guardians`),
        apiClient.get(`api/v1/students/${studentId}/enrollments`)
      ]);

      setStudent((studentRes as unknown as Student) || null);
      setGuardians(Array.isArray(guardiansRes) ? guardiansRes : []);
      setEnrollments(Array.isArray(enrollmentsRes) ? enrollmentsRes : []);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(isRefresh
          ? 'Mutation succeeded, but failed to refresh profile data. Please reload the page.'
          : (err.message || 'Failed to load student profile')
        );
      } else {
        setError(isRefresh
          ? 'Mutation succeeded, but an unexpected error occurred while refreshing. Please reload.'
          : 'An unexpected error occurred'
        );
      }
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  }, [studentId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, [fetchProfile]);

  const fetchAcademics = useCallback(async () => {
    try {
      setAcademicsError(null);
      const [ayRes, clsRes, armRes] = await Promise.all([
        apiClient.get('api/v1/academics/academic-years?limit=100'),
        apiClient.get('api/v1/academics/classes?limit=100'),
        apiClient.get('api/v1/academics/arms?limit=100')
      ]);
      setAcademicYears(Array.isArray(ayRes) ? ayRes : (ayRes as { data?: AcademicYear[] })?.data || []);
      setClasses(Array.isArray(clsRes) ? clsRes : (clsRes as { data?: ClassObj[] })?.data || []);
      setArms(Array.isArray(armRes) ? armRes : (armRes as { data?: ArmObj[] })?.data || []);
    } catch (err: unknown) {
      if (err instanceof ApiError) setAcademicsError(err.message);
      else setAcademicsError('Failed to load academic data');
    }
  }, []);

  useEffect(() => {
    if (isEnrollModalOpen || isTransferModalOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (classes.length === 0) fetchAcademics();
    }
  }, [isEnrollModalOpen, isTransferModalOpen, classes.length, fetchAcademics]);

  const activeEnrollment = enrollments.find(e => e.status === 'ACTIVE');

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollYearId || !enrollClassId) return;
    setEnrollLoading(true);
    setEnrollError(null);
    try {
      const payload: Record<string, string> = {
        academicYearId: enrollYearId,
        classId: enrollClassId,
      };
      if (enrollArmId) payload.armId = enrollArmId;

      await apiClient.post(`api/v1/students/${studentId}/enrollments`, payload);
      setIsEnrollModalOpen(false);
      setEnrollYearId('');
      setEnrollClassId('');
      setEnrollArmId('');
      fetchProfile(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) setEnrollError(err.message);
      else setEnrollError('Failed to enroll student');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEnrollment || !transferClassId) return;
    setTransferLoading(true);
    setTransferError(null);
    try {
      const payload: Record<string, string> = {
        newClassId: transferClassId,
      };
      if (transferArmId) payload.newArmId = transferArmId;
      if (transferNotes.trim()) payload.notes = transferNotes.trim();

      await apiClient.post(`api/v1/students/${studentId}/enrollments/${activeEnrollment.id}/transfer`, payload);
      setIsTransferModalOpen(false);
      setTransferClassId('');
      setTransferArmId('');
      setTransferNotes('');
      fetchProfile(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) setTransferError(err.message);
      else setTransferError('Failed to transfer student');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEnrollment) return;
    setWithdrawLoading(true);
    setWithdrawError(null);
    try {
      const payload: Record<string, string> = {};
      if (withdrawNotes.trim()) payload.notes = withdrawNotes.trim();

      await apiClient.post(`api/v1/students/${studentId}/enrollments/${activeEnrollment.id}/withdraw`, payload);
      setIsWithdrawModalOpen(false);
      setWithdrawNotes('');
      fetchProfile(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) setWithdrawError(err.message);
      else setWithdrawError('Failed to withdraw student');
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
          <p className="font-medium">{error || 'Student not found.'}</p>
          <Link href="/dashboard/students" className="mt-4 inline-block text-brand-teal hover:underline font-medium">
            &larr; Back to Students
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
          href="/dashboard/students"
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
          title="Back to Students"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {student.firstName} {student.middleName} {student.lastName}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-brand-teal">{student.studentNumber}</span>
            <span>&bull;</span>
            <span className="capitalize">{student.gender.toLowerCase()}</span>
            <span>&bull;</span>
            <span>Admitted: {new Date(student.admissionDate).toLocaleDateString()}</span>
            <span>&bull;</span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
              student.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              student.status === 'WITHDRAWN' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {student.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left Column */}
        <div className="space-y-8">

          {/* Active Enrollment Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-brand-navy dark:text-white">Current Enrollment</h2>
            </div>

            {activeEnrollment ? (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Academic Year</p>
                    <p className="font-medium text-gray-900 dark:text-white">{activeEnrollment.academicYear.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Class & Arm</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {activeEnrollment.class.name} {activeEnrollment.arm ? `- ${activeEnrollment.arm.name}` : ''}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Enrolled On</p>
                    <p className="font-medium text-gray-900 dark:text-white">{new Date(activeEnrollment.enrolledAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setIsTransferModalOpen(true)}
                    className="px-3 py-1.5 text-sm font-medium text-brand-navy dark:text-white bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Transfer
                  </button>
                  <button
                    onClick={() => setIsWithdrawModalOpen(true)}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No active enrollment found for this student.</p>
                <button
                  onClick={() => setIsEnrollModalOpen(true)}
                  className="px-4 py-2 bg-brand-teal text-white rounded-lg font-medium hover:bg-brand-navy transition-colors"
                >
                  Enroll Student
                </button>
              </div>
            )}
          </div>

          {/* Linked Guardians Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-brand-navy dark:text-white mb-6">Linked Guardians</h2>

            {guardians.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No guardians linked to this student.</p>
            ) : (
              <div className="space-y-4">
                {guardians.map((link) => (
                  <div key={link.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {link.guardian.firstName} {link.guardian.lastName}
                        </span>
                        {link.isPrimary && (
                          <span className="bg-brand-gold/20 text-brand-navy dark:text-brand-gold px-2 py-0.5 rounded text-xs font-bold">
                            PRIMARY
                          </span>
                        )}
                        {link.isEmergency && (
                          <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded text-xs font-bold">
                            EMERGENCY
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{link.relationship.toLowerCase()}</p>
                    </div>
                    <div className="mt-3 sm:mt-0 sm:text-right text-sm text-gray-600 dark:text-gray-300">
                      {link.guardian.phone && <p>{link.guardian.phone}</p>}
                      {link.guardian.email && <p>{link.guardian.email}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-8">

          {/* Enrollment History Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-brand-navy dark:text-white mb-6">Enrollment History</h2>

            {enrollments.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No enrollment records found.</p>
            ) : (
              <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-8 pb-4">
                {enrollments.map((enr) => (
                  <div key={enr.id} className="relative pl-6">
                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${
                      enr.status === 'ACTIVE' ? 'bg-green-500' :
                      enr.status === 'TRANSFERRED' ? 'bg-brand-teal' :
                      enr.status === 'WITHDRAWN' ? 'bg-red-500' :
                      enr.status === 'GRADUATED' ? 'bg-brand-gold' :
                      'bg-gray-400'
                    }`}></div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {enr.academicYear.name}
                        </span>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          enr.status === 'ACTIVE' ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30' :
                          enr.status === 'TRANSFERRED' ? 'text-brand-navy bg-brand-teal/20 dark:text-brand-teal dark:bg-brand-teal/10' :
                          enr.status === 'WITHDRAWN' ? 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30' :
                          'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'
                        }`}>
                          {enr.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {enr.class.name} {enr.arm ? `- ${enr.arm.name}` : ''}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {new Date(enr.enrolledAt).toLocaleDateString()}
                      </p>
                      {enr.notes && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 italic">
                          &quot;{enr.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modals */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-brand-navy dark:text-white">Enroll Student</h2>
            </div>
            <form onSubmit={handleEnrollSubmit} className="p-6 space-y-4">
              {academicsError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                  {academicsError}
                </div>
              )}
              {enrollError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                  {enrollError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Academic Year *</label>
                <select
                  value={enrollYearId}
                  onChange={e => setEnrollYearId(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none dark:text-white transition-all"
                  required
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map(ay => (
                    <option key={ay.id} value={ay.id}>{ay.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class *</label>
                <select
                  value={enrollClassId}
                  onChange={e => {
                    setEnrollClassId(e.target.value);
                    setEnrollArmId('');
                  }}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none dark:text-white transition-all"
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Arm (Optional)</label>
                <select
                  value={enrollArmId}
                  onChange={e => setEnrollArmId(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none dark:text-white transition-all"
                >
                  <option value="">Select Arm</option>
                  {arms.filter(a => a.classId === enrollClassId).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  disabled={enrollLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrollLoading || !enrollYearId || !enrollClassId}
                  className="px-6 py-2 bg-brand-teal text-white font-medium rounded-lg hover:bg-brand-navy transition-colors disabled:opacity-50 flex items-center"
                >
                  {enrollLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : null}
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-brand-navy dark:text-white">Transfer Student</h2>
            </div>
            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
              {academicsError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                  {academicsError}
                </div>
              )}
              {transferError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                  {transferError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Class *</label>
                <select
                  value={transferClassId}
                  onChange={e => {
                    setTransferClassId(e.target.value);
                    setTransferArmId('');
                  }}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none dark:text-white transition-all"
                  required
                >
                  <option value="">Select Target Class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Arm (Optional)</label>
                <select
                  value={transferArmId}
                  onChange={e => setTransferArmId(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none dark:text-white transition-all"
                >
                  <option value="">Select Target Arm</option>
                  {arms.filter(a => a.classId === transferClassId).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
                <textarea
                  value={transferNotes}
                  onChange={e => setTransferNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none dark:text-white transition-all"
                  placeholder="Reason for transfer..."
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  disabled={transferLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferLoading || !transferClassId}
                  className="px-6 py-2 bg-brand-navy text-white font-medium rounded-lg hover:bg-brand-teal transition-colors disabled:opacity-50 flex items-center"
                >
                  {transferLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : null}
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-red-50 dark:bg-red-900/20">
              <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">Withdraw Student</h2>
            </div>
            <form onSubmit={handleWithdrawSubmit} className="p-6 space-y-4">
              {withdrawError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
                  {withdrawError}
                </div>
              )}

              <div className="text-gray-700 dark:text-gray-300 text-sm bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900/50">
                <p className="font-semibold mb-1 text-yellow-800 dark:text-yellow-500">Warning: Destructive Action</p>
                <p>This will withdraw the student from their active enrollment and mark their global status as WITHDRAWN. This action is recorded in their enrollment history.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
                <textarea
                  value={withdrawNotes}
                  onChange={e => setWithdrawNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none dark:text-white transition-all"
                  placeholder="Reason for withdrawal..."
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  disabled={withdrawLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawLoading}
                  className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {withdrawLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : null}
                  Confirm Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
