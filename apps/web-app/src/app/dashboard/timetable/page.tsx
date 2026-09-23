"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { apiClient } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';

const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

interface AcademicYear { id: string; name: string; }
interface Term { id: string; name: string; academicYearId: string; }
interface Class { id: string; name: string; }
interface Arm { id: string; name: string; classId: string; }
interface Subject { id: string; name: string; }
interface Staff { id: string; firstName: string; lastName: string; }
interface Period { id: string; name: string; startTime: string; endTime: string; isBreak: boolean; }
interface TimetableEntry { id: string; periodId: string; dayOfWeek: string; subject?: Subject; teacher?: Staff; armId?: string; }

export default function TimetablePage() {
  const { schoolId, tenantId } = useWorkspace();
  
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [arms, setArms] = useState<Arm[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  
  const [academicYearId, setAcademicYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [armId, setArmId] = useState('');
  
  const [periods, setPeriods] = useState<Period[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New Period Form
  const [newPeriodName, setNewPeriodName] = useState('');
  const [newPeriodStart, setNewPeriodStart] = useState('');
  const [newPeriodEnd, setNewPeriodEnd] = useState('');
  const [newPeriodIsBreak, setNewPeriodIsBreak] = useState(false);

  // New Entry Form
  const [newEntrySubjectId, setNewEntrySubjectId] = useState('');
  const [newEntryTeacherId, setNewEntryTeacherId] = useState('');
  const [newEntryPeriodId, setNewEntryPeriodId] = useState('');
  const [newEntryDayOfWeek, setNewEntryDayOfWeek] = useState('');

  const fetchReferenceData = useCallback(async () => {
    try {
      const [ayRes, termsRes, classesRes, armsRes, subRes, staffRes] = await Promise.all([
        apiClient.get('/api/v1/academics/academic-years'),
        apiClient.get('/api/v1/academics/terms'),
        apiClient.get('/api/v1/academics/classes'),
        apiClient.get('/api/v1/academics/arms'),
        apiClient.get('/api/v1/academics/subjects'),
        apiClient.get('/api/v1/staff')
      ]);
      setAcademicYears((ayRes as AcademicYear[]) || []);
      setTerms((termsRes as Term[]) || []);
      setClasses((classesRes as Class[]) || []);
      setArms((armsRes as Arm[]) || []);
      setSubjects((subRes as Subject[]) || []);
      setStaff((staffRes as Staff[]) || []);
    } catch (e: any /* eslint-disable-line */) {
      console.error(e);
      setError("Failed to load reference data.");
    }
  }, []);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  const fetchTimetable = async () => {
    if (!academicYearId || !termId || !classId) {
      setError("Please select Academic Year, Term, and Class to load timetable.");
      return;
    }
    setError(null);
    try {
      const [periodsRes, timetableRes] = await Promise.all([
        apiClient.get(`/api/v1/academics/timetable/periods/${academicYearId}`),
        apiClient.get(`/api/v1/academics/timetable/class/${academicYearId}/${termId}/${classId}${armId ? `?armId=${armId}` : ''}`)
      ]);
      setPeriods((periodsRes as Period[]) || []);
      setTimetable((timetableRes as TimetableEntry[]) || []);
    } catch (e: any /* eslint-disable-line */) {
      setError((Array.isArray(e.data?.message) ? e.data.message.join(', ') : e.data?.message) || "Failed to load timetable.");
    }
  };

  const handleCreatePeriod = async () => {
    if (!academicYearId) return setError("Select Academic Year first.");
    try {
      setError(null);
      await apiClient.post('/api/v1/academics/timetable/periods', {
        academicYearId,
        name: newPeriodName,
        startTime: newPeriodStart,
        endTime: newPeriodEnd,
        isBreak: newPeriodIsBreak
      });
      setSuccess("Period created successfully.");
      setNewPeriodName('');
      setNewPeriodStart('');
      setNewPeriodEnd('');
      fetchTimetable(); // Reload
    } catch (e: any /* eslint-disable-line */) {
      setError((Array.isArray(e.data?.message) ? e.data.message.join(', ') : e.data?.message) || "Failed to create period.");
    }
  };

  const handleCreateEntry = async () => {
    try {
      setError(null);
      await apiClient.post('/api/v1/academics/timetable/entries', {
        academicYearId,
        termId,
        classId,
        armId: armId || undefined,
        subjectId: newEntrySubjectId,
        teacherId: newEntryTeacherId || undefined,
        periodId: newEntryPeriodId,
        dayOfWeek: newEntryDayOfWeek
      });
      setSuccess("Timetable entry added successfully.");
      fetchTimetable();
    } catch (e: any /* eslint-disable-line */) {
      setError((Array.isArray(e.data?.message) ? e.data.message.join(', ') : e.data?.message) || "Failed to add timetable entry.");
    }
  };

  const filteredArms = arms.filter(a => a.classId === classId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Timetable Management</h1>
      </div>
      
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-4 rounded-md border border-green-200">{success}</div>}
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">1. Select Context</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Academic Year</label>
            <select className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={academicYearId} onChange={e => setAcademicYearId(e.target.value)}>
              <option value="">Select...</option>
              {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Term</label>
            <select className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={termId} onChange={e => setTermId(e.target.value)}>
              <option value="">Select...</option>
              {terms.filter(t => t.academicYearId === academicYearId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Class</label>
            <select className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">Select...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Arm (Optional)</label>
            <select className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={armId} onChange={e => setArmId(e.target.value)} disabled={!classId}>
              <option value="">All Arms (Class-wide)</option>
              {filteredArms.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <button onClick={fetchTimetable} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-medium transition-colors">
            Load Timetable
          </button>
        </div>
      </div>

      {(academicYearId && termId && classId) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">Add Period</h2>
              <div className="space-y-4">
                <input type="text" placeholder="Name (e.g. Period 1)" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newPeriodName} onChange={e => setNewPeriodName(e.target.value)} />
                <div className="flex gap-2">
                  <input type="time" placeholder="Start (HH:mm)" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newPeriodStart} onChange={e => setNewPeriodStart(e.target.value)} />
                  <input type="time" placeholder="End (HH:mm)" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newPeriodEnd} onChange={e => setNewPeriodEnd(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 dark:text-white">
                  <input type="checkbox" checked={newPeriodIsBreak} onChange={e => setNewPeriodIsBreak(e.target.checked)} />
                  Is Break / Assembly
                </label>
                <button onClick={handleCreatePeriod} className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded transition-colors">Add Period</button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">Assign Subject</h2>
              <div className="space-y-4">
                <select className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newEntrySubjectId} onChange={e => setNewEntrySubjectId(e.target.value)}>
                  <option value="">Select Subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newEntryTeacherId} onChange={e => setNewEntryTeacherId(e.target.value)}>
                  <option value="">Select Teacher (Optional)...</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                </select>
                <select className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newEntryDayOfWeek} onChange={e => setNewEntryDayOfWeek(e.target.value)}>
                  <option value="">Select Day...</option>
                  {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newEntryPeriodId} onChange={e => setNewEntryPeriodId(e.target.value)}>
                  <option value="">Select Period...</option>
                  {periods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.startTime}-{p.endTime})</option>)}
                </select>
                <button onClick={handleCreateEntry} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded transition-colors">Add to Timetable</button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Class Timetable</h2>
            {periods.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No periods defined for this academic year.</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border dark:border-gray-700 p-2 text-left bg-gray-50 dark:bg-gray-900 dark:text-white">Time</th>
                    {DAYS_OF_WEEK.map(d => <th key={d} className="border dark:border-gray-700 p-2 text-center bg-gray-50 dark:bg-gray-900 dark:text-white">{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {periods.map(period => (
                    <tr key={period.id}>
                      <td className="border dark:border-gray-700 p-2 font-medium bg-gray-50 dark:bg-gray-900 dark:text-white whitespace-nowrap">
                        {period.name}<br/><span className="text-xs text-gray-500 dark:text-gray-400">{period.startTime} - {period.endTime}</span>
                      </td>
                      {period.isBreak ? (
                        <td colSpan={5} className="border dark:border-gray-700 p-2 text-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 tracking-widest uppercase">
                          Break
                        </td>
                      ) : (
                        DAYS_OF_WEEK.map(day => {
                          const entries = timetable.filter(t => t.periodId === period.id && t.dayOfWeek === day);
                          return (
                            <td key={day} className="border dark:border-gray-700 p-2 align-top h-24 min-w-[120px]">
                              {entries.map(entry => (
                                <div key={entry.id} className={`p-2 mb-2 rounded text-xs border ${entry.armId ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800' : 'bg-purple-50 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800'}`}>
                                  <div className="font-semibold text-gray-900 dark:text-white">{entry.subject?.name}</div>
                                  {entry.teacher && <div className="text-gray-600 dark:text-gray-400 truncate">{entry.teacher.firstName}</div>}
                                  {!entry.armId && <div className="mt-1 text-[10px] font-medium text-purple-600 dark:text-purple-400">Class-wide</div>}
                                </div>
                              ))}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
