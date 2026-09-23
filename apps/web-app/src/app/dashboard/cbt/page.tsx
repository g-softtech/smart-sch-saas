"use client";

import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function CBTPage() {
  const [activeTab, setActiveTab] = useState<"list" | "create" | "student">("list");
  const [exams, setExams] = useState<any[]>([]);
  const [form, setForm] = useState<{
    title: string,
    durationMinutes: number,
    availableFrom: Date | null,
    availableTo: Date | null,
    maxScore: number
  }>({
    title: "",
    durationMinutes: 60,
    availableFrom: null,
    availableTo: null,
    maxScore: 100,
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newExam = {
      id: Date.now().toString(),
      ...form,
      status: "DRAFT",
      questions: [],
    };
    setExams([...exams, newExam]);
    setActiveTab("list");
  };

  const handlePublish = (id: string) => {
    setExams(exams.map(e => e.id === id ? { ...e, status: "PUBLISHED" } : e));
  };

  const handleAddQuestions = (id: string) => {
    alert("Adding questions for exam ID: " + id + "\n(This is a mockup feature for Phase 3 UI testing)");
  };

  const handleStartAttempt = (id: string) => {
    alert("Starting attempt for exam ID: " + id + "\n(This is a mockup feature for Phase 3 UI testing)");
  };

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-bold mb-6">CBT Examinations</h1>

      <div className="flex space-x-4 mb-6">
        <button onClick={() => setActiveTab("list")} className={`px-4 py-2 rounded ${activeTab === "list" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}>Exams</button>
        <button onClick={() => setActiveTab("create")} className={`px-4 py-2 rounded ${activeTab === "create" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}>Create Exam</button>
        <button onClick={() => setActiveTab("student")} className={`px-4 py-2 rounded ${activeTab === "student" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}>Student Simulation</button>
      </div>

      {activeTab === "create" && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-gray-800 p-6 rounded shadow max-w-2xl border dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create CBT Exam</h2>
          <div className="space-y-4">
            <div><label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Title</label><input required className="w-full border dark:border-gray-600 p-2 rounded text-gray-900 dark:text-white dark:bg-gray-700" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Available From</label>
                <DatePicker
                  selected={form.availableFrom}
                  onChange={(date: Date | null) => setForm({ ...form, availableFrom: date })}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full border dark:border-gray-600 p-2 rounded text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  placeholderText="Select start date"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Available To</label>
                <DatePicker
                  selected={form.availableTo}
                  onChange={(date: Date | null) => setForm({ ...form, availableTo: date })}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full border dark:border-gray-600 p-2 rounded text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  placeholderText="Select end date"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Duration (Mins)</label><input type="number" min="1" required className="w-full border dark:border-gray-600 p-2 rounded text-gray-900 dark:text-white dark:bg-gray-700" value={form.durationMinutes} onChange={e => setForm({...form, durationMinutes: Number(e.target.value)})} /></div>
              <div><label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Max Score</label><input type="number" min="1" required className="w-full border dark:border-gray-600 p-2 rounded text-gray-900 dark:text-white dark:bg-gray-700" value={form.maxScore} onChange={e => setForm({...form, maxScore: Number(e.target.value)})} /></div>
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Save Exam Settings</button>
          </div>
        </form>
      )}

      {activeTab === "list" && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow border dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Exams</h2>
          {exams.length === 0 ? <p className="text-gray-500 dark:text-gray-400">No exams configured.</p> : (
            <div className="space-y-4">
              {exams.map(e => (
                <div key={e.id} className="border dark:border-gray-600 p-4 rounded flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{e.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Duration: {e.durationMinutes} mins | Available: {e.availableFrom ? new Date(e.availableFrom).toLocaleString() : 'N/A'}</p>
                    <span className="inline-block mt-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded border dark:border-gray-600">{e.status}</span>
                  </div>
                  <div className="space-x-2">
                    <button onClick={() => handleAddQuestions(e.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">Add Questions</button>
                    {e.status === "DRAFT" && <button onClick={() => handlePublish(e.id)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">Publish</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "student" && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow border border-green-300 dark:border-green-800">
          <h2 className="text-lg font-semibold mb-4 text-green-800 dark:text-green-500">Student CBT Simulation</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Select an active exam below to start a simulated attempt.</p>
          <div className="space-y-4">
            {exams.filter(e => e.status !== "DRAFT").map(e => (
              <div key={e.id} className="border dark:border-gray-600 p-4 rounded flex justify-between items-center border-green-200 dark:border-green-900">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{e.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Duration: {e.durationMinutes} mins</p>
                </div>
                <button onClick={() => handleStartAttempt(e.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold">Start Attempt</button>
              </div>
            ))}
            {exams.filter(e => e.status !== "DRAFT").length === 0 && <p className="text-gray-500 dark:text-gray-400 italic">No published/active exams available for students.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
