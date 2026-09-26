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
    maxScore: number;
  }>({
    title: "",
    instructions: "",
    availableFrom: null,
    availableTo: null,
    durationMinutes: 60,
    maxScore: 100,
  });
  const [savingForm, setSavingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Question Authoring Modal State
  const [questionModal, setQuestionModal] = useState<{
    examId: string;
    examTitle: string;
    questionText: string;
    options: string[];
    correctOption: number;
    points: number;
  } | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Student Attempt State
  const [activeAttempt, setActiveAttempt] = useState<{
    examId: string;
    attemptId: string;
    questions: any[];
    answers: Record<string, number>;
    durationMinutes: number;
    startTime: string;
  } | null>(null);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);

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
      let url = `api/v1/cbt/class/${selectedClassId}`;
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
      !form.availableTo
    ) {
      setFormError("Please fill in all required academic parameters and time windows.");
      return;
    }
    setSavingForm(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await apiClient.post("api/v1/cbt", {
        academicYearId: selectedYearId,
        termId: selectedTermId,
        classId: selectedClassId,
        armId: selectedArmId || undefined,
        subjectId: selectedSubjectId,
        title: form.title,
        instructions: form.instructions,
        availableFrom: form.availableFrom.toISOString(),
        availableTo: form.availableTo.toISOString(),
        durationMinutes: Number(form.durationMinutes),
        maxScore: Number(form.maxScore),
      });
      setFormSuccess("CBT Exam settings created successfully as DRAFT.");
      setForm({
        title: "",
        instructions: "",
        availableFrom: null,
        availableTo: null,
        durationMinutes: 60,
        maxScore: 100,
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
    status: "DRAFT" | "PUBLISHED" | "ACTIVE" | "CLOSED"
  ) => {
    try {
      await apiClient.put(`api/v1/cbt/${id}/status`, { status });
      fetchExams();
    } catch (e: any) {
      alert(e.message || "Failed to update exam status");
    }
  };

  // Question Authoring
  const handleAddQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionModal) return;
    setSavingQuestion(true);
    try {
      await apiClient.post(`api/v1/cbt/${questionModal.examId}/questions`, {
        questionText: questionModal.questionText,
        options: questionModal.options,
        correctOption: Number(questionModal.correctOption),
        points: Number(questionModal.points),
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

  // Start Exam Attempt
  const handleStartAttempt = async (exam: any) => {
    try {
      await apiClient.post(`api/v1/cbt/${exam.id}/attempts/start`, {});
      const attemptData = (await apiClient.get(
        `api/v1/cbt/${exam.id}/attempts/questions`
      )) as any;
      setActiveAttempt({
        examId: exam.id,
        attemptId: attemptData.attemptId,
        questions: attemptData.questions || [],
        answers: {},
        durationMinutes: attemptData.durationMinutes || exam.durationMinutes,
        startTime: attemptData.startTime,
      });
      setActiveTab("attempt");
    } catch (e: any) {
      alert(e.message || "Failed to start exam attempt");
    }
  };

  // Submit Exam Attempt
  const handleSubmitAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAttempt) return;
    setSubmittingAttempt(true);
    try {
      const answersPayload = Object.entries(activeAttempt.answers).map(
        ([questionId, selectedOption]) => ({
          questionId,
          selectedOption,
        })
      );
      const res = (await apiClient.post(
        `api/v1/cbt/${activeAttempt.examId}/attempts/submit`,
        { answers: answersPayload }
      )) as any;
      alert(`Exam submitted successfully! Score: ${res.totalScore} pts (Pushed to Results Engine)`);
      setActiveAttempt(null);
      setActiveTab("list");
      fetchExams();
    } catch (e: any) {
      alert(e.message || "Failed to submit exam attempt");
    } finally {
      setSubmittingAttempt(false);
    }
  };

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
                        {new Date(item.availableFrom).toLocaleString()} $\rightarrow$ <br />
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
                                questionText: "",
                                options: ["", "", "", ""],
                                correctOption: 0,
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
                            onClick={() => handleStatusChange(item.id, "ACTIVE")}
                            className="px-2.5 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 font-medium"
                          >
                            Activate
                          </button>
                        )}
                        {item.status === "ACTIVE" && (
                          <>
                            <button
                              onClick={() => handleStartAttempt(item)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 font-medium"
                            >
                              Take Exam
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, "CLOSED")}
                              className="px-2.5 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 font-medium"
                            >
                              Close
                            </button>
                          </>
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
      {activeTab === "attempt" && activeAttempt && (
        <form
          onSubmit={handleSubmitAttempt}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-4xl space-y-6"
        >
          <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Active CBT Exam Attempt
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Duration: {activeAttempt.durationMinutes} mins | Questions: {activeAttempt.questions.length}
              </p>
            </div>

            <button
              type="submit"
              disabled={submittingAttempt}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {submittingAttempt ? "Submitting..." : "Submit Exam Attempt"}
            </button>
          </div>

          <div className="space-y-6">
            {activeAttempt.questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 space-y-3"
              >
                <div className="font-semibold text-gray-900 dark:text-white text-base">
                  Question {idx + 1}. {q.questionText} ({q.points} pts)
                </div>

                <div className="space-y-2">
                  {q.options.map((opt: string, optIdx: number) => (
                    <label
                      key={optIdx}
                      className="flex items-center space-x-3 p-2.5 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <input
                        type="radio"
                        name={`question_${q.id}`}
                        value={optIdx}
                        checked={activeAttempt.answers[q.id] === optIdx}
                        onChange={() =>
                          setActiveAttempt({
                            ...activeAttempt,
                            answers: {
                              ...activeAttempt.answers,
                              [q.id]: optIdx,
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-200">
                        {String.fromCharCode(65 + optIdx)}. {opt}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </form>
      )}

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

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Options (Select Correct Answer) *
              </label>
              {questionModal.options.map((opt, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="correctOption"
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
