"use client";

import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function ResultsPage() {
  const { schoolId, tenantId } = useWorkspace();
  const [academicYearId, setAcademicYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  
  // Minimal frontend as requested
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Results & Grading Management</h1>
      
      <div className="grid gap-4 mb-8 p-4 border rounded shadow-sm bg-white">
        <h2 className="text-xl font-semibold">Context Selection</h2>
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Class ID" 
            value={classId} 
            onChange={(e) => setClassId(e.target.value)}
            className="border p-2 rounded w-full"
          />
          <input 
            type="text" 
            placeholder="Term ID" 
            value={termId} 
            onChange={(e) => setTermId(e.target.value)}
            className="border p-2 rounded w-full"
          />
          <input 
            type="text" 
            placeholder="Subject ID" 
            value={subjectId} 
            onChange={(e) => setSubjectId(e.target.value)}
            className="border p-2 rounded w-full"
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded whitespace-nowrap">
            Load Students
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="border p-4 rounded shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-2">Grading Scales</h2>
          <p className="text-gray-500 mb-4">Manage grading policies and grade boundaries (min scores).</p>
          <button className="bg-green-600 text-white px-4 py-2 rounded">
            Manage Scales
          </button>
        </div>

        <div className="border p-4 rounded shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-2">Score Entry</h2>
          <p className="text-gray-500 mb-2">Enter CA / Exam / Assignment scores for students in selected context.</p>
          <div className="mt-4 p-8 border-dashed border-2 text-center text-gray-400">
            Select context to view student enrollments and enter scores.
          </div>
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-500">Status: DRAFT</span>
            <button className="bg-purple-600 text-white px-4 py-2 rounded" disabled>
              Publish Results
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
