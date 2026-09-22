"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface StudentRecord {
  status: string;
  reason?: string;
  notes?: string;
}

interface RegisterData {
  academicYearId: string;
  termId: string;
  classId: string;
  armId?: string;
  date: string;
  isFinalized: boolean;
  records?: any[];
}

interface EligibleStudent {
  studentId: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
}

export default function RegisterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const registerId = params.id as string;

  const [register, setRegister] = useState<RegisterData | null>(null);
  const [students, setStudents] = useState<EligibleStudent[]>([]);
  const [records, setRecords] = useState<Record<string, StudentRecord>>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const regData = await apiClient.get(`api/v1/attendance/registers/${registerId}`) as RegisterData;
        setRegister(regData);

        const initialRecords: Record<string, StudentRecord> = {};
        if (Array.isArray(regData.records) && regData.records.length > 0) {
          regData.records.forEach((r: any) => {
            initialRecords[r.studentId] = {
              status: r.status,
              reason: r.reason || '',
              notes: r.notes || ''
            };
          });
        }
        setRecords(initialRecords);

        // Fetch eligible students to build the table
        const queryParams = new URLSearchParams({
          classId: regData.classId,
          date: regData.date.split('T')[0],
        });
        if (regData.armId) {
          queryParams.append('armId', regData.armId);
        }
        const eligibleData = await apiClient.get(`api/v1/attendance/eligible-students?${queryParams.toString()}`) as EligibleStudent[];
        setStudents(eligibleData || []);

      } catch (err: unknown) {
        const error = err as Error;
        setError(error.message || 'Failed to load register data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [registerId]);

  const handleStatusChange = (studentId: string, status: string) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        reason: status === 'EXCUSED' ? prev[studentId]?.reason || '' : ''
      }
    }));
  };

  const handleReasonChange = (studentId: string, reason: string) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        reason
      }
    }));
  };

  const handleSave = async () => {
    if (!register) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payloadRecords = Object.entries(records).map(([studentId, data]) => ({
      studentId,
      status: data.status,
      reason: data.reason || undefined,
      notes: data.notes || undefined
    })).filter(r => r.status); // Only send if status is selected

    const payload = {
      academicYearId: register.academicYearId,
      termId: register.termId,
      classId: register.classId,
      armId: register.armId,
      date: register.date.split('T')[0],
      records: payloadRecords
    };

    try {
      await apiClient.post('api/v1/attendance/registers/bulk', payload);
      setSuccess('Draft saved successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!register) return;
    
    // Quick validation before finalization
    const missing = students.filter(s => !records[s.studentId]?.status);
    if (missing.length > 0) {
      setError(`Cannot finalize: Missing status for ${missing.length} student(s).`);
      return;
    }

    const unexcused = students.filter(s => records[s.studentId]?.status === 'EXCUSED' && !records[s.studentId]?.reason);
    if (unexcused.length > 0) {
      setError(`Cannot finalize: Missing reason for EXCUSED students.`);
      return;
    }

    if (!confirm('Are you sure you want to finalize this register? This action cannot be undone.')) {
      return;
    }

    setFinalizing(true);
    setError(null);
    setSuccess(null);

    try {
      // Auto-save before finalize just in case
      const payloadRecords = Object.entries(records).map(([studentId, data]) => ({
        studentId,
        status: data.status,
        reason: data.reason || undefined,
        notes: data.notes || undefined
      }));
      await apiClient.post('api/v1/attendance/registers/bulk', {
        academicYearId: register.academicYearId,
        termId: register.termId,
        classId: register.classId,
        armId: register.armId,
        date: register.date.split('T')[0],
        records: payloadRecords
      });

      // Now finalize
      await apiClient.patch(`api/v1/attendance/registers/${registerId}/finalize`);
      setRegister((prev) => prev ? { ...prev, isFinalized: true } : null);
      setSuccess('Register finalized successfully.');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to finalize register.');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading register...</div>;
  if (!register) return <div className="text-red-500">{error || 'Register not found'}</div>;

  const isFinalized = register.isFinalized;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Attendance Register</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(register.date).toLocaleDateString()} &middot; Class: {register.classId} {register.armId && `(Arm: ${register.armId})`}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push('/dashboard/attendance')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Back
          </button>
          {!isFinalized && (
            <>
              <button
                onClick={handleSave}
                disabled={saving || finalizing}
                className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 border border-transparent rounded-md hover:bg-indigo-200"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={handleFinalize}
                disabled={saving || finalizing}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700"
              >
                {finalizing ? 'Finalizing...' : 'Finalize'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-4 border border-green-200">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {isFinalized && (
        <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
          <p className="text-sm text-blue-700 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
            This register has been finalized and cannot be modified.
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">Reason (If Excused)</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {students.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No eligible students found for this class on this date.</td>
              </tr>
            ) : (
              students.map((student) => {
                const rec = records[student.studentId] || {};
                const currentStatus = rec.status || '';
                
                return (
                  <tr key={student.studentId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {student.lastName}, {student.firstName}
                      </div>
                      <div className="text-sm text-gray-500">{student.studentNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={currentStatus}
                        onChange={(e) => handleStatusChange(student.studentId, e.target.value)}
                        disabled={isFinalized}
                        className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          currentStatus === 'PRESENT' ? 'bg-green-50 text-green-700 font-medium' :
                          currentStatus === 'ABSENT' ? 'bg-red-50 text-red-700 font-medium' :
                          currentStatus === 'LATE' ? 'bg-yellow-50 text-yellow-700 font-medium' :
                          currentStatus === 'EXCUSED' ? 'bg-blue-50 text-blue-700 font-medium' : ''
                        }`}
                      >
                        <option value="" disabled>Select Status</option>
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                        <option value="LATE">Late</option>
                        <option value="EXCUSED">Excused</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={rec.reason || ''}
                        onChange={(e) => handleReasonChange(student.studentId, e.target.value)}
                        disabled={isFinalized || currentStatus !== 'EXCUSED'}
                        placeholder={currentStatus === 'EXCUSED' ? "Required reason..." : "N/A"}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => router.push(`/dashboard/attendance/student/${student.studentId}`)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        History
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
