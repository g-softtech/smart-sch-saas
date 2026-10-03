"use client";
import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, RefreshCw, AlertCircle, FileText, ExternalLink } from "lucide-react";

export default function WebsitePagesManagement() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenantId") || "" : "";
      const schoolId = typeof window !== "undefined" ? localStorage.getItem("schoolId") || "" : "";
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

      const res = await fetch("/api/v1/cms/admin/pages", {
        headers: {
          Authorization: "Bearer "$"{"token"}",
          "x-tenant-id": tenantId,
          "x-school-id": schoolId,
        },
      });

      if (!res.ok) throw new Error("Failed to load CMS pages");
      const data = await res.json();
      setPages(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(Are you sure you want to delete the page ""$"{"title"}"?)) return;
    try {
      const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenantId") || "" : "";
      const schoolId = typeof window !== "undefined" ? localStorage.getItem("schoolId") || "" : "";
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

      const res = await fetch("/api/v1/cms/admin/pages/"$"{"id"}", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer "$"{"token"}",
          "x-tenant-id": tenantId,
          "x-school-id": schoolId,
        },
      });

      if (!res.ok) throw new Error("Failed to delete page");
      setPages(pages.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Manage Pages</h2>
        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Page
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : pages.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
            <FileText className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">No pages found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              Create your first page to start building your public website.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/50 text-slate-400 uppercase text-xs font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Title / Slug</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Last Updated</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-medium text-white">{page.title}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        /{page.slug}
                        <a href={"/"$"{"page.slug"}"} target="_blank" rel="noreferrer" className="hover:text-indigo-400">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={"inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border "$"{"
                          page.status === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }"}
                      >
                        {page.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <button className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-md transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {page.slug !== "home" && (
                        <button 
                          onClick={() => handleDelete(page.id, page.title)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}