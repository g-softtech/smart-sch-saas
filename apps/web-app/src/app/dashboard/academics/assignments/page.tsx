"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  UserCheck,
  BookOpen,
  Calendar,
  Layers,
  Plus,
  Trash2,
  PowerOff,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Info,
  X,
  Search,
} from "lucide-react";

interface AcademicYear {
  id: string;
  name: string;
}

interface Term {
  id: string;
  name: string;
  academicYearId?: string;
}

interface ClassItem {
  id: string;
  name: string;
}

interface ArmItem {
  id: string;
  name: string;
  classId: string;
}

interface SubjectItem {
  id: string;
  name: string;
}

interface StaffProfile {
  id: string;
  firstName: string;
  lastName: string;
  staffNumber: string;
  type: string;
  status: string;
}

interface SubjectAssignment {
  id: string;
  tenantId: string;
  schoolId: string;
  academicYearId: string;
  academicYear?: { id: string; name: string };
  termId: string;
  term?: { id: string; name: string };
  classId: string;
  class?: { id: string; name: string };
  armId: string | null;
  arm?: { id: string; name: string } | null;
  subjectId: string;
  subject?: { id: string; name: string };
  teacherId: string;
  teacher?: { id: string; firstName: string; lastName: string; staffNumber: string };
  scope: "CLASS_WIDE" | "ARM_SPECIFIC";
  isPrimary: boolean;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

interface ClassTeacherAssignment {
  id: string;
  tenantId: string;
  schoolId: string;
  academicYearId: string;
  academicYear?: { id: string; name: string };
  termId: string;
  term?: { id: string; name: string };
  classId: string;
  class?: { id: string; name: string };
  armId: string | null;
  arm?: { id: string; name: string } | null;
  teacherId: string;
  teacher?: { id: string; firstName: string; lastName: string; staffNumber: string };
  scope: "CLASS_WIDE" | "ARM_SPECIFIC";
  isPrimary: boolean;
  createdAt: string;
}

export default function TeacherAssignmentsManagementPage() {
  const [activeSubTab, setActiveSubTab] = useState<"subject" | "class">("subject");

  // Reference Data
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [arms, setArms] = useState<ArmItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);

  // Filter States
  const [filterYearId, setFilterYearId] = useState("");
  const [filterTermId, setFilterTermId] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [filterArmId, setFilterArmId] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("");

  // Data List States
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([]);
  const [classTeacherAssignments, setClassTeacherAssignments] = useState<ClassTeacherAssignment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals
  const [isAssignSubjectModalOpen, setIsAssignSubjectModalOpen] = useState(false);
  const [isAssignClassModalOpen, setIsAssignClassModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State — Subject Assignment
  const [subjectForm, setSubjectForm] = useState({
    academicYearId: "",
    termId: "",
    classId: "",
    armId: "",
    subjectId: "",
    teacherId: "",
    scope: "CLASS_WIDE" as "CLASS_WIDE" | "ARM_SPECIFIC",
    isPrimary: true,
  });

  // Form State — Class Teacher Assignment
  const [classForm, setClassForm] = useState({
    academicYearId: "",
    termId: "",
    classId: "",
    armId: "",
    teacherId: "",
    scope: "CLASS_WIDE" as "CLASS_WIDE" | "ARM_SPECIFIC",
    isPrimary: true,
  });

  // Load Reference Data
  useEffect(() => {
    async function loadRefData() {
      try {
        const [yRes, tRes, cRes, aRes, sRes, stRes] = await Promise.all([
          apiClient.get<AcademicYear[]>("/api/v1/academics/academic-years"),
          apiClient.get<Term[]>("/api/v1/academics/terms"),
          apiClient.get<ClassItem[]>("/api/v1/academics/classes"),
          apiClient.get<ArmItem[]>("/api/v1/academics/arms"),
          apiClient.get<SubjectItem[]>("/api/v1/academics/subjects"),
          apiClient.get<any>("/api/v1/staff?limit=200"),
        ]);

        setAcademicYears(yRes || []);
        setTerms(tRes || []);
        setClasses(cRes || []);
        setArms(aRes || []);
        setSubjects(sRes || []);

        const staffData = Array.isArray(stRes) ? stRes : stRes?.data || [];
        setStaffList(staffData.filter((st: StaffProfile) => st.status === "ACTIVE"));
      } catch (err: any) {
        setError("Failed to load reference data for teacher assignments.");
      }
    }
    loadRefData();
  }, []);

  // Fetch Assignments Data
  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeSubTab === "subject") {
        const params = new URLSearchParams();
        if (filterYearId) params.append("academicYearId", filterYearId);
        if (filterTermId) params.append("termId", filterTermId);
        if (filterClassId) params.append("classId", filterClassId);
        if (filterArmId) params.append("armId", filterArmId);
        if (filterSubjectId) params.append("subjectId", filterSubjectId);
        if (filterTeacherId) params.append("teacherId", filterTeacherId);

        const query = params.toString() ? `?${params.toString()}` : "";
        const res = await apiClient.get<SubjectAssignment[]>(
          `/api/v1/academics/teacher-subject-assignments${query}`
        );
        setSubjectAssignments(res || []);
      } else {
        const params = new URLSearchParams();
        if (filterYearId) params.append("academicYearId", filterYearId);
        if (filterTermId) params.append("termId", filterTermId);
        if (filterClassId) params.append("classId", filterClassId);
        if (filterArmId) params.append("armId", filterArmId);
        if (filterTeacherId) params.append("teacherId", filterTeacherId);

        const query = params.toString() ? `?${params.toString()}` : "";
        const res = await apiClient.get<ClassTeacherAssignment[]>(
          `/api/v1/academics/class-teacher-assignments${query}`
        );
        setClassTeacherAssignments(res || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch teacher assignments.");
    } finally {
      setLoading(false);
    }
  }, [
    activeSubTab,
    filterYearId,
    filterTermId,
    filterClassId,
    filterArmId,
    filterSubjectId,
    filterTeacherId,
  ]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Handle Assign Subject Teacher Submit
  const handleAssignSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !subjectForm.academicYearId ||
      !subjectForm.termId ||
      !subjectForm.classId ||
      !subjectForm.subjectId ||
      !subjectForm.teacherId
    ) {
      setModalError("Please fill in all required assignment fields.");
      return;
    }
    if (subjectForm.scope === "ARM_SPECIFIC" && !subjectForm.armId) {
      setModalError("ARM_SPECIFIC scope requires selecting an Arm.");
      return;
    }

    try {
      setModalLoading(true);
      setModalError(null);
      setActionError(null);

      const payload = {
        academicYearId: subjectForm.academicYearId,
        termId: subjectForm.termId,
        classId: subjectForm.classId,
        armId: subjectForm.scope === "CLASS_WIDE" ? undefined : subjectForm.armId || undefined,
        subjectId: subjectForm.subjectId,
        teacherId: subjectForm.teacherId,
        scope: subjectForm.scope,
        isPrimary: subjectForm.isPrimary,
      };

      await apiClient.post("/api/v1/academics/teacher-subject-assignments", payload);
      setActionSuccess("Subject teaching assignment created successfully.");
      setIsAssignSubjectModalOpen(false);
      setSubjectForm({
        academicYearId: "",
        termId: "",
        classId: "",
        armId: "",
        subjectId: "",
        teacherId: "",
        scope: "CLASS_WIDE",
        isPrimary: true,
      });
      await fetchAssignments();
    } catch (err: any) {
      setModalError(err.message || "Failed to create subject teaching assignment.");
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Assign Class Teacher Submit
  const handleAssignClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !classForm.academicYearId ||
      !classForm.termId ||
      !classForm.classId ||
      !classForm.teacherId
    ) {
      setModalError("Please fill in all required assignment fields.");
      return;
    }
    if (classForm.scope === "ARM_SPECIFIC" && !classForm.armId) {
      setModalError("ARM_SPECIFIC scope requires selecting an Arm.");
      return;
    }

    try {
      setModalLoading(true);
      setModalError(null);
      setActionError(null);

      const payload = {
        academicYearId: classForm.academicYearId,
        termId: classForm.termId,
        classId: classForm.classId,
        armId: classForm.scope === "CLASS_WIDE" ? undefined : classForm.armId || undefined,
        teacherId: classForm.teacherId,
        scope: classForm.scope,
        isPrimary: classForm.isPrimary,
      };

      await apiClient.post("/api/v1/academics/class-teacher-assignments", payload);
      setActionSuccess("Class/Form teacher assignment created successfully.");
      setIsAssignClassModalOpen(false);
      setClassForm({
        academicYearId: "",
        termId: "",
        classId: "",
        armId: "",
        teacherId: "",
        scope: "CLASS_WIDE",
        isPrimary: true,
      });
      await fetchAssignments();
    } catch (err: any) {
      setModalError(err.message || "Failed to create class teacher assignment.");
    } finally {
      setModalLoading(false);
    }
  };

  // Deactivate Subject Assignment
  const handleDeactivateSubjectAssignment = async (id: string) => {
    if (!window.confirm("Are you sure you want to deactivate this subject teaching assignment?")) return;
    try {
      setActionError(null);
      setActionSuccess(null);
      await apiClient.put(`/api/v1/academics/teacher-subject-assignments/${id}/deactivate`, {});
      setActionSuccess("Subject teaching assignment deactivated successfully.");
      await fetchAssignments();
    } catch (err: any) {
      setActionError(err.message || "Failed to deactivate assignment.");
    }
  };

  // Delete Class Teacher Assignment
  const handleDeleteClassAssignment = async (id: string) => {
    if (!window.confirm("Are you sure you want to revoke this form/class teacher assignment?")) return;
    try {
      setActionError(null);
      setActionSuccess(null);
      await apiClient.delete(`/api/v1/academics/class-teacher-assignments/${id}`);
      setActionSuccess("Form/Class teacher assignment revoked successfully.");
      await fetchAssignments();
    } catch (err: any) {
      setActionError(err.message || "Failed to revoke class teacher assignment.");
    }
  };

  // Filter Arms by selected Class for Form selects
  const filteredFormArms = (selectedClassId: string) => {
    return arms.filter((a) => a.classId === selectedClassId);
  };

  return (
    <div className="space-y-8 animate-fadeIn p-6 sm:p-8 bg-[#070B14] min-h-screen text-slate-100 font-sans">
      {/* Title & Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E3A5F] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-[#D2AD36]" />
            Teacher & Class Assignments
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage subject teaching authority (gradebook score entry) and form/class teacher assignments across academic years and terms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAssignments}
            disabled={loading}
            className="px-3.5 py-2 bg-[#1E3A5F] hover:bg-[#2A4D7C] text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 text-[#D2AD36] ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {activeSubTab === "subject" ? (
            <button
              onClick={() => {
                setModalError(null);
                setIsAssignSubjectModalOpen(true);
              }}
              className="px-4 py-2 bg-[#D2AD36] hover:bg-[#b8952b] text-[#0A192E] text-xs font-extrabold rounded-xl transition flex items-center gap-2 shadow-md"
            >
              <Plus className="h-4 w-4" />
              Assign Subject Teacher
            </button>
          ) : (
            <button
              onClick={() => {
                setModalError(null);
                setIsAssignClassModalOpen(true);
              }}
              className="px-4 py-2 bg-[#D2AD36] hover:bg-[#b8952b] text-[#0A192E] text-xs font-extrabold rounded-xl transition flex items-center gap-2 shadow-md"
            >
              <Plus className="h-4 w-4" />
              Assign Class Teacher
            </button>
          )}
        </div>
      </div>

      {/* Action Banners */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-[#1E3A5F] space-x-4">
        <button
          onClick={() => setActiveSubTab("subject")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition border-b-2 ${
            activeSubTab === "subject"
              ? "border-[#D2AD36] text-[#D2AD36]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Subject Teaching Assignments (Grading Authority)
        </button>

        <button
          onClick={() => setActiveSubTab("class")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition border-b-2 ${
            activeSubTab === "class"
              ? "border-[#D2AD36] text-[#D2AD36]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Form / Class Teacher Assignments (Pastoral Oversight)
        </button>
      </div>

      {/* Domain Difference Info Banner */}
      <div className="p-4 rounded-2xl bg-[#0A192E] border border-[#1E3A5F] text-xs text-slate-300 flex items-start gap-3">
        <Info className="h-5 w-5 text-[#D2AD36] shrink-0 mt-0.5" />
        <div>
          {activeSubTab === "subject" ? (
            <p>
              <strong className="text-white">Subject Teaching Assignment:</strong> Grants the teacher academic and score-entry authority for a subject within a class/arm scope. Only designated <strong>Primary Teachers</strong> (`isPrimary = true`) can execute final gradebook submission for admin approval.
            </p>
          ) : (
            <p>
              <strong className="text-white">Class/Form Teacher Assignment:</strong> Designates pastoral/administrative responsibility for a class or arm. Note: Form teacher assignments carry <strong>ZERO grading authority</strong> unless the staff member is also explicitly assigned a Subject Teaching Assignment for that subject.
            </p>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0A192E] border border-[#1E3A5F] rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#D2AD36] uppercase tracking-wider">
          <Filter className="h-4 w-4" />
          Filter Assignments
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          {/* Year */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Academic Year</label>
            <select
              value={filterYearId}
              onChange={(e) => setFilterYearId(e.target.value)}
              className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          {/* Term */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Term</label>
            <select
              value={filterTermId}
              onChange={(e) => setFilterTermId(e.target.value)}
              className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
            >
              <option value="">All Terms</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Class</label>
            <select
              value={filterClassId}
              onChange={(e) => {
                setFilterClassId(e.target.value);
                setFilterArmId("");
              }}
              className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Arm */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Arm</label>
            <select
              value={filterArmId}
              onChange={(e) => setFilterArmId(e.target.value)}
              disabled={!filterClassId}
              className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36] disabled:opacity-40"
            >
              <option value="">All Arms</option>
              {filteredFormArms(filterClassId).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Subject (Only for Subject Tab) */}
          {activeSubTab === "subject" && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
              <select
                value={filterSubjectId}
                onChange={(e) => setFilterSubjectId(e.target.value)}
                className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Teacher */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Teacher</label>
            <select
              value={filterTeacherId}
              onChange={(e) => setFilterTeacherId(e.target.value)}
              className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
            >
              <option value="">All Staff</option>
              {staffList.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.lastName}, {st.firstName} ({st.staffNumber})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Assignments List Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3 bg-[#0A192E]/60 border border-[#1E3A5F] rounded-3xl">
          <Loader2 className="h-10 w-10 animate-spin text-[#D2AD36]" />
          <p className="text-sm font-medium">Fetching teacher assignments...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <span>{error}</span>
        </div>
      ) : activeSubTab === "subject" ? (
        /* SUBJECT TEACHING ASSIGNMENTS TABLE */
        subjectAssignments.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2 bg-[#0A192E]/60 border border-[#1E3A5F] rounded-3xl">
            <BookOpen className="h-10 w-10 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-white">No subject teaching assignments found.</p>
            <p className="text-xs text-slate-500">Click &quot;Assign Subject Teacher&quot; above to create a new assignment.</p>
          </div>
        ) : (
          <div className="bg-[#0A192E] border border-[#1E3A5F] rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-[#070B14] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#1E3A5F]">
                  <tr>
                    <th className="py-3.5 px-4">#</th>
                    <th className="py-3.5 px-4">Teacher Name</th>
                    <th className="py-3.5 px-4">Subject</th>
                    <th className="py-3.5 px-4">Class / Arm</th>
                    <th className="py-3.5 px-4 text-center">Scope</th>
                    <th className="py-3.5 px-4 text-center">Primary Status</th>
                    <th className="py-3.5 px-4 text-center">State</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E3A5F]/60">
                  {subjectAssignments.map((a, idx) => (
                    <tr key={a.id} className="hover:bg-[#1E3A5F]/30 transition">
                      <td className="py-3.5 px-4 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {a.teacher ? `${a.teacher.lastName}, ${a.teacher.firstName}` : a.teacherId}
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {a.teacher?.staffNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#D2AD36] font-semibold">
                        {a.subject?.name || a.subjectId}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {a.class?.name || a.classId} {a.arm ? `(${a.arm.name})` : ""}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-[#070B14] border border-[#1E3A5F] text-[10px] font-mono font-bold text-slate-300">
                          {a.scope}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            a.isPrimary
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-slate-700/50 text-slate-300"
                          }`}
                        >
                          {a.isPrimary ? "PRIMARY TEACHER" : "CO-TEACHER"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            a.status === "ACTIVE"
                              ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {a.status === "ACTIVE" && (
                          <button
                            onClick={() => handleDeactivateSubjectAssignment(a.id)}
                            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-[11px] rounded-xl transition inline-flex items-center gap-1"
                          >
                            <PowerOff className="h-3.5 w-3.5" />
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* CLASS TEACHER ASSIGNMENTS TABLE */
        classTeacherAssignments.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2 bg-[#0A192E]/60 border border-[#1E3A5F] rounded-3xl">
            <UserCheck className="h-10 w-10 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-white">No form/class teacher assignments found.</p>
            <p className="text-xs text-slate-500">Click &quot;Assign Class Teacher&quot; above to designate a form teacher.</p>
          </div>
        ) : (
          <div className="bg-[#0A192E] border border-[#1E3A5F] rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-[#070B14] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#1E3A5F]">
                  <tr>
                    <th className="py-3.5 px-4">#</th>
                    <th className="py-3.5 px-4">Form Teacher Name</th>
                    <th className="py-3.5 px-4">Class / Arm Scope</th>
                    <th className="py-3.5 px-4 text-center">Scope</th>
                    <th className="py-3.5 px-4 text-center">Primary Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E3A5F]/60">
                  {classTeacherAssignments.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-[#1E3A5F]/30 transition">
                      <td className="py-3.5 px-4 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {c.teacher ? `${c.teacher.lastName}, ${c.teacher.firstName}` : c.teacherId}
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {c.teacher?.staffNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#D2AD36]">
                        {c.class?.name || c.classId} {c.arm ? `(${c.arm.name})` : ""}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-[#070B14] border border-[#1E3A5F] text-[10px] font-mono font-bold text-slate-300">
                          {c.scope}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            c.isPrimary
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-slate-700/50 text-slate-300"
                          }`}
                        >
                          {c.isPrimary ? "PRIMARY FORM TEACHER" : "CO-CLASS TEACHER"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteClassAssignment(c.id)}
                          className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-[11px] rounded-xl transition inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ASSIGN SUBJECT TEACHER MODAL */}
      {isAssignSubjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0A192E] border border-[#1E3A5F] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#1E3A5F] pb-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#D2AD36]" />
                Assign Subject Teacher (Grading Authority)
              </h3>
              <button
                onClick={() => setIsAssignSubjectModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAssignSubjectSubmit} className="space-y-4 text-xs">
              {/* Teacher */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Select Staff Member / Teacher <span className="text-rose-400">*</span>
                </label>
                <select
                  value={subjectForm.teacherId}
                  onChange={(e) => setSubjectForm({ ...subjectForm, teacherId: e.target.value })}
                  required
                  className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
                >
                  <option value="">-- Choose Active Teacher --</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.lastName}, {st.firstName} ({st.staffNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Year & Term */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Academic Year <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={subjectForm.academicYearId}
                    onChange={(e) => setSubjectForm({ ...subjectForm, academicYearId: e.target.value })}
                    required
                    className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
                  >
                    <option value="">-- Select Year --</option>
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Term <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={subjectForm.termId}
                    onChange={(e) => setSubjectForm({ ...subjectForm, termId: e.target.value })}
                    required
                    className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
                  >
                    <option value="">-- Select Term --</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Class & Scope */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Class <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={subjectForm.classId}
                    onChange={(e) => setSubjectForm({ ...subjectForm, classId: e.target.value, armId: "" })}
                    required
                    className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
                  >
                    <option value="">-- Select Class --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Scope <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={subjectForm.scope}
                    onChange={(e) =>
                      setSubjectForm({
                        ...subjectForm,
                        scope: e.target.value as "CLASS_WIDE" | "ARM_SPECIFIC",
                        armId: e.target.value === "CLASS_WIDE" ? "" : subjectForm.armId,
                      })
                    }
                    required
                    className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
                  >
                    <option value="CLASS_WIDE">CLASS_WIDE (All Arms)</option>
                    <option value="ARM_SPECIFIC">ARM_SPECIFIC (Single Arm)</option>
                  </select>
                </div>
              </div>

              {/* Arm (Conditional) */}
              {subjectForm.scope === "ARM_SPECIFIC" && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Arm <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={subjectForm.armId}
                    onChange={(e) => setSubjectForm({ ...subjectForm, armId: e.target.value })}
                    required
                    disabled={!subjectForm.classId}
                    className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36] disabled:opacity-40"
                  >
                    <option value="">-- Select Arm --</option>
                    {filteredFormArms(subjectForm.classId).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Subject <span className="text-rose-400">*</span>
                </label>
                <select
                  value={subjectForm.subjectId}
                  onChange={(e) => setSubjectForm({ ...subjectForm, subjectId: e.target.value })}
                  required
                  className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Primary Teacher Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="subIsPrimary"
                  checked={subjectForm.isPrimary}
                  onChange={(e) => setSubjectForm({ ...subjectForm, isPrimary: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#D2AD36] cursor-pointer"
                />
                <label htmlFor="subIsPrimary" className="text-xs text-slate-200 font-semibold cursor-pointer">
                  Designate as Primary Teacher (authorized for gradebook submission)
                </label>
              </div>

              {/* Submit Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E3A5F]">
                <button
                  type="button"
                  onClick={() => setIsAssignSubjectModalOpen(false)}
                  className="px-4 py-2 bg-[#1E3A5F] text-slate-200 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 bg-[#D2AD36] hover:bg-[#b8952b] text-[#0A192E] font-extrabold text-xs rounded-xl disabled:opacity-50 flex items-center gap-2"
                >
                  {modalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN CLASS TEACHER MODAL */}
      {isAssignClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0A192E] border border-[#1E3A5F] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#1E3A5F] pb-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-[#D2AD36]" />
                Assign Form / Class Teacher (Pastoral Care)
              </h3>
              <button
                onClick={() => setIsAssignClassModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAssignClassSubmit} className="space-y-4 text-xs">
              {/* Teacher */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Select Staff Member / Teacher <span className="text-rose-400">*</span>
                </label>
                <select
                  value={classForm.teacherId}
                  onChange={(e) => setClassForm({ ...classForm, teacherId: e.target.value })}
                  required
                  className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
                >
                  <option value="">-- Choose Active Teacher --</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.lastName}, {st.firstName} ({st.staffNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Year & Term */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Academic Year <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={classForm.academicYearId}
                    onChange={(e) => setClassForm({ ...classForm, academicYearId: e.target.value })}
                    required
                    className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
                  >
                    <option value="">-- Select Year --</option>
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Term <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={classForm.termId}
                    onChange={(e) => setClassForm({ ...classForm, termId: e.target.value })}
                    required
                    className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
                  >
                    <option value="">-- Select Term --</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Class & Scope */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Class <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={classForm.classId}
                    onChange={(e) => setClassForm({ ...classForm, classId: e.target.value, armId: "" })}
                    required
                    className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
                  >
                    <option value="">-- Select Class --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Scope <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={classForm.scope}
                    onChange={(e) =>
                      setClassForm({
                        ...classForm,
                        scope: e.target.value as "CLASS_WIDE" | "ARM_SPECIFIC",
                        armId: e.target.value === "CLASS_WIDE" ? "" : classForm.armId,
                      })
                    }
                    required
                    className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
                  >
                    <option value="CLASS_WIDE">CLASS_WIDE (All Arms)</option>
                    <option value="ARM_SPECIFIC">ARM_SPECIFIC (Single Arm)</option>
                  </select>
                </div>
              </div>

              {/* Arm (Conditional) */}
              {classForm.scope === "ARM_SPECIFIC" && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Arm <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={classForm.armId}
                    onChange={(e) => setClassForm({ ...classForm, armId: e.target.value })}
                    required
                    disabled={!classForm.classId}
                    className="w-full bg-[#070B14] border border-[#1E3A5F] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D2AD36] disabled:opacity-40"
                  >
                    <option value="">-- Select Arm --</option>
                    {filteredFormArms(classForm.classId).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Primary Form Teacher Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="clsIsPrimary"
                  checked={classForm.isPrimary}
                  onChange={(e) => setClassForm({ ...classForm, isPrimary: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#D2AD36] cursor-pointer"
                />
                <label htmlFor="clsIsPrimary" className="text-xs text-slate-200 font-semibold cursor-pointer">
                  Designate as Primary Form Teacher
                </label>
              </div>

              {/* Submit Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E3A5F]">
                <button
                  type="button"
                  onClick={() => setIsAssignClassModalOpen(false)}
                  className="px-4 py-2 bg-[#1E3A5F] text-slate-200 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 bg-[#D2AD36] hover:bg-[#b8952b] text-[#0A192E] font-extrabold text-xs rounded-xl disabled:opacity-50 flex items-center gap-2"
                >
                  {modalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm Form Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
