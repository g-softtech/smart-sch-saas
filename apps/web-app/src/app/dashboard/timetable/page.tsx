"use client";

import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { apiClient } from '@/lib/api-client';

export default function TimetablePage() {
  const { schoolId, tenantId } = useWorkspace();
  const [academicYearId, setAcademicYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  
  // Minimal frontend as requested
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Timetable Management</h1>
      
      <div className="grid gap-4 mb-8 p-4 border rounded shadow-sm bg-white">
        <h2 className="text-xl font-semibold">Context Selection</h2>
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Academic Year ID" 
            value={academicYearId} 
            onChange={(e) => setAcademicYearId(e.target.value)}
            className="border p-2 rounded"
          />
          <input 
            type="text" 
            placeholder="Term ID" 
            value={termId} 
            onChange={(e) => setTermId(e.target.value)}
            className="border p-2 rounded"
          />
          <input 
            type="text" 
            placeholder="Class ID" 
            value={classId} 
            onChange={(e) => setClassId(e.target.value)}
            className="border p-2 rounded"
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Load Timetable
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="border p-4 rounded shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-2">Period Management</h2>
          <p className="text-gray-500 mb-4">Create new periods (e.g. Period 1, Break) scoped to Academic Year.</p>
          <button className="bg-green-600 text-white px-4 py-2 rounded">
            + Add Period
          </button>
        </div>

        <div className="border p-4 rounded shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-2">Timetable Grid</h2>
          <p className="text-gray-500">Select context to view grid. Manage Subject/Teacher assignments here.</p>
          <div className="mt-4 p-8 border-dashed border-2 text-center text-gray-400">
            No entries loaded. Select context above.
          </div>
        </div>
      </div>
    </div>
  );
}
