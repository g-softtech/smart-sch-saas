"use client";

import React, { useState, useEffect, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAcademicYears,
  useTerms,
  useClasses,
  useArms,
  useSubjects,
} from "@/hooks/useFinanceSelectors";

export default function CBTPage() {
  const [activeTab, setActiveTab] = useState<"list" | "create" | "attempt">("list");

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

  
  const { logout } = useAuth();
  const [components, setComponents] = useState<any[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");

  useEffect(() => {
    if (selectedYearId && selectedTermId && selectedClassId && selectedSubjectId) {
      apiClient.get(`api/v1/academics/results/components?academicYearId=${selectedYearId}&termId=${selectedTermId}&classId=${selectedClassId}&subjectId=${selectedSubjectId}`)
        .then((res: any) => setComponents(res.data || res || []))
        .catch(console.error);
    }
  }, [selectedYearId, selectedTermId, selectedClassId, selectedSubjectId]);

  // CBT Exam List State
  const [exams, setExams] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Form State for Creating CBT Exam
  const [form, setForm] = useState<{
    title: string;
    instructions: string;
    availableFrom: Date | null;
    availableTo: Date | null;
    durationMinutes: number;
  }>({
    title: "",
    instructions: "",
    availableFrom: null,
    availableTo: null,
    durationMinutes: 60
  });
  const [savingForm, setSavingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Question Authoring Modal State
  const [questionModal, setQuestionModal] = useState<{
    examId: string;
    examTitle: string;
    questionType: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SUBJECTIVE";
    questionText: string;
    options: string[];
    correctOption: number;
    correctOptions: number[];
    points: number;
  } | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Student attempt state removed

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

  // Fetch CBT Exams for Selected Class
  const fetchExams = useCallback(async () => {
    if (!selectedClassId) return;
    setLoadingList(true);
    setListError(null);
    try {
      let url = `api/v1/academics/cbt/admin/class/${selectedClassId}`;
      if (selectedArmId) url += `?armId=${selectedArmId}`;
      const data = (await apiClient.get(url)) as any[];
      setExams(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setListError(e.message || "Failed to load CBT exams");
    } finally {
      setLoadingList(false);
    }
  }, [selectedClassId, selectedArmId]);

  useEffect(() => {
    if (selectedClassId) {
      fetchExams();
    }
  }, [selectedClassId, selectedArmId, fetchExams]);

  // Handle Create Exam Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedYearId ||
      !selectedTermId ||
      !selectedClassId ||
      !selectedSubjectId ||
      !form.availableFrom ||
      !form.availableTo || !selectedComponentId
    ) {
      setFormError("Please fill in all required academic parameters and time windows.");
      return;
    }
    setSavingForm(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await apiClient.post("api/v1/academics/cbt/admin/exams", {
        assessmentComponentId: selectedComponentId,
        teacherId: "admin",
        title: form.title,
        instructions: form.instructions,
        availableFrom: form.availableFrom.toISOString(),
        availableTo: form.availableTo.toISOString(),
        durationMinutes: Number(form.durationMinutes)
      });
      setFormSuccess("CBT Exam settings created successfully as DRAFT.");
      setForm({
        title: "",
        instructions: "",
        availableFrom: null,
        availableTo: null,
        durationMinutes: 60
      });
      fetchExams();
      setTimeout(() => {
        setActiveTab("list");
        setFormSuccess(null);
      }, 1200);
    } catch (e: any) {
      setFormError(e.message || "Failed to create CBT exam.");
    } finally {
      setSavingForm(false);
    }
  };

  // Status Transitions
  const handleStatusChange = async (
    id: string,
    status: string
  ) => {
    if (status !== "PUBLISHED") {
      alert("Only PUBLISHED transitions are supported here. Modifying active/closed requires exam editing.");
      return;
    }
    try {
      await apiClient.post(`api/v1/academics/cbt/admin/exams/${id}/publish`, {});
      fetchExams();
    } catch (e: any) {
      alert(e.message || "Failed to publish exam. Ensure questions total the component's max score.");
    }
  };

  // Compile CBT to Gradebook
  const [compilingId, setCompilingId] = useState<string | null>(null);
  const [compileResult, setCompileResult] = useState<{
    examTitle: string;
    compiledCount: number;
    skippedCount: number;
  } | null>(null);

  const handleCompileToGradebook = async (exam: any) => {
    setCompilingId(exam.id);
    setCompileResult(null);
    try {
      // Single canonical administrative compile endpoint
      const res: any = await apiClient.post(`api/v1/academics/cbt/admin/exams/${exam.id}/compile`, {});

      setCompileResult({
        examTitle: exam.title,
        compiledCount: res.compiledCount ?? 0,
        skippedCount: res.skippedCount ?? 0,
      });
      fetchExams();
    } catch (e: any) {
      alert(e.message || "Failed to compile CBT scores to Gradebook");
    } finally {
      setCompilingId(null);
    }
  };

  // Question Authoring
  const handleAddQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionModal) return;

    if (questionModal.questionType === "MULTIPLE_CHOICE" && questionModal.correctOptions.length === 0) {
      alert("Please select at least one correct answer for Multiple Choice.");
      return;
    }

    setSavingQuestion(true);
    try {
      // Fetch existing exam first to get current questions
      const exam = await apiClient.get(`api/v1/academics/cbt/admin/exams/${questionModal.examId}`) as any;
      const currentQuestions = exam.questions || [];
      const updatedQuestions = [
        ...currentQuestions.map((q: any) => ({
          questionType: q.questionType,
          questionText: q.questionText,
          points: q.points,
          options: q.options,
          correctOption: q.correctOption,
          correctAnswerPayload: q.correctAnswerPayload
        })),
        {
          questionType: questionModal.questionType,
          questionText: questionModal.questionText,
          options: questionModal.questionType === "TRUE_FALSE" ? ["True", "False"] : (questionModal.questionType === "SUBJECTIVE" ? [] : questionModal.options),
          correctOption: (questionModal.questionType === "SINGLE_CHOICE" || questionModal.questionType === "TRUE_FALSE") ? Number(questionModal.correctOption) : null,
          correctAnswerPayload: questionModal.questionType === "MULTIPLE_CHOICE" ? { correctOptions: questionModal.correctOptions } : null,
          points: Number(questionModal.points)
        }
      ];

      await apiClient.put(`api/v1/academics/cbt/admin/exams/${questionModal.examId}/questions`, {
        questions: updatedQuestions
      });
      alert("Question added successfully!");
      setQuestionModal(null);
      fetchExams();
    } catch (e: any) {
      alert(e.message || "Failed to add question");
    } finally {
      setSavingQuestion(false);
    }
  };

  // Student attempt handling removed from Admin dashboard.

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Examinations & CBT</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Author CBT questions, manage time limits, enforce single attempts, and auto-grade scores directly into Results.
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
            Exams List
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === "create"
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            + Create Exam
          </button>
        </div>
      </div>

      {/* Academic Selectors Bar */}
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

      {/* TAB 1: EXAMS LIST */}
      {activeTab === "list" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              CBT Exams ({exams.length})
            </h2>
            <button
              onClick={fetchExams}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Refresh
            </button>
          </div>

          {compileResult && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex justify-between items-center text-sm">
              <div className="space-y-1">
                <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Gradebook Compilation Successful: {compileResult.examTitle}
                </div>
                <div className="text-xs text-emerald-800 dark:text-emerald-400">
                  Compiled {compileResult.compiledCount} student score(s) into dynamic Gradebook columns.
                  {compileResult.skippedCount > 0 && ` (${compileResult.skippedCount} skipped due to existing manual protection)`}
                </div>
              </div>
              <button
                onClick={() => setCompileResult(null)}
                className="text-xs px-2.5 py-1 bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-200 rounded font-medium hover:bg-emerald-300"
              >
                Dismiss
              </button>
            </div>
          )}

          {loadingList ? (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading CBT exams...
            </div>
          ) : listError ? (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 text-sm">
              {listError}
            </div>
          ) : exams.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
              No CBT exams found for the selected class. Click "+ Create Exam" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                    <th className="p-3">Title</th>
                    <th className="p-3">Time Window</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Max Score</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {exams.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="p-3 font-medium text-gray-900 dark:text-white">
                        {item.title}
                      </td>
                      <td className="p-3 text-xs text-gray-600 dark:text-gray-300">
                        {new Date(item.availableFrom).toLocaleString()} &rarr; <br />
                        {new Date(item.availableTo).toLocaleString()}
                      </td>
                      <td className="p-3 font-semibold text-gray-900 dark:text-white">
                        {item.durationMinutes} mins
                      </td>
                      <td className="p-3 font-semibold text-gray-900 dark:text-white">
                        {item.assessmentComponent?.maxScore ?? 100} pts
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.status === "ACTIVE"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                              : item.status === "PUBLISHED"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                              : item.status === "CLOSED"
                              ? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        {(item.status === "DRAFT" || item.status === "PUBLISHED") && (
                          <button
                            onClick={() =>
                              setQuestionModal({
                                examId: item.id,
                                examTitle: item.title,
                                questionType: "SINGLE_CHOICE",
                                questionText: "",
                                options: ["", "", "", ""],
                                correctOption: 0,
                                correctOptions: [],
                                points: 5,
                              })
                            }
                            className="px-2.5 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 font-medium"
                          >
                            + Question
                          </button>
                        )}
                        {item.status === "DRAFT" && (
                          <button
                            onClick={() => handleStatusChange(item.id, "PUBLISHED")}
                            className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 font-medium"
                          >
                            Publish
                          </button>
                        )}
                        {item.status === "PUBLISHED" && (
                          <button
                            onClick={() => handleCompileToGradebook(item)}
                            disabled={compilingId === item.id}
                            className="px-2.5 py-1 bg-[#D2AD36] text-[#0A192E] rounded text-xs hover:bg-[#c19c28] font-semibold disabled:opacity-50 transition-colors shadow-sm"
                          >
                            {compilingId === item.id ? "Compiling..." : "Compile to Gradebook"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CREATE EXAM */}
      {activeTab === "create" && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-3xl space-y-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create CBT Exam Settings
          </h2>

          {formError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 text-sm">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="p-3 rounded-lg bg-green-50 text-green-600 dark:bg-green-900/30 text-sm">
              {formSuccess}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Assessment Component *
              </label>
              <select
                required
                className="w-full border dark:border-gray-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                value={selectedComponentId}
                onChange={(e) => setSelectedComponentId(e.target.value)}
              >
                <option value="" disabled>Select an Assessment Component (from Subject/Class)</option>
                {components.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.title} (Max Score: {c.maxScore})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Exam Title *
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Mid-Term Physics CBT Examination"
                className="w-full border dark:border-gray-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Instructions for Candidates
              </label>
              <textarea
                rows={3}
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                placeholder="Exam rules, instructions, calculator permissions..."
                className="w-full border dark:border-gray-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Available From *
                </label>
                <DatePicker
                  selected={form.availableFrom}
                  onChange={(date: Date | null) => setForm({ ...form, availableFrom: date })}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full border dark:border-gray-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholderText="Start time window"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Available To *
                </label>
                <DatePicker
                  selected={form.availableTo}
                  onChange={(date: Date | null) => setForm({ ...form, availableTo: date })}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full border dark:border-gray-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholderText="End time window"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Duration (Minutes) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
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
                {savingForm ? "Saving..." : "Save Draft Exam"}
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

      {/* TAB 3: STUDENT EXAM ATTEMPT SCREEN */}
      {/* Attempt tab removed for admin */}

      {/* MODAL: QUESTION AUTHORING */}
      {questionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddQuestionSubmit}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-lg w-full space-y-4"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Add Question: {questionModal.examTitle}
            </h3>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Question Type *
              </label>
              <select
                value={questionModal.questionType}
                onChange={(e) => {
                  const t = e.target.value as any;
                  setQuestionModal({ ...questionModal, questionType: t, correctOptions: [], correctOption: 0 });
                }}
                className="w-full border dark:border-gray-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="SINGLE_CHOICE">Single Choice</option>
                <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="SUBJECTIVE">Subjective (Manual Review)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Question Text *
              </label>
              <textarea
                required
                rows={3}
                value={questionModal.questionText}
                onChange={(e) =>
                  setQuestionModal({ ...questionModal, questionText: e.target.value })
                }
                placeholder="Enter the question..."
                className="w-full border dark:border-gray-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            {questionModal.questionType === "SINGLE_CHOICE" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Options (Select One Correct Answer) *
                </label>
                {questionModal.options.map((opt, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="correctOption"
                      required
                      checked={questionModal.correctOption === i}
                      onChange={() => setQuestionModal({ ...questionModal, correctOption: i })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...questionModal.options];
                        newOpts[i] = e.target.value;
                        setQuestionModal({ ...questionModal, options: newOpts });
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className="w-full border dark:border-gray-700 p-2 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            )}

            {questionModal.questionType === "MULTIPLE_CHOICE" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Options (Select All Correct Answers) *
                </label>
                {questionModal.options.map((opt, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={questionModal.correctOptions.includes(i)}
                      onChange={(e) => {
                        const newCorrect = e.target.checked
                          ? [...questionModal.correctOptions, i]
                          : questionModal.correctOptions.filter(idx => idx !== i);
                        setQuestionModal({ ...questionModal, correctOptions: newCorrect });
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...questionModal.options];
                        newOpts[i] = e.target.value;
                        setQuestionModal({ ...questionModal, options: newOpts });
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className="w-full border dark:border-gray-700 p-2 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            )}

            {questionModal.questionType === "TRUE_FALSE" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Correct Answer *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="tfCorrect"
                      checked={questionModal.correctOption === 0}
                      onChange={() => setQuestionModal({ ...questionModal, correctOption: 0 })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">True</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="tfCorrect"
                      checked={questionModal.correctOption === 1}
                      onChange={() => setQuestionModal({ ...questionModal, correctOption: 1 })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">False</span>
                  </label>
                </div>
              </div>
            )}

            {questionModal.questionType === "SUBJECTIVE" && (
              <div className="bg-amber-100 dark:bg-amber-900/40 p-3 rounded text-sm text-amber-800 dark:text-amber-300">
                Subjective questions require manual grading by the teacher after submission.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Question Points *
              </label>
              <input
                type="number"
                min="1"
                required
                value={questionModal.points}
                onChange={(e) =>
                  setQuestionModal({ ...questionModal, points: Number(e.target.value) })
                }
                className="w-full border dark:border-gray-700 p-2.5 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setQuestionModal(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingQuestion}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {savingQuestion ? "Saving..." : "Add Question"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
