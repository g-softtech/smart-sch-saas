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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Assignments</h1>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab("list")}
          className={`px-4 py-2 rounded ${activeTab === "list" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          My Assignments
        </button>
        <button
          onClick={() => setActiveTab("create")}
          className={`px-4 py-2 rounded ${activeTab === "create" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Create New
        </button>
      </div>

      {activeTab === "create" && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded shadow max-w-2xl border">
          <h2 className="text-lg font-semibold mb-4">Create Assignment</h2>
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-1 text-gray-700">Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full border p-2 rounded text-gray-900"
              />
            </div>
            <div>
              <label className="block font-medium mb-1 text-gray-700">Description (Rich Text MVP)</label>
              <textarea
                required
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border p-2 rounded h-32 text-gray-900"
              />
            </div>
            <div>
              <label className="block font-medium mb-1 text-gray-700">
                Attachment <span className="text-sm font-normal text-gray-500">(Optional. Supported formats: PDF, DOCX, ZIP. Max size: 10MB)</span>
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.zip"
                className="w-full border p-2 rounded text-gray-900 bg-white"
              />
              <p className="text-xs text-gray-500 mt-1">Note: Upload functionality is simulated for this MVP phase.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1 text-gray-700">Due Date</label>
                <DatePicker
                  selected={form.dueDate}
                  onChange={(date: Date | null) => setForm({ ...form, dueDate: date })}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full border p-2 rounded text-gray-900 bg-white"
                  placeholderText="Select due date"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-gray-700">Max Score</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.maxScore}
                  onChange={e => setForm({ ...form, maxScore: Number(e.target.value) })}
                  className="w-full border p-2 rounded text-gray-900"
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
        <div className="bg-white p-6 rounded shadow border">
          <h2 className="text-lg font-semibold mb-4">Class Assignments</h2>
          {assignments.length === 0 ? (
            <p className="text-gray-500">No assignments found.</p>
          ) : (
            <div className="space-y-4">
              {assignments.map(a => (
                <div key={a.id} className="border p-4 rounded flex justify-between items-center">
                  <div>
                    <h3 className="font-bold">{a.title}</h3>
                    <p className="text-sm text-gray-600">Due: {new Date(a.dueDate).toLocaleString()}</p>
                    <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-xs rounded border">
                      {a.status}
                    </span>
                  </div>
                  <div className="space-x-2">
                    {a.status === "DRAFT" && (
                      <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Publish</button>
                    )}
                    <button className="bg-gray-800 text-white px-3 py-1 rounded text-sm">View Submissions</button>
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
