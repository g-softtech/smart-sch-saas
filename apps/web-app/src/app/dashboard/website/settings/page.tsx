
"use client";
import React, { useState, useEffect, useRef } from "react";
import { Save, AlertCircle, RefreshCw, Palette, Upload, X, Image as ImageIcon, ChevronDown, ChevronRight, Check } from "lucide-react";
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
    if (!allowed.includes(file.type)) { setError("Unsupported file type."); return; }

    const reader = new FileReader();
    reader.onload = (e) => setLocalPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
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
          <img src={previewSrc} alt={label} className="w-full max-h-32 object-contain rounded-lg border border-slate-700 bg-slate-950 p-2" />
          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium">
              {uploading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            </button>
            <button type="button" onClick={handleClear} className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-md">
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
            <><ImageIcon className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 transition-colors" /><span className="text-xs text-slate-400 group-hover:text-slate-300">Click or drop to upload</span></>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}</p>}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
    </div>
  );
}

// ─── Section Editor Component ──────────────────────────────────────────────────

function SectionEditor({ title, isEnabled, onToggle, children, isProvisioned = false }: { title: string, isEnabled: boolean, onToggle: (val: boolean) => void, children: React.ReactNode, isProvisioned?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden mb-4 bg-slate-900/50">
      <div className="flex items-center justify-between p-4 bg-slate-800/80 hover:bg-slate-800 cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
          <h3 className="font-semibold text-slate-200">{title}</h3>
          {isProvisioned && <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">Provisioned for Future</span>}
        </div>
        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-medium text-slate-400">{isEnabled ? 'Enabled' : 'Disabled'}</span>
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={isEnabled} onChange={(e) => onToggle(e.target.checked)} disabled={isProvisioned} />
              <div className={`block w-10 h-6 rounded-full transition-colors ${isEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isEnabled ? 'translate-x-4' : ''}`}></div>
            </div>
          </label>
        </div>
      </div>
      {expanded && (
        <div className="p-6 border-t border-slate-700 bg-slate-900/30 space-y-4">
          {isProvisioned ? (
             <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200/80 text-sm">
                This section is conceptually provisioned but will be deeply integrated with authoritative SchoolOS domains (e.g. Events, Staff) in a future update. For now, it remains disabled.
             </div>
          ) : children}
        </div>
      )}
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

const DEFAULT_SECTIONS = {
  hero: { enabled: true, headline: "Welcome to our School", subheadline: "Excellence in Education", primaryCta: "Apply Now" },
  about: { enabled: true, title: "About Us", introduction: "", mission: "", vision: "" },
  whyChooseUs: { enabled: true, points: "Experienced Teachers\nModern Facilities\nStrong Results" },
  academics: { enabled: true, content: "" },
  schoolLife: { enabled: false, content: "" },
  facilities: { enabled: false, items: "" },
  admissions: { enabled: true, requirements: "", process: "" },
  news: { enabled: true },
  events: { enabled: false }, // Provisioned
  gallery: { enabled: false, mediaIds: [] },
  leadership: { enabled: false, staff: [] }, // Provisioned
  testimonials: { enabled: false, items: [] },
  faq: { enabled: false, items: [] },
  contact: { enabled: true, address: "", phone: "", email: "" }
};

export default function WebsiteSettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001')
    : '';

  const fetchConfig = async () => {
    try {
      const res = await apiClient.get<{ data: any }>("v1/cms/admin/config");
      const data = res.data;
      let uiState = { ...data };
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
      
      // Initialize sections
      if (!uiState.themePayload.sections) {
        uiState.themePayload.sections = JSON.parse(JSON.stringify(DEFAULT_SECTIONS));
      } else {
        // Merge with defaults in case of new sections
        uiState.themePayload.sections = {
          ...JSON.parse(JSON.stringify(DEFAULT_SECTIONS)),
          ...uiState.themePayload.sections
        };
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
          sections: config.themePayload.sections
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

  if (!config) return (
    <div className="p-12 text-center">
      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg inline-block">{error}</div>
      ) : (
        <div className="text-slate-400">Failed to load configuration.</div>
      )}
    </div>
  );

  const publicUrl = config?.publicSlug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/${config.publicSlug}` : null;
  const sections = config.themePayload.sections;
  
  const updateSection = (key: string, field: string, value: any) => {
    setConfig({
      ...config,
      themePayload: {
        ...config.themePayload,
        sections: {
          ...config.themePayload.sections,
          [key]: { ...config.themePayload.sections[key], [field]: value }
        }
      }
    });
  };

  return (
    <div className="space-y-8 pb-32 max-w-4xl">
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl border border-slate-800">
         <div>
            <h1 className="text-2xl font-bold text-white mb-2">Single-Page Website Builder</h1>
            <p className="text-slate-400 text-sm max-w-lg">Configure your entire school website seamlessly from this single interface. Enabled sections will automatically appear on your public homepage and generate top-level navigation links.</p>
         </div>
         <div className="flex flex-col gap-3">
             <button
                onClick={() => handleSave('DRAFT')}
                disabled={saving}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors border border-slate-700"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSave('PUBLISH')}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Publish to Live
              </button>
         </div>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" /><p>{error}</p>
        </div>
      )}

      {/* ─── Identity ─── */}
      <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Palette className="w-5 h-5 text-indigo-400" /> School Identity & Slug</h2>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">Public Website Slug</label>
          <div className="flex rounded-md overflow-hidden border border-slate-700">
            <span className="px-3 py-2 bg-slate-900 text-slate-500 text-sm border-r border-slate-700 select-none">
              {typeof window !== 'undefined' ? window.location.host : 'schoolos.com'}/
            </span>
            <input
              type="text"
              value={config.publicSlug || ""}
              onChange={(e) => setConfig({ ...config, publicSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
              className="flex-1 bg-slate-950 px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. cortex-school"
            />
          </div>
          {publicUrl && (
            <p className="text-xs mt-2">
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline flex items-center gap-1">
                Preview Public Site <ChevronRight className="w-3 h-3" />
              </a>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-700/50">
          <MediaUploadWidget
            label="School Logo"
            currentMediaId={config.logoMediaId}
            currentPreviewUrl={config.logoMediaId ? `${apiBase}/v1/cms/admin/media/${config.logoMediaId}/serve` : null}
            onUploaded={(id) => setConfig({ ...config, logoMediaId: id })}
            onCleared={() => setConfig({ ...config, logoMediaId: null })}
          />
          <MediaUploadWidget
            label="Favicon (Icon)"
            accept="image/png,image/x-icon,image/vnd.microsoft.icon"
            currentMediaId={config.faviconMediaId}
            currentPreviewUrl={config.faviconMediaId ? `${apiBase}/v1/cms/admin/media/${config.faviconMediaId}/serve` : null}
            onUploaded={(id) => setConfig({ ...config, faviconMediaId: id })}
            onCleared={() => setConfig({ ...config, faviconMediaId: null })}
          />
        </div>
      </div>

      {/* ─── Sections ─── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white px-2">Homepage Sections</h2>
        
        {/* HERO */}
        <SectionEditor 
            title="Hero Section" 
            isEnabled={sections.hero?.enabled} 
            onToggle={(val) => updateSection('hero', 'enabled', val)}
        >
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Headline</label>
                    <input type="text" value={sections.hero?.headline || ""} onChange={e => updateSection('hero', 'headline', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Sub-headline / Tagline</label>
                    <input type="text" value={sections.hero?.subheadline || ""} onChange={e => updateSection('hero', 'subheadline', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                 </div>
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Primary Call-to-Action (Admissions)</label>
                <input type="text" value={sections.hero?.primaryCta || ""} onChange={e => updateSection('hero', 'primaryCta', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
             </div>
             <div className="pt-4 border-t border-slate-700/50">
                <MediaUploadWidget
                  label="Hero Background Image"
                  currentMediaId={config.heroImageMediaId}
                  currentPreviewUrl={config.heroImageMediaId ? `${apiBase}/v1/cms/admin/media/${config.heroImageMediaId}/serve` : null}
                  onUploaded={(id) => setConfig({ ...config, heroImageMediaId: id })}
                  onCleared={() => setConfig({ ...config, heroImageMediaId: null })}
                  hint="A high-quality wide image representing your school."
                />
             </div>
          </div>
        </SectionEditor>

        {/* ABOUT */}
        <SectionEditor 
            title="About Us" 
            isEnabled={sections.about?.enabled} 
            onToggle={(val) => updateSection('about', 'enabled', val)}
        >
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Section Title</label>
                <input type="text" value={sections.about?.title || "About Us"} onChange={e => updateSection('about', 'title', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Introduction</label>
                <textarea rows={3} value={sections.about?.introduction || ""} onChange={e => updateSection('about', 'introduction', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Mission</label>
                    <textarea rows={3} value={sections.about?.mission || ""} onChange={e => updateSection('about', 'mission', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Vision</label>
                    <textarea rows={3} value={sections.about?.vision || ""} onChange={e => updateSection('about', 'vision', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                 </div>
             </div>
          </div>
        </SectionEditor>

        {/* WHY CHOOSE US */}
        <SectionEditor title="Why Choose Us" isEnabled={sections.whyChooseUs?.enabled} onToggle={(val) => updateSection('whyChooseUs', 'enabled', val)}>
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Bullet Points (One per line)</label>
                <textarea rows={5} placeholder="Experienced Teachers\nModern Facilities..." value={sections.whyChooseUs?.points || ""} onChange={e => updateSection('whyChooseUs', 'points', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
             </div>
          </div>
        </SectionEditor>

        {/* ACADEMICS */}
        <SectionEditor title="Academics" isEnabled={sections.academics?.enabled} onToggle={(val) => updateSection('academics', 'enabled', val)}>
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Curriculum & Approach</label>
                <textarea rows={5} value={sections.academics?.content || ""} onChange={e => updateSection('academics', 'content', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
             </div>
          </div>
        </SectionEditor>
        
        {/* SCHOOL LIFE */}
        <SectionEditor title="School Life" isEnabled={sections.schoolLife?.enabled} onToggle={(val) => updateSection('schoolLife', 'enabled', val)}>
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Extracurriculars & Clubs</label>
                <textarea rows={5} value={sections.schoolLife?.content || ""} onChange={e => updateSection('schoolLife', 'content', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
             </div>
          </div>
        </SectionEditor>

        {/* ADMISSIONS */}
        <SectionEditor title="Admissions" isEnabled={sections.admissions?.enabled} onToggle={(val) => updateSection('admissions', 'enabled', val)}>
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Admission Requirements</label>
                <textarea rows={3} value={sections.admissions?.requirements || ""} onChange={e => updateSection('admissions', 'requirements', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Process</label>
                <textarea rows={3} value={sections.admissions?.process || ""} onChange={e => updateSection('admissions', 'process', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
             </div>
             <p className="text-xs text-slate-400 mt-2"><AlertCircle className="inline w-3 h-3 mr-1" /> The "Apply Now" button will automatically route applicants to the authoritative SchoolOS Admissions portal.</p>
          </div>
        </SectionEditor>
        
        {/* NEWS */}
        <SectionEditor title="News / Announcements" isEnabled={sections.news?.enabled} onToggle={(val) => updateSection('news', 'enabled', val)}>
          <div className="p-4 bg-slate-800/50 rounded-lg text-slate-300 text-sm">
             <Check className="inline w-4 h-4 mr-2 text-emerald-400" />
             This section automatically pulls published articles from your CMS Announcements database. No manual configuration needed here!
          </div>
        </SectionEditor>

        {/* CONTACT */}
        <SectionEditor title="Contact & Footer" isEnabled={sections.contact?.enabled} onToggle={(val) => updateSection('contact', 'enabled', val)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Public Email</label>
                <input type="email" value={config.contactEmail || ""} onChange={e => setConfig({ ...config, contactEmail: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Public Phone</label>
                <input type="text" value={config.contactPhone || ""} onChange={e => setConfig({ ...config, contactPhone: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
             </div>
             <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Physical Address</label>
                <textarea rows={3} value={sections.contact?.address || ""} onChange={e => updateSection('contact', 'address', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
             </div>
          </div>
        </SectionEditor>

        {/* PROVISIONED DOMAINS */}
        <SectionEditor title="Events" isEnabled={false} onToggle={()=>{}} isProvisioned={true}>null</SectionEditor>
        <SectionEditor title="Leadership / Staff" isEnabled={false} onToggle={()=>{}} isProvisioned={true}>null</SectionEditor>

      </div>
    </div>
  );
}
