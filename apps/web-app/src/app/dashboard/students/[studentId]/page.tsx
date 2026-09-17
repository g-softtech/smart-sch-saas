"use client";

import { useState, useEffect } from 'react';
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

export default function StudentProfilePage() {
  const params = useParams();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [guardians, setGuardians] = useState<LinkedGuardian[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [studentRes, guardiansRes, enrollmentsRes] = await Promise.all([
          apiClient.get(`api/v1/students/${studentId}`),
          apiClient.get(`api/v1/students/${studentId}/guardians`),
          apiClient.get(`api/v1/students/${studentId}/enrollments`)
        ]);

        // apiClient unwraps the { success, data } automatically based on how it's implemented (or we need to check if it's returning data)
        // From existing page.tsx: `const data = Array.isArray(response) ? response : [];` suggests it returns the unwrapped data payload directly.
        setStudent((studentRes as unknown as Student) || null);
        setGuardians(Array.isArray(guardiansRes) ? guardiansRes : []);
        setEnrollments(Array.isArray(enrollmentsRes) ? enrollmentsRes : []);

      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError(err.message || 'Failed to load student profile');
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [studentId]);

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

  const activeEnrollment = enrollments.find(e => e.status === 'ACTIVE');

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
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No active enrollment found for this student.</p>
                <button
                  disabled
                  className="px-4 py-2 bg-brand-teal text-white rounded-lg font-medium opacity-50 cursor-not-allowed"
                  title="Enrollment mutations are disabled until Phase 3.1C"
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
    </div>
  );
}
