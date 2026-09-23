"use client";

import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function AssignmentsPage() {
  const [activeTab, setActiveTab] = useState<"create" | "list">("list");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [form, setForm] = useState<{title: string, description: string, dueDate: Date | null, maxScore: number}>({
    title: "",
    description: "",
    dueDate: null,
    maxScore: 100,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call for MVP
    const newAssignment = {
      id: Date.now().toString(),
      ...form,
      status: "DRAFT",
    };
    setAssignments([...assignments, newAssignment]);
    setActiveTab("list");
    setForm({ title: "", description: "", dueDate: null, maxScore: 100 });
  };

  const handlePublish = (id: string) => {
    setAssignments(assignments.map(a => a.id === id ? { ...a, status: "PUBLISHED" } : a));
  };

  const handleViewSubmissions = (id: string) => {
    alert("Viewing submissions for assignment ID: " + id + "\n(This is a mockup feature for Phase 3 UI testing)");
  };

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-bold mb-6">Assignments</h1>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab("list")}
          className={`px-4 py-2 rounded ${activeTab === "list" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}
        >
          My Assignments
        </button>
        <button
          onClick={() => setActiveTab("create")}
          className={`px-4 py-2 rounded ${activeTab === "create" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}
        >
          Create New
        </button>
      </div>

      {activeTab === "create" && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-gray-800 p-6 rounded shadow max-w-2xl border dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create Assignment</h2>
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full border dark:border-gray-600 p-2 rounded text-gray-900 dark:text-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">Description (Rich Text MVP)</label>
              <textarea
                required
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border dark:border-gray-600 p-2 rounded h-32 text-gray-900 dark:text-white dark:bg-gray-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">Due Date</label>
                <DatePicker
                  selected={form.dueDate}
                  onChange={(date: Date | null) => setForm({ ...form, dueDate: date })}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full border dark:border-gray-600 p-2 rounded text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  placeholderText="Select due date"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">Max Score</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.maxScore}
                  onChange={e => setForm({ ...form, maxScore: Number(e.target.value) })}
                  className="w-full border dark:border-gray-600 p-2 rounded text-gray-900 dark:text-white dark:bg-gray-700"
                />
              </div>
            </div>
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Create Assignment (Draft)
            </button>
          </div>
        </form>
      )}

      {activeTab === "list" && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow border dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Class Assignments</h2>
          {assignments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No assignments found.</p>
          ) : (
            <div className="space-y-4">
              {assignments.map(a => (
                <div key={a.id} className="border dark:border-gray-600 p-4 rounded flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{a.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Due: {a.dueDate ? new Date(a.dueDate).toLocaleString() : 'N/A'}</p>
                    <span className="inline-block mt-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded border dark:border-gray-600">
                      {a.status}
                    </span>
                  </div>
                  <div className="space-x-2">
                    {a.status === "DRAFT" && (
                      <button onClick={() => handlePublish(a.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">Publish</button>
                    )}
                    <button onClick={() => handleViewSubmissions(a.id)} className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-1 rounded text-sm">View Submissions</button>
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
