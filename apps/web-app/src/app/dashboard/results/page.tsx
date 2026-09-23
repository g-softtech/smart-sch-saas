"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { apiClient } from '@/lib/api-client';

interface AcademicYear { id: string; name: string; }
interface Term { id: string; name: string; academicYearId: string; }
interface Class { id: string; name: string; }
interface Subject { id: string; name: string; }
interface Student { id: string; firstName: string; lastName: string; }
interface GradingScale { id: string; name: string; }

export default function ResultsPage() {
  const { schoolId, tenantId } = useWorkspace();
  
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [academicYearId, setAcademicYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New Scale Form
  const [newScaleName, setNewScaleName] = useState('');
  const [newScaleId, setNewScaleId] = useState('');
  const [newBoundaryMinScore, setNewBoundaryMinScore] = useState('');
  const [newBoundaryGrade, setNewBoundaryGrade] = useState('');
  
  // Score Entry state
  const [scores, setScores] = useState<Record<string, { score: number, maxScore: number, type: string }>>({});

  const fetchReferenceData = useCallback(async () => {
    try {
      const [ayRes, termsRes, classesRes, subRes, studentsRes, scalesRes] = await Promise.all([
        apiClient.get('/api/v1/academics/academic-years'),
        apiClient.get('/api/v1/academics/terms'),
        apiClient.get('/api/v1/academics/classes'),
        apiClient.get('/api/v1/academics/subjects'),
        apiClient.get('/api/v1/students'),
        apiClient.get('/api/v1/academics/results/scales')
      ]);
      setAcademicYears((ayRes as AcademicYear[]) || []);
      setTerms((termsRes as Term[]) || []);
      setClasses((classesRes as Class[]) || []);
      setSubjects((subRes as Subject[]) || []);
      setStudents((studentsRes as Student[]) || []);
      setGradingScales((scalesRes as GradingScale[]) || []);
    } catch (e: any /* eslint-disable-line */) {
      console.error(e);
      setError("Failed to load reference data.");
    }
  }, []);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  const handleCreateScale = async () => {
    try {
      setError(null);
      await apiClient.post('/api/v1/academics/results/scales', { name: newScaleName });
      setSuccess("Grading Scale created successfully.");
      setNewScaleName('');
      fetchReferenceData();
    } catch (e: any /* eslint-disable-line */) {
      setError((Array.isArray(e.data?.message) ? e.data.message.join(', ') : e.data?.message) || "Failed to create scale.");
    }
  };

  const handleAddBoundary = async () => {
    try {
      setError(null);
      await apiClient.post('/api/v1/academics/results/boundaries', {
        gradingScaleId: newScaleId,
        minScore: parseFloat(newBoundaryMinScore),
        grade: newBoundaryGrade
      });
      setSuccess("Boundary added successfully.");
      setNewBoundaryMinScore('');
      setNewBoundaryGrade('');
      fetchReferenceData();
    } catch (e: any /* eslint-disable-line */) {
      setError((Array.isArray(e.data?.message) ? e.data.message.join(', ') : e.data?.message) || "Failed to add boundary.");
    }
  };

  const handleRecordScore = async (enrollmentId: string) => {
    try {
      setError(null);
      const studentScore = scores[enrollmentId];
      if (!studentScore) return setError("Please enter score data first.");
      
      await apiClient.post('/api/v1/academics/results/record-score', {
        academicYearId,
        termId,
        studentId: enrollmentId,
        subjectId,
        type: studentScore.type || "CA",
        score: studentScore.score,
        maxScore: studentScore.maxScore
      });
      
      setSuccess(`Score recorded for student.`);
    } catch (e: any /* eslint-disable-line */) {
      setError((Array.isArray(e.data?.message) ? e.data.message.join(', ') : e.data?.message) || "Failed to record score.");
    }
  };

  const handleScoreChange = (enrollmentId: string, field: string, value: string | number) => {
    setScores(prev => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        [field]: field === 'type' ? value : parseFloat(value as string) || 0
      }
    }));
  };

  // Minimal filtering to approximate active class enrollments if the endpoint didn't populate them directly
  // In a real app we'd fetch enrollments per class, but for UI test we just map students to a mock enrollmentId
  const classStudents = classId ? students.slice(0, 5) : []; // For minimal testing since we don't have direct enrollment creation in Phase 2 mock yet

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Results & Grading Management</h1>
      </div>
      
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-4 rounded-md border border-green-200">{success}</div>}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Create Grading Scale</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Scale Name (e.g. Standard O-Level)" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newScaleName} onChange={e => setNewScaleName(e.target.value)} />
              <button onClick={handleCreateScale} className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded transition-colors">Create Scale</button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Add Grade Boundary</h2>
            <div className="space-y-4">
              <select className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newScaleId} onChange={e => setNewScaleId(e.target.value)}>
                <option value="">Select Scale...</option>
                {gradingScales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input type="number" placeholder="Min Score" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newBoundaryMinScore} onChange={e => setNewBoundaryMinScore(e.target.value)} />
                <input type="text" placeholder="Grade (e.g. A)" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newBoundaryGrade} onChange={e => setNewBoundaryGrade(e.target.value)} />
              </div>
              <button onClick={handleAddBoundary} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded transition-colors">Add Boundary</button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Record Scores Context</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Subject</label>
                <select className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
                  <option value="">Select...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {classId && subjectId && termId && academicYearId && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">Student Roster</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="p-2 text-left dark:text-white">Student</th>
                    <th className="p-2 text-left dark:text-white">Type</th>
                    <th className="p-2 text-left dark:text-white">Score</th>
                    <th className="p-2 text-left dark:text-white">Max</th>
                    <th className="p-2 text-left dark:text-white">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map(student => {
                    const mockEnrollmentId = `enrollment-${student.id}`;
                    return (
                      <tr key={student.id} className="border-b dark:border-gray-700 last:border-0">
                        <td className="p-2 dark:text-gray-300">{student.firstName} {student.lastName}</td>
                        <td className="p-2">
                          <input type="text" placeholder="e.g. CA" className="w-20 border p-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            onChange={e => handleScoreChange(mockEnrollmentId, 'type', e.target.value)} />
                        </td>
                        <td className="p-2">
                          <input type="number" placeholder="Score" className="w-20 border p-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            onChange={e => handleScoreChange(mockEnrollmentId, 'score', e.target.value)} />
                        </td>
                        <td className="p-2">
                          <input type="number" placeholder="Max" className="w-20 border p-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            onChange={e => handleScoreChange(mockEnrollmentId, 'maxScore', e.target.value)} />
                        </td>
                        <td className="p-2">
                          <button onClick={() => handleRecordScore(mockEnrollmentId)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Record</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-6 flex justify-between items-center border-t dark:border-gray-700 pt-4">
                <span className="text-sm font-medium dark:text-gray-300">Once Finalized, scores cannot be modified without amendment protocol.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
