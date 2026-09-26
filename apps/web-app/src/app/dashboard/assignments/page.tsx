"use client";

import React, { useState, useEffect, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { apiClient } from "@/lib/api-client";
import {
  useAcademicYears,
  useTerms,
  useClasses,
  useArms,
  useSubjects,
  useClassRoster,
  studentDisplayName,
} from "@/hooks/useFinanceSelectors";

export default function AssignmentsPage() {
  const [activeTab, setActiveTab] = useState<"list" | "create" | "submissions">("list");

  // Academic Context Selectors
  const { data: years } = useAcademicYears();
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const { data: terms } = useTerms(selectedYearId || null);
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const { data: classes } = useClasses();
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const { data: arms } = useArms(selectedClassId || null);
  const [selectedArmId, setSelectedArmId] = useState<string>("");
  const { data: subjects } = useSubjects();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  // Assignments List State
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Form State for Creating Assignment
  const [form, setForm] = useState<{
    title: string;
    description: string;
    dueDate: Date | null;
    maxScore: number;
  }>({
    title: "",
    description: "",
    dueDate: null,
    maxScore: 100,
  });
  const [savingForm, setSavingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Submissions View & Grading State
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [gradingModal, setGradingModal] = useState<{
    studentId: string;
    studentName: string;
    score: number;
    feedback: string;
  } | null>(null);
  const [savingGrade, setSavingGrade] = useState(false);

  // Student Submission Testing State
  const [submitModal, setSubmitModal] = useState<{
    assignmentId: string;
    textContent: string;
  } | null>(null);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);

  // Auto-select defaults
  useEffect(() => {
    if (years.length > 0 && !selectedYearId) setSelectedYearId(years[0].id);
  }, [years, selectedYearId]);

  useEffect(() => {
    if (terms.length > 0 && !selectedTermId) setSelectedTermId(terms[0].id);
  }, [terms, selectedTermId]);

  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) setSelectedClassId(classes[0].id);
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) setSelectedSubjectId(subjects[0].id);
  }, [subjects, selectedSubjectId]);

  // Fetch Assignments for Selected Class
  const fetchAssignments = useCallback(async () => {
    if (!selectedClassId) return;
    setLoadingList(true);
    setListError(null);
    try {
      let url = `api/v1/assignments/class/${selectedClassId}`;
      if (selectedArmId) url += `?armId=${selectedArmId}`;
      const data = await apiClient.get(url) as any[];
      setAssignments(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setListError(e.message || "Failed to load assignments");
    } finally {
      setLoadingList(false);
    }
  }, [selectedClassId, selectedArmId]);

  useEffect(() => {
    if (selectedClassId) {
      fetchAssignments();
    }
  }, [selectedClassId, selectedArmId, fetchAssignments]);

  // Handle Create Assignment Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYearId || !selectedTermId || !selectedClassId || !selectedSubjectId || !form.dueDate) {
      setFormError("Please fill in all required academic parameters and due date.");
      return;
    }
    setSavingForm(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await apiClient.post("api/v1/assignments", {
        academicYearId: selectedYearId,
        termId: selectedTermId,
        classId: selectedClassId,
        armId: selectedArmId || undefined,
        subjectId: selectedSubjectId,
        title: form.title,
        description: form.description,
        dueDate: form.dueDate.toISOString(),
        maxScore: Number(form.maxScore),
      });
      setFormSuccess("Assignment created successfully as DRAFT.");
      setForm({ title: "", description: "", dueDate: null, maxScore: 100 });
      fetchAssignments();
      setTimeout(() => {
        setActiveTab("list");
        setFormSuccess(null);
      }, 1200);
    } catch (e: any) {
      setFormError(e.message || "Failed to create assignment.");
    } finally {
      setSavingForm(false);
    }
  };

  // Status Action Handlers (Publish / Close)
  const handlePublish = async (id: string) => {
    try {
      await apiClient.put(`api/v1/assignments/${id}/publish`, {});
      fetchAssignments();
    } catch (e: any) {
      alert(e.message || "Failed to publish assignment");
    }
  };

  const handleClose = async (id: string) => {
    try {
      await apiClient.put(`api/v1/assignments/${id}/close`, {});
      fetchAssignments();
    } catch (e: any) {
      alert(e.message || "Failed to close assignment");
    }
  };

  // View Submissions
  const handleViewSubmissions = async (assignment: any) => {
    setSelectedAssignment(assignment);
    setActiveTab("submissions");
    setLoadingSubmissions(true);
    setSubmissionError(null);
    try {
      const data = await apiClient.get(`api/v1/assignments/${assignment.id}/submissions`) as any[];
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setSubmissionError(e.message || "Failed to load submissions.");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Handle Grade Submission
  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingModal || !selectedAssignment) return;
    setSavingGrade(true);
    try {
      await apiClient.put(
        `api/v1/assignments/${selectedAssignment.id}/submissions/${gradingModal.studentId}/grade`,
        {
          score: Number(gradingModal.score),
          feedback: gradingModal.feedback,
        }
      );
      setGradingModal(null);
      handleViewSubmissions(selectedAssignment);
    } catch (e: any) {
      alert(e.message || "Failed to grade submission");
    } finally {
      setSavingGrade(false);
    }
  };

  // Handle Student Submit Action
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitModal) return;
    setSubmittingAssignment(true);
    try {
      await apiClient.post(`api/v1/assignments/${submitModal.assignmentId}/submit`, {
        textContent: submitModal.textContent,
      });
      alert("Assignment submitted successfully!");
      setSubmitModal(null);
      fetchAssignments();
    } catch (e: any) {
      alert(e.message || "Failed to submit assignment");
    } finally {
      setSubmittingAssignment(false);
    }
  };

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments & Homework</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create, publish, collect, and grade class assignments integrated with the Results Engine.
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === "list"
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Assignments List
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === "create"
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            + Create New
          </button>
        </div>
      </div>

      {/* Academic Context Selectors Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Academic Year
          </label>
          <select
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md p-2 text-sm text-gray-900 dark:text-white"
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Term
          </label>
          <select
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md p-2 text-sm text-gray-900 dark:text-white"
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
          >
            {terms.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Class
          </label>
          <select
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md p-2 text-sm text-gray-900 dark:text-white"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Arm (Optional)
          </label>
          <select
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md p-2 text-sm text-gray-900 dark:text-white"
            value={selectedArmId}
            onChange={(e) => setSelectedArmId(e.target.value)}
          >
            <option value="">All Arms (Class-wide)</option>
            {arms.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Subject
          </label>
          <select
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md p-2 text-sm text-gray-900 dark:text-white"
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 1: LIST ASSIGNMENTS */}
      {activeTab === "list" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              Class Assignments ({assignments.length})
            </h2>
            <button
              onClick={fetchAssignments}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Refresh
            </button>
          </div>

          {loadingList ? (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading assignments...
            </div>
          ) : listError ? (
            <div className="p-4 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-sm">
              {listError}
            </div>
          ) : assignments.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
              No assignments found for the selected class. Click "+ Create New" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                    <th className="p-3">Title</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Max Score</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {assignments.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="p-3 font-medium text-gray-900 dark:text-white">
                        {item.title}
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-normal line-clamp-1">
                          {item.description}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                        {new Date(item.dueDate).toLocaleString()}
                      </td>
                      <td className="p-3 font-semibold text-gray-900 dark:text-white">
                        {item.assessmentComponent?.maxScore ?? 100} pts
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.status === "PUBLISHED"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                              : item.status === "CLOSED"
                              ? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        {item.status === "DRAFT" && (
                          <button
                            onClick={() => handlePublish(item.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 font-medium"
                          >
                            Publish
                          </button>
                        )}
                        {item.status === "PUBLISHED" && (
                          <>
                            <button
                              onClick={() => setSubmitModal({ assignmentId: item.id, textContent: "" })}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 font-medium"
                            >
                              Submit
                            </button>
                            <button
                              onClick={() => handleClose(item.id)}
                              className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 font-medium"
                            >
                              Close
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleViewSubmissions(item)}
                          className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 font-medium"
                        >
                          Submissions
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CREATE ASSIGNMENT */}
      {activeTab === "create" && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-3xl space-y-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create New Assignment
          </h2>

          {formError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-sm">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="p-3 rounded-lg bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 text-sm">
              {formSuccess}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Assignment Title *
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Chapter 4 Quadratic Equations Practice"
                className="w-full border dark:border-gray-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Description & Instructions *
              </label>
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detailed homework instructions..."
                className="w-full border dark:border-gray-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Due Date & Time *
                </label>
                <DatePicker
                  selected={form.dueDate}
                  onChange={(date: Date | null) => setForm({ ...form, dueDate: date })}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full border dark:border-gray-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholderText="Select due date"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Maximum Possible Score *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.maxScore}
                  onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })}
                  className="w-full border dark:border-gray-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={savingForm}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {savingForm ? "Saving..." : "Save Draft Assignment"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: SUBMISSIONS & GRADING */}
      {activeTab === "submissions" && selectedAssignment && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Submissions: {selectedAssignment.title}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Max Score: {selectedAssignment.assessmentComponent?.maxScore ?? 100} pts | Status: {selectedAssignment.status}
              </p>
            </div>
            <button
              onClick={() => setActiveTab("list")}
              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs font-medium"
            >
              Back to List
            </button>
          </div>

          {loadingSubmissions ? (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading submissions...
            </div>
          ) : submissionError ? (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 text-sm">
              {submissionError}
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
              No submissions recorded yet for this assignment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Submission Content</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Grade Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="p-3 font-medium text-gray-900 dark:text-white">
                        {sub.student?.firstName} {sub.student?.lastName}
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                          {sub.student?.studentNumber}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                        {sub.textContent}
                      </td>
                      <td className="p-3 font-semibold text-gray-900 dark:text-white">
                        {sub.score !== null ? `${sub.score} pts` : "—"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            sub.status === "GRADED"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() =>
                            setGradingModal({
                              studentId: sub.studentId,
                              studentName: `${sub.student?.firstName} ${sub.student?.lastName}`,
                              score: sub.score ?? 0,
                              feedback: sub.feedback || "",
                            })
                          }
                          className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 font-medium"
                        >
                          {sub.status === "GRADED" ? "Edit Grade" : "Grade"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: GRADE SUBMISSION */}
      {gradingModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleGradeSubmit}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full space-y-4"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Grade Submission: {gradingModal.studentName}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Max possible score: {selectedAssignment.assessmentComponent?.maxScore ?? 100} pts
            </p>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Score Awarded *
              </label>
              <input
                type="number"
                min="0"
                max={selectedAssignment.assessmentComponent?.maxScore ?? 100}
                required
                value={gradingModal.score}
                onChange={(e) =>
                  setGradingModal({ ...gradingModal, score: Number(e.target.value) })
                }
                className="w-full border dark:border-gray-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Feedback / Comments
              </label>
              <textarea
                rows={3}
                value={gradingModal.feedback}
                onChange={(e) =>
                  setGradingModal({ ...gradingModal, feedback: e.target.value })
                }
                placeholder="Optional feedback for the student..."
                className="w-full border dark:border-gray-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setGradingModal(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingGrade}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingGrade ? "Saving..." : "Save Grade & Push to Results"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: SUBMIT ASSIGNMENT (STUDENT SIMULATION) */}
      {submitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleStudentSubmit}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full space-y-4"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Submit Assignment Homework
            </h3>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Your Answer / Response *
              </label>
              <textarea
                required
                rows={5}
                value={submitModal.textContent}
                onChange={(e) =>
                  setSubmitModal({ ...submitModal, textContent: e.target.value })
                }
                placeholder="Type your homework answer here..."
                className="w-full border dark:border-gray-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSubmitModal(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAssignment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submittingAssignment ? "Submitting..." : "Submit Homework"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
