"use client";
import React, { useState, useEffect, useRef } from "react";
import { Save, AlertCircle, RefreshCw, Palette, Type, Layout, Eye, Globe, Upload, X, Image } from "lucide-react";
import { apiClient } from "@/lib/api-client";

// ─── Media Upload Widget ──────────────────────────────────────────────────────

interface MediaUploadProps {
  label: string;
  currentMediaId?: string | null;
  currentPreviewUrl?: string | null;
  onUploaded: (mediaId: string, filename: string, serveUrl: string) => void;
  onCleared: () => void;
  accept?: string;
  hint?: string;
}

function MediaUploadWidget({ label, currentMediaId, currentPreviewUrl, onUploaded, onCleared, accept = "image/*", hint }: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  const previewSrc = localPreview || currentPreviewUrl || null;

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > 5 * 1024 * 1024) { setError("File exceeds 5 MB limit"); return; }
    const allowed = ["image/png","image/jpeg","image/jpg","image/webp","image/gif","image/svg+xml","image/x-icon","image/vnd.microsoft.icon"];
    if (!allowed.includes(file.type)) { setError("Unsupported file type. Use PNG, JPG, WebP, SVG, ICO, or GIF."); return; }

    // show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setLocalPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      // Use the established apiClient to automatically attach access_token, x-tenant-id, etc.
      const data = await apiClient.postFormData<any>("v1/cms/admin/media/upload", formData);
      
      setFilename(data.filename);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
      const serveUrl = `${apiUrl}/v1/cms/admin/media/${data.id}/serve`;
      onUploaded(data.id, data.filename, serveUrl);
    } catch (err: any) {
      setError(err.message);
      setLocalPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleClear = () => {
    setLocalPreview(null);
    setFilename(null);
    setError(null);
    onCleared();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}

      {previewSrc ? (
        <div className="relative group w-full max-w-xs">
          <img
            src={previewSrc}
            alt={label}
            className="w-full max-h-32 object-contain rounded-lg border border-slate-700 bg-slate-950 p-2"
          />
          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium"
            >
              {uploading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-md"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          {filename && <p className="mt-1 text-xs text-slate-400 truncate">{filename}</p>}
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 w-full max-w-xs h-28 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl bg-slate-950 cursor-pointer transition-colors group"
        >
          {uploading ? (
            <><RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" /><span className="text-xs text-slate-400">Uploading…</span></>
          ) : (
            <><Image className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 transition-colors" /><span className="text-xs text-slate-400 group-hover:text-slate-300">Click or drop to upload</span></>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function WebsiteSettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001')
    : '';

  const mediaServeUrl = (id?: string | null) =>
    id ? `${apiBase}/v1/cms/admin/media/${id}/serve` : null;

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<any>("v1/cms/admin/config");
      let uiState: any = { ...data };
      if (data.themePayload?.workingDraft) {
        const d = data.themePayload.workingDraft;
        uiState = {
          ...uiState,
          primaryColor: d.primaryColor ?? data.primaryColor,
          secondaryColor: d.secondaryColor ?? data.secondaryColor,
          logoMediaId: d.logoMediaId ?? data.logoMediaId,
          faviconMediaId: d.faviconMediaId ?? data.faviconMediaId,
          themePayload: d.themePayload ?? data.themePayload,
          contactEmail: d.contactEmail ?? data.contactEmail,
          contactPhone: d.contactPhone ?? data.contactPhone,
          enableAdmissionsCta: d.enableAdmissionsCta ?? data.enableAdmissionsCta,
        };
      } else if (!uiState.themePayload) {
        uiState.themePayload = {};
      }
      uiState.publicSlug = data.school?.publicSlug || "";
      setConfig(uiState);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

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
        themePayload: {
          ...(config.themePayload || {}),
          heroImageMediaId: config.heroImageMediaId || undefined,
        },
        contactEmail: config.contactEmail,
        contactPhone: config.contactPhone,
        enableAdmissionsCta: config.enableAdmissionsCta,
      };
      await apiClient.put<any>("v1/cms/admin/config", payload);
      if (config.publicSlug) {
         try {
             await fetch('/api/revalidate', { 
                 method: 'POST', 
                 body: JSON.stringify({ tags: [`school-slug-${config.publicSlug}`, `cms-site-${config.tenantId || ''}-${config.schoolId || ''}`] }) 
             });
         } catch(e) {}
      }
      await fetchConfig();
      alert(action === 'PUBLISH' ? "Website published successfully!" : "Draft saved successfully!");
    } catch (err: any) {
      if (err.status === 409) {
        setError(err.message || "Settings conflict — someone else may have changed this. Please refresh.");
      } else {
        setError(err.message || "Failed to update CMS settings");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
    </div>
  );

  const publicUrl = config?.publicSlug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/${config.publicSlug}` : null;
  const heroMediaId = config?.themePayload?.heroImageMediaId || null;

  return (
    <div className="space-y-8 pb-24">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" /><p>{error}</p>
        </div>
      )}

      {/* ─── Slug ─── */}
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
              URL: {typeof window !== 'undefined' ? window.location.origin : ''}/{config.publicSlug}
            </p>
          )}
        </div>
      </div>

      {/* ─── Media Assets ─── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Layout className="w-5 h-5 text-indigo-400" /> Brand Assets
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <MediaUploadWidget
            label="School Logo"
            currentMediaId={config?.logoMediaId}
            currentPreviewUrl={mediaServeUrl(config?.logoMediaId)}
            hint="PNG, SVG, or WebP — shown in the site header"
            onUploaded={(id, name, url) => setConfig((c: any) => ({ ...c, logoMediaId: id }))}
            onCleared={() => setConfig((c: any) => ({ ...c, logoMediaId: null }))}
          />
          <MediaUploadWidget
            label="Favicon"
            currentMediaId={config?.faviconMediaId}
            currentPreviewUrl={mediaServeUrl(config?.faviconMediaId)}
            hint="ICO, PNG, or SVG — browser tab icon"
            accept="image/x-icon,image/png,image/svg+xml"
            onUploaded={(id, name, url) => setConfig((c: any) => ({ ...c, faviconMediaId: id }))}
            onCleared={() => setConfig((c: any) => ({ ...c, faviconMediaId: null }))}
          />
          <MediaUploadWidget
            label="Homepage Hero Image"
            currentMediaId={heroMediaId}
            currentPreviewUrl={mediaServeUrl(heroMediaId)}
            hint="Large banner image — recommended 1920×600 px"
            onUploaded={(id, name, url) => setConfig((c: any) => ({ ...c, themePayload: { ...(c.themePayload || {}), heroImageMediaId: id } }))}
            onCleared={() => setConfig((c: any) => ({ ...c, themePayload: { ...(c.themePayload || {}), heroImageMediaId: null } }))}
          />
        </div>
      </div>

      {/* ─── Colors ─── */}
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
              <label className="block text-sm font-medium text-slate-300 mb-1">Secondary / Accent Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={config?.secondaryColor || "#D2AD36"} onChange={(e) => setConfig({...config, secondaryColor: e.target.value})} className="w-8 h-8 rounded border-0 bg-transparent p-0 cursor-pointer" />
                <input type="text" value={config?.secondaryColor || "#D2AD36"} onChange={(e) => setConfig({...config, secondaryColor: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 text-sm text-white focus:border-indigo-500 flex-1" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Color Mode</label>
            <select value={config?.themePayload?.colorMode || "light"} onChange={(e) => setConfig({...config, themePayload: {...config.themePayload, colorMode: e.target.value}})} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500">
              <option value="light">Light Mode</option><option value="dark">Dark Mode</option><option value="system">System Preference</option>
            </select>
          </div>
        </div>

        {/* ─── Typography ─── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Type className="w-5 h-5 text-indigo-400" /> Typography</h2>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Heading Font</label>
            <select value={config?.themePayload?.fontHeading || "Inter"} onChange={(e) => setConfig({...config, themePayload: {...config.themePayload, fontHeading: e.target.value}})} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500">
              <option value="Inter">Inter</option><option value="Roboto">Roboto</option><option value="Merriweather">Merriweather (Serif)</option><option value="Playfair Display">Playfair Display (Serif)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Body Font</label>
            <select value={config?.themePayload?.fontBody || "Inter"} onChange={(e) => setConfig({...config, themePayload: {...config.themePayload, fontBody: e.target.value}})} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500">
              <option value="Inter">Inter</option><option value="Roboto">Roboto</option><option value="Open Sans">Open Sans</option>
            </select>
          </div>
        </div>

        {/* ─── Layout ─── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Layout className="w-5 h-5 text-indigo-400" /> Layout & Components</h2>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Border Radius Style</label>
            <select value={config?.themePayload?.borderRadius || "rounded-md"} onChange={(e) => setConfig({...config, themePayload: {...config.themePayload, borderRadius: e.target.value}})} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500">
              <option value="rounded-none">Sharp (Square)</option><option value="rounded-md">Slight (Default)</option><option value="rounded-xl">Rounded</option><option value="rounded-full">Pill</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Homepage Template</label>
            <select value={config?.themePayload?.homeTemplate || "modern"} onChange={(e) => setConfig({...config, themePayload: {...config.themePayload, homeTemplate: e.target.value}})} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500">
              <option value="modern">Modern Hero</option><option value="classic">Classic Academic</option><option value="minimal">Minimal Focus</option>
            </select>
          </div>
        </div>

        {/* ─── Contact ─── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          <h2 className="text-lg font-semibold text-white">Contact & Quick Links</h2>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Contact Email</label>
            <input type="email" value={config?.contactEmail || ""} onChange={(e) => setConfig({...config, contactEmail: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Contact Phone</label>
            <input type="text" value={config?.contactPhone || ""} onChange={(e) => setConfig({...config, contactPhone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:border-indigo-500" />
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
            <input type="checkbox" id="enableAdmissionsCta" checked={config?.enableAdmissionsCta || false} onChange={(e) => setConfig({...config, enableAdmissionsCta: e.target.checked})} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500" />
            <label htmlFor="enableAdmissionsCta" className="text-sm font-medium text-slate-300 cursor-pointer">Enable "Apply Now" Admissions CTA</label>
          </div>
        </div>
      </div>

      {/* ─── Fixed Action Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 p-4 flex justify-between items-center px-12 z-10">
        <div className="flex gap-4">
          {publicUrl && (
            <>
              <a href={`${publicUrl}?preview=true`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-md transition-colors">
                <Eye className="w-4 h-4" /> Preview Draft
              </a>
              <a href={publicUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-sm font-medium rounded-md transition-colors">
                <Globe className="w-4 h-4" /> View Public Website
              </a>
            </>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleSave('DRAFT')} disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button onClick={() => handleSave('PUBLISH')} disabled={saving || !config?.publicSlug}
            title={!config?.publicSlug ? "Set a public slug before publishing" : ""}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 shadow-lg">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Publish to Live
          </button>
        </div>
      </div>
    </div>
  );
}
