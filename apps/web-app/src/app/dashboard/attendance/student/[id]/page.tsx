"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';

interface AttendanceHistoryRecord {
  id: string;
  status: string;
  reason: string | null;
  notes: string | null;
  register?: {
    date: string;
    classId: string;
    armId: string | null;
  };
}

export default function StudentAttendanceHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [data, setData] = useState<AttendanceHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiClient.get(`api/v1/attendance/students/${studentId}`) as AttendanceHistoryRecord[];
        setData(res || []);
      } catch (err: unknown) {
        const error = err as Error;
        setError(error.message || 'Failed to load student attendance history.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [studentId]);

  const columns: Column<AttendanceHistoryRecord>[] = [
    { 
      header: 'Date', 
      accessor: (item) => item.register?.date ? new Date(item.register.date).toLocaleDateString() : 'N/A' 
    },
    { 
      header: 'Class', 
      accessor: (item) => item.register?.classId || 'N/A' 
    },
    { 
      header: 'Arm', 
      accessor: (item) => item.register?.armId || '-' 
    },
    { 
      header: 'Status', 
      accessor: (item) => {
        let colorClass = 'bg-gray-100 text-gray-800';
        if (item.status === 'PRESENT') colorClass = 'bg-green-100 text-green-800';
        if (item.status === 'ABSENT') colorClass = 'bg-red-100 text-red-800';
        if (item.status === 'LATE') colorClass = 'bg-yellow-100 text-yellow-800';
        if (item.status === 'EXCUSED') colorClass = 'bg-blue-100 text-blue-800';
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
            {item.status}
          </span>
        );
      }
    },
    { 
      header: 'Reason', 
      accessor: (item) => item.reason || '-' 
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Student Attendance History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View complete attendance records for this student.</p>
        </div>
        <div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Back
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <DataTable
            data={data}
            columns={columns}
            loading={loading}
            emptyMessage="No attendance history found for this student."
          />
        </div>
      )}
    </div>
  );
}
