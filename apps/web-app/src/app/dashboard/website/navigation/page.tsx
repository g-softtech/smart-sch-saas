"use client";
import React, { useState, useEffect } from "react";
import { Save, AlertCircle, RefreshCw, GripVertical, Plus, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

export default function WebsiteNavigationManagement() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const data = await apiClient.get<any>("v1/cms/admin/config");
        if (data && data.themePayload && data.themePayload.navigation) {
          setItems(data.themePayload.navigation);
        } else if (data && data.navigation) {
          setItems(data.navigation);
        } else {
          setItems([{ id: crypto.randomUUID(), label: "Home", type: "PAGE", targetUrl: "/home", orderIndex: 0, isActive: true }]);
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payloadItems = items.map((it, i) => ({
        id: it.id,
        label: it.label || "",
        targetUrl: it.targetUrl || it.target || "",
        orderIndex: i,
        isActive: it.isActive !== undefined ? Boolean(it.isActive) : true
      }));
      await apiClient.put("v1/cms/admin/navigation", { items: payloadItems });
      alert("Navigation saved!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><RefreshCw className="w-6 h-6 animate-spin text-slate-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Main Menu Navigation</h2>
          <p className="text-sm text-slate-400">Configure the top navigation bar of your public website.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Navigation
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        {items.map((item, index) => (
          <div key={item.id || index} className="flex items-center gap-4 bg-slate-950 border border-slate-800 p-3 rounded-lg">
            <GripVertical className="w-5 h-5 text-slate-600 cursor-grab" />
            
            <div className="flex-1 grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Label</label>
                <input 
                  type="text"
                  value={item.label || ""}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[index].label = e.target.value;
                    setItems(newItems);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-sm text-white focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                <select 
                  value={item.type || (item.targetUrl?.startsWith('http') ? "EXTERNAL" : "PAGE")}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[index].type = e.target.value;
                    setItems(newItems);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-sm text-white focus:border-indigo-500"
                >
                  <option value="PAGE">Internal Page</option>
                  <option value="EXTERNAL">External Link</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target URL / Slug</label>
                <input 
                  type="text"
                  value={item.targetUrl || item.target || ""}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[index].targetUrl = e.target.value;
                    newItems[index].target = e.target.value;
                    setItems(newItems);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-sm text-white focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.isActive !== false}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[index].isActive = e.target.checked;
                      setItems(newItems);
                    }}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-300">Active</span>
                </label>
              </div>
            </div>

            <button 
              onClick={() => setItems(items.filter((_, i) => i !== index))}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors mt-4"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        
        <button 
          onClick={() => setItems([...items, { id: crypto.randomUUID(), label: "New Item", type: "PAGE", targetUrl: "", orderIndex: items.length, isActive: true }])}
          className="w-full py-3 border-2 border-dashed border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Navigation Item
        </button>
      </div>
    </div>
  );
}