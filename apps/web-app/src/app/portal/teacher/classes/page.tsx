"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import {
  BookOpen,
  Users,
  UserCheck,
  Search,
  Loader2,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

interface TeacherClass {
  classId: string;
  className: string;
  armId?: string;
  armName?: string;
  subjects: string[];
}

interface StudentItem {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: string;
  armName?: string;
  hasPhoto: boolean;
  photoUrl: string | null;
}

export default function TeacherClassesPage() {
  const [classesList, setClassesList] = useState<TeacherClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadClasses() {
      try {
        setLoading(true);
        setError(null);
        const res: any = await apiClient.get("api/v1/portal/teacher/classes");
        setClassesList(res || []);
      } catch (err: any) {
        setError(err.message || "Failed to load assigned classes");
      } finally {
        setLoading(false);
      }
    }
    loadClasses();
  }, []);

  const handleSelectClass = async (cls: TeacherClass) => {
    setSelectedClass(cls);
    setStudentsLoading(true);
    setError(null);

    try {
      let url = `api/v1/portal/teacher/classes/${cls.classId}/students`;
      if (cls.armId) url += `?armId=${cls.armId}`;
      const res: any = await apiClient.get(url);
      setStudents(res || []);
    } catch (err: any) {
      setError(err.message || "Failed to load student roster for class");
    } finally {
      setStudentsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#D2AD36]" />
        <p className="text-sm font-medium">Loading Assigned Classes...</p>
      </div>
    );
  }

  if (error && !selectedClass) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const filteredStudents = students.filter((s) => {
    const term = search.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(term) ||
      s.lastName.toLowerCase().includes(term) ||
      s.studentNumber.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <BookOpen className="h-7 w-7 text-[#D2AD36]" />
            Assigned Classes & Student Rosters
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            View student rosters and class details for your assigned teaching arms.
          </p>
        </div>

        {selectedClass && (
          <button
            onClick={() => setSelectedClass(null)}
            className="px-4 py-2 bg-[#1E3A5F] hover:bg-[#2A4D7C] text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4 text-[#D2AD36]" />
            Back to Classes List
          </button>
        )}
      </div>

      {!selectedClass ? (
        /* Class Selection Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classesList.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 space-y-2 bg-[#0A192E]/90 border border-[#1E3A5F] rounded-3xl">
              <BookOpen className="h-10 w-10 text-slate-600 mx-auto" />
              <p className="text-sm font-medium">No assigned classes found for your profile.</p>
            </div>
          ) : (
            classesList.map((cls, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectClass(cls)}
                className="bg-[#0A192E]/90 border border-[#1E3A5F] hover:border-[#D2AD36] rounded-3xl p-6 shadow-xl cursor-pointer transition group space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[#1E3A5F] pb-3">
                  <span className="text-lg font-bold text-white group-hover:text-[#D2AD36] transition">
                    {cls.className} {cls.armName ? `(${cls.armName})` : ""}
                  </span>
                  <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-[#D2AD36] group-hover:translate-x-1 transition" />
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Taught Subjects
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {cls.subjects.map((sub, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2.5 py-1 rounded-lg bg-[#070B14] border border-[#1E3A5F] text-[#D2AD36] text-xs font-semibold"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <span className="text-xs font-bold text-[#D2AD36] group-hover:underline">
                    View Student Roster &rarr;
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Selected Class Roster View */
        <div className="bg-[#0A192E]/90 border border-[#1E3A5F] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E3A5F] pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-[#D2AD36]" />
                Roster for {selectedClass.className} {selectedClass.armName ? `(${selectedClass.armName})` : ""}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Total Enrolled Active Students:{" "}
                <span className="text-[#D2AD36] font-bold">{students.length}</span>
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roster..."
                className="w-full pl-9 pr-4 py-2 bg-[#070B14] border border-[#1E3A5F] rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-[#D2AD36]"
              />
            </div>
          </div>

          {studentsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#D2AD36]" />
              <p className="text-xs font-medium">Loading student roster...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <UserCheck className="h-10 w-10 text-slate-600 mx-auto" />
              <p className="text-sm font-medium">No students found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="p-4 rounded-2xl bg-[#070B14] border border-[#1E3A5F] flex items-center gap-4 hover:border-[#D2AD36]/50 transition"
                >
                  {student.hasPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={student.photoUrl || `/api/v1/students/${student.id}/photo`}
                      alt={`${student.firstName} Avatar`}
                      className="w-12 h-12 rounded-full object-cover border border-[#D2AD36]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#1E3A5F] text-[#D2AD36] font-bold flex items-center justify-center text-sm border border-[#D2AD36]/30">
                      {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                    </div>
                  )}

                  <div className="overflow-hidden">
                    <h3 className="font-bold text-white text-sm truncate">
                      {student.lastName}, {student.firstName}
                    </h3>
                    <p className="text-[11px] font-mono text-[#D2AD36]">{student.studentNumber}</p>
                    <span className="text-[10px] text-slate-400 capitalize">{student.gender.toLowerCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
