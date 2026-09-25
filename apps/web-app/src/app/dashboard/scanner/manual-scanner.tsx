"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useManualMovementQueue } from "@/lib/hooks/use-manual-movement-queue";

type OperationMode = "ARRIVAL" | "DEPARTURE";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  status: string;
}

interface Guardian {
  id: string;
  firstName: string;
  lastName: string;
}

export function ManualScanner({ operationMode }: { operationMode: OperationMode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loadingGuardians, setLoadingGuardians] = useState(false);
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: "SUCCESS" | "QUEUED" | "ERROR", message: string } | null>(null);

  const { recordManualAction } = useManualMovementQueue();

  useEffect(() => {
    // reset state on mode change
    setSearchTerm("");
    setSelectedStudent(null);
    setSelectedGuardian(null);
    setResult(null);
  }, [operationMode]);

  useEffect(() => {
    if (!debouncedSearch) {
      setStudents([]);
      return;
    }

    const fetchStudents = async () => {
      setLoadingSearch(true);
      try {
        const response = await apiClient.get(`/api/v1/students?search=${encodeURIComponent(debouncedSearch)}`);
        setStudents(Array.isArray(response) ? response : []);
      } catch (err) {
        console.error("Failed to search students", err);
      } finally {
        setLoadingSearch(false);
      }
    };

    fetchStudents();
  }, [debouncedSearch]);

  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setSearchTerm("");
    setResult(null);

    if (operationMode === "DEPARTURE") {
      setLoadingGuardians(true);
      try {
        const response = await apiClient.get(`/api/v1/students/${student.id}/guardians`);
        const responseData = Array.isArray(response) ? response : [];
        const guardiansList = responseData.map((sg: any) => sg.guardian);
        setGuardians(guardiansList);
      } catch (err) {
        console.error("Failed to fetch guardians", err);
      } finally {
        setLoadingGuardians(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedStudent) return;
    if (operationMode === "DEPARTURE" && !selectedGuardian) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const studentName = `${selectedStudent.firstName} ${selectedStudent.lastName}`;
      const guardianName = selectedGuardian ? `${selectedGuardian.firstName} ${selectedGuardian.lastName}` : undefined;

      const { syncStatus } = await recordManualAction(
        operationMode,
        selectedStudent.id,
        studentName,
        selectedGuardian?.id,
        guardianName
      );

      if (syncStatus === "SYNCED") {
        setResult({ type: "SUCCESS", message: `${operationMode === "ARRIVAL" ? "Arrival" : "Departure"} recorded successfully.` });
      } else {
        setResult({ type: "QUEUED", message: "Saved Offline — Pending Server Verification." });
      }

      // Clear selection after a delay
      setTimeout(() => {
        setSelectedStudent(null);
        setSelectedGuardian(null);
        setResult(null);
      }, 5000);
    } catch (err: any) {
      setResult({ type: "ERROR", message: err.message || "Failed to record manual movement" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto text-left flex flex-col gap-4">
      {result && (
        <div className={`p-4 rounded-xl border ${
          result.type === "SUCCESS" ? "bg-green-50 border-green-200 text-green-800" :
          result.type === "QUEUED" ? "bg-amber-50 border-amber-200 text-amber-800" :
          "bg-red-50 border-red-200 text-red-800"
        }`}>
          <div className="font-semibold text-lg">{result.type === "SUCCESS" ? "Success" : result.type === "QUEUED" ? "Offline Queue" : "Error"}</div>
          <p>{result.message}</p>
        </div>
      )}

      {!selectedStudent ? (
        <div className="flex flex-col gap-2 relative">
          <label className="font-semibold text-gray-700 dark:text-gray-300">Search Student</label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:border-brand-navy focus:ring-2 focus:ring-brand-navy rounded-lg outline-none transition-all dark:text-white"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {loadingSearch && <div className="absolute top-12 right-4 text-sm text-gray-400">Searching...</div>}
          
          {students.length > 0 && searchTerm && (
            <div className="absolute top-[80px] left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
              {students.map(s => (
                <div 
                  key={s.id} 
                  className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b last:border-0 border-gray-100 dark:border-gray-700 flex justify-between items-center"
                  onClick={() => handleSelectStudent(s)}
                >
                  <span className="font-medium dark:text-white">{s.firstName} {s.lastName}</span>
                  <span className="text-sm text-gray-500">{s.studentNumber}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-500">Selected Student</div>
              <div className="font-semibold text-lg dark:text-white">{selectedStudent.firstName} {selectedStudent.lastName}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{selectedStudent.studentNumber}</div>
            </div>
            {!isSubmitting && !result && (
              <button 
                onClick={() => { setSelectedStudent(null); setSelectedGuardian(null); }}
                className="text-sm text-blue-600 hover:underline"
              >
                Change
              </button>
            )}
          </div>

          {operationMode === "DEPARTURE" && (
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-gray-700 dark:text-gray-300">Select Guardian Present</label>
              {loadingGuardians ? (
                <div className="p-4 text-gray-500">Loading authorized guardians...</div>
              ) : guardians.length === 0 ? (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
                  No guardians linked to this student.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {guardians.map(g => (
                    <div 
                      key={g.id}
                      onClick={() => !isSubmitting && !result && setSelectedGuardian(g)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedGuardian?.id === g.id 
                          ? "bg-brand-navy border-brand-navy text-white shadow-md" 
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-brand-navy/50 dark:text-white"
                      }`}
                    >
                      {g.firstName} {g.lastName}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!result && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (operationMode === "DEPARTURE" && !selectedGuardian)}
              className="mt-4 w-full py-4 rounded-xl font-bold text-white bg-brand-navy hover:bg-brand-navy/90 disabled:opacity-50 transition-all shadow-lg"
            >
              {isSubmitting ? "Recording..." : `Record Manual ${operationMode === "ARRIVAL" ? "Arrival" : "Departure"}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
