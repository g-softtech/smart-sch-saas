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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">CBT Examinations</h1>

      <div className="flex space-x-4 mb-6">
        <button onClick={() => setActiveTab("list")} className={`px-4 py-2 rounded ${activeTab === "list" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>Exams</button>
        <button onClick={() => setActiveTab("create")} className={`px-4 py-2 rounded ${activeTab === "create" ? "bg-blue-600 text-white" : "bg-gray-200"}`}>Create Exam</button>
        <button onClick={() => setActiveTab("student")} className={`px-4 py-2 rounded ${activeTab === "student" ? "bg-green-600 text-white" : "bg-gray-200"}`}>Student Simulation</button>
      </div>

      {activeTab === "create" && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded shadow max-w-2xl border">
          <h2 className="text-lg font-semibold mb-4">Create CBT Exam</h2>
          <div className="space-y-4">
            <div><label className="block mb-1 font-medium">Title</label><input required className="w-full border p-2" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-medium">Available From</label>
                <DatePicker
                  selected={form.availableFrom}
                  onChange={(date: Date | null) => setForm({ ...form, availableFrom: date })}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full border p-2 rounded text-gray-900 bg-white"
                  placeholderText="Select start date"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Available To</label>
                <DatePicker
                  selected={form.availableTo}
                  onChange={(date: Date | null) => setForm({ ...form, availableTo: date })}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full border p-2 rounded text-gray-900 bg-white"
                  placeholderText="Select end date"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block mb-1 font-medium">Duration (Mins)</label><input type="number" min="1" required className="w-full border p-2" value={form.durationMinutes} onChange={e => setForm({...form, durationMinutes: Number(e.target.value)})} /></div>
              <div><label className="block mb-1 font-medium">Max Score</label><input type="number" min="1" required className="w-full border p-2" value={form.maxScore} onChange={e => setForm({...form, maxScore: Number(e.target.value)})} /></div>
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save Exam Settings</button>
          </div>
        </form>
      )}

      {activeTab === "list" && (
        <div className="bg-white p-6 rounded shadow border">
          <h2 className="text-lg font-semibold mb-4">Exams</h2>
          {exams.length === 0 ? <p className="text-gray-500">No exams configured.</p> : (
            <div className="space-y-4">
              {exams.map(e => (
                <div key={e.id} className="border p-4 rounded flex justify-between items-center">
                  <div>
                    <h3 className="font-bold">{e.title}</h3>
                    <p className="text-sm text-gray-600">Duration: {e.durationMinutes} mins | Available: {new Date(e.availableFrom).toLocaleString()}</p>
                    <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-xs rounded border">{e.status}</span>
                  </div>
                  <div className="space-x-2">
                    <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Add Questions</button>
                    {e.status === "DRAFT" && <button className="bg-green-600 text-white px-3 py-1 rounded text-sm">Publish</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "student" && (
        <div className="bg-white p-6 rounded shadow border border-green-300">
          <h2 className="text-lg font-semibold mb-4 text-green-800">Student CBT Simulation</h2>
          <p className="text-gray-600 mb-4">Select an active exam below to start a simulated attempt.</p>
          <div className="space-y-4">
            {exams.filter(e => e.status !== "DRAFT").map(e => (
              <div key={e.id} className="border p-4 rounded flex justify-between items-center border-green-200">
                <div>
                  <h3 className="font-bold">{e.title}</h3>
                  <p className="text-sm">Duration: {e.durationMinutes} mins</p>
                </div>
                <button className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700">Start Attempt</button>
              </div>
            ))}
            {exams.filter(e => e.status !== "DRAFT").length === 0 && <p className="text-gray-500 italic">No published/active exams available for students.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
