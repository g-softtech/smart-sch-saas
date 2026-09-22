"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface AcademicItem {
  id: string;
  name: string;
  academicYearId?: string;
  classId?: string;
}

export default function NewAttendanceRegisterPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [academicYears, setAcademicYears] = useState<AcademicItem[]>([]);
  const [terms, setTerms] = useState<AcademicItem[]>([]);
  const [classes, setClasses] = useState<AcademicItem[]>([]);
  const [arms, setArms] = useState<AcademicItem[]>([]);

  const [form, setForm] = useState({
    academicYearId: '',
    termId: '',
    classId: '',
    armId: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    Promise.all([
      apiClient.get('api/v1/academics/academic-years'),
      apiClient.get('api/v1/academics/terms'),
      apiClient.get('api/v1/academics/classes'),
      apiClient.get('api/v1/academics/arms')
    ]).then(([ayRes, termRes, clsRes, armRes]) => {
      setAcademicYears(ayRes || []);
      setTerms(termRes || []);
      setClasses(clsRes || []);
      setArms(armRes || []);
    }).catch(err => {
      console.error(err);
      setError('Failed to load academic structure data.');
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.academicYearId || !form.termId || !form.classId || !form.date) {
      setError("Please fill all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        academicYearId: form.academicYearId,
        termId: form.termId,
        classId: form.classId,
        date: form.date,
        records: []
      };
      if (form.armId) payload.armId = form.armId;

      const res = await apiClient.post('api/v1/attendance/registers/bulk', payload) as { id: string };
      router.push(`/dashboard/attendance/${res.id}`);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to create draft register.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTerms = terms.filter(t => t.academicYearId === form.academicYearId);
  const filteredArms = arms.filter(a => a.classId === form.classId);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Create Draft Register</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Initialize a new attendance register for a class.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Academic Year *</label>
          <select 
            value={form.academicYearId} 
            onChange={e => setForm({...form, academicYearId: e.target.value, termId: ''})} 
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          >
            <option value="">Select Academic Year</option>
            {academicYears.map(ay => (
              <option key={ay.id} value={ay.id}>{ay.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Term *</label>
          <select 
            value={form.termId} 
            onChange={e => setForm({...form, termId: e.target.value})} 
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
            disabled={!form.academicYearId}
          >
            <option value="">Select Term</option>
            {filteredTerms.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Class *</label>
          <select 
            value={form.classId} 
            onChange={e => setForm({...form, classId: e.target.value, armId: ''})} 
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          >
            <option value="">Select Class</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Arm (Optional)</label>
          <select 
            value={form.armId} 
            onChange={e => setForm({...form, armId: e.target.value})} 
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            disabled={!form.classId}
          >
            <option value="">No specific arm</option>
            {filteredArms.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date *</label>
          <input 
            type="date" 
            value={form.date} 
            onChange={e => setForm({...form, date: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>

        <div className="pt-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
