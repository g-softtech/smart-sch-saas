"use client";
import React, { useState, useEffect } from "react";
import { Save, AlertCircle, RefreshCw, Palette, Type, Layout, Eye, Globe } from "lucide-react";
import { apiClient } from "@/lib/api-client";

export default function WebsiteSettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<any>("v1/cms/admin/config");
      
      // If we have a working draft, use those values for the form UI
      let uiState = { ...data };
      if (data.themePayload && data.themePayload.workingDraft) {
        const draft = data.themePayload.workingDraft;
        uiState = {
          ...uiState,
          primaryColor: draft.primaryColor ?? data.primaryColor,
          secondaryColor: draft.secondaryColor ?? data.secondaryColor,
          logoMediaId: draft.logoMediaId ?? data.logoMediaId,
          faviconMediaId: draft.faviconMediaId ?? data.faviconMediaId,
          themePayload: draft.themePayload ?? data.themePayload,
          contactEmail: draft.contactEmail ?? data.contactEmail,
          contactPhone: draft.contactPhone ?? data.contactPhone,
          enableAdmissionsCta: draft.enableAdmissionsCta ?? data.enableAdmissionsCta,
        };
      } else if (!uiState.themePayload) {
        uiState.themePayload = {};
      }
      
      // Map publicSlug from school
      uiState.publicSlug = data.school?.publicSlug || "";
      
      setConfig(uiState);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (action: 'DRAFT' | 'PUBLISH') => {
    if (!config) return;
    setSaving(true);
    setError(null);
    
    try {
      const payload = {
        status: config.status,
        expectedVersion: config.version,
        publicSlug: config.publicSlug || undefined,
        publishAction: action,
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,
        logoMediaId: config.logoMediaId || undefined,
        faviconMediaId: config.faviconMediaId || undefined,
        themePayload: config.themePayload,
        contactEmail: config.contactEmail,
        contactPhone: config.contactPhone,
        enableAdmissionsCta: config.enableAdmissionsCta,
      };

      const updated = await apiClient.put<any>("v1/cms/admin/config", payload);
      
      // Refresh cleanly from server
      await fetchConfig();
      alert(action === 'PUBLISH' ? "Website published successfully!" : "Draft saved successfully!");
    } catch (err: any) {
      if (err.status === 409) {
        setError(err.message || "Settings were updated by someone else or slug is taken.");
      } else {
        setError(err.message || "Failed to update CMS settings");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><RefreshCw className="w-6 h-6 animate-spin text-slate-500" /></div>;
  }

  const publicUrl = config?.publicSlug ? `${window.location.origin}/${config.publicSlug}` : null;

  return (
    <div className="space-y-8 pb-12">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-4 rounded-xl gap-4">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">Public Website Slug</h2>
          <p className="text-sm text-slate-400">Set the URL where your school's website will be accessible.</p>
        </div>
        <div className="flex-1 flex flex-col w-full">
          <input 
            type="text"
            value={config?.publicSlug || ""}
            onChange={(e) => setConfig({...config, publicSlug: e.target.value})}
            placeholder="e.g. greenfield-international"
            className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500"
          />
          {config?.publicSlug && (
            <p className="text-xs text-emerald-400 mt-2 break-all">
              URL: {window.location.origin}/{config.publicSlug}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Palette className="w-5 h-5 text-indigo-400" /> Theme Colors</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={config?.primaryColor || "#0A192E"} onChange={(e) => setConfig({...config, primaryColor: e.target.value})} className="w-8 h-8 rounded border-0 bg-transparent p-0 cursor-pointer" />
                <input type="text" value={config?.primaryColor || "#0A192E"} onChange={(e) => setConfig({...config, primaryColor: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 text-sm text-white focus:border-indigo-500 flex-1" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={config?.secondaryColor || "#D2AD36"} onChange={(e) => setConfig({...config, secondaryColor: e.target.value})} className="w-8 h-8 rounded border-0 bg-transparent p-0 cursor-pointer" />
                <input type="text" value={config?.secondaryColor || "#D2AD36"} onChange={(e) => setConfig({...config, secondaryColor: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 text-sm text-white focus:border-indigo-500 flex-1" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Color Mode</label>
            <select 
              value={config?.themePayload?.colorMode || "light"}
              onChange={(e) => setConfig({...config, themePayload: {...config.themePayload, colorMode: e.target.value}})}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500"
            >
              <option value="light">Light Mode</option>
              <option value="dark">Dark Mode</option>
              <option value="system">System Preference</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Type className="w-5 h-5 text-indigo-400" /> Typography</h2>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Heading Font</label>
            <select 
              value={config?.themePayload?.fontHeading || "Inter"}
              onChange={(e) => setConfig({...config, themePayload: {...config.themePayload, fontHeading: e.target.value}})}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500"
            >
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Merriweather">Merriweather (Serif)</option>
              <option value="Playfair Display">Playfair Display (Serif)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Body Font</label>
            <select 
              value={config?.themePayload?.fontBody || "Inter"}
              onChange={(e) => setConfig({...config, themePayload: {...config.themePayload, fontBody: e.target.value}})}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500"
            >
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Open Sans">Open Sans</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Layout className="w-5 h-5 text-indigo-400" /> Media & Assets</h2>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">School Logo (Media ID)</label>
            <input 
              type="text"
              value={config?.logoMediaId || ""}
              onChange={(e) => setConfig({...config, logoMediaId: e.target.value})}
              placeholder="Paste media UUID"
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Favicon (Media ID)</label>
            <input 
              type="text"
              value={config?.faviconMediaId || ""}
              onChange={(e) => setConfig({...config, faviconMediaId: e.target.value})}
              placeholder="Paste media UUID"
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Hero Image (Media ID)</label>
            <input 
              type="text"
              value={config?.themePayload?.heroImageId || ""}
              onChange={(e) => setConfig({...config, themePayload: {...config.themePayload, heroImageId: e.target.value}})}
              placeholder="Paste media UUID"
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Layout className="w-5 h-5 text-indigo-400" /> Layout & Components</h2>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Border Radius Style</label>
            <select 
              value={config?.themePayload?.borderRadius || "rounded-md"}
              onChange={(e) => setConfig({...config, themePayload: {...config.themePayload, borderRadius: e.target.value}})}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500"
            >
              <option value="rounded-none">Sharp (Square)</option>
              <option value="rounded-md">Slight (Default)</option>
              <option value="rounded-xl">Rounded</option>
              <option value="rounded-full">Pill</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Homepage Template</label>
            <select 
              value={config?.themePayload?.homeTemplate || "modern"}
              onChange={(e) => setConfig({...config, themePayload: {...config.themePayload, homeTemplate: e.target.value}})}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500"
            >
              <option value="modern">Modern Hero</option>
              <option value="classic">Classic Academic</option>
              <option value="minimal">Minimal Focus</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 md:col-span-2">
          <h2 className="text-lg font-semibold text-white">Contact & Quick Links</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Contact Email</label>
              <input type="email" value={config?.contactEmail || ""} onChange={(e) => setConfig({...config, contactEmail: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Contact Phone</label>
              <input type="text" value={config?.contactPhone || ""} onChange={(e) => setConfig({...config, contactPhone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
            <input type="checkbox" id="enableAdmissionsCta" checked={config?.enableAdmissionsCta || false} onChange={(e) => setConfig({...config, enableAdmissionsCta: e.target.checked})} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500" />
            <label htmlFor="enableAdmissionsCta" className="text-sm font-medium text-slate-300 cursor-pointer">Enable "Apply Now" Admissions CTA</label>
          </div>
        </div>

      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 p-4 flex justify-between items-center px-12 z-10">
        <div className="flex gap-4">
          {publicUrl && (
            <>
              <a 
                href={`${publicUrl}?preview=true`} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-md transition-colors"
              >
                <Eye className="w-4 h-4" />
                Preview Draft
              </a>
              <a 
                href={publicUrl}
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-sm font-medium rounded-md transition-colors"
              >
                <Globe className="w-4 h-4" />
                View Public Website
              </a>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleSave('DRAFT')}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          
          <button
            onClick={() => handleSave('PUBLISH')}
            disabled={saving || !config?.publicSlug}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 shadow-lg"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Publish to Live
          </button>
        </div>
      </div>
    </div>
  );
}
