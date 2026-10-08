"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Save, Loader2, GripVertical, Eye } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --- Types ---
export interface CmsLayoutSection {
  id: string;
  enabled: boolean;
  order: number;
}

export interface CmsLayoutConfig {
  hero: CmsLayoutSection;
  about: CmsLayoutSection;
  events: CmsLayoutSection;
  gallery: CmsLayoutSection;
  leadership: CmsLayoutSection;
  blog: CmsLayoutSection;
  announcements: CmsLayoutSection;
  contact: CmsLayoutSection;
  footer: CmsLayoutSection;
}

export interface CmsThemeConfig {
  fontFamily: string;
  headingFontFamily: string;
  baseFontSize: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
}

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero Section",
  about: "About Us",
  events: "Upcoming Events",
  gallery: "Image Gallery",
  leadership: "Leadership & Staff",
  blog: "Blog & News",
  announcements: "Announcements",
  contact: "Contact Form",
  footer: "Site Footer",
};

const DEFAULT_THEME: CmsThemeConfig = {
  fontFamily: "Inter",
  headingFontFamily: "Inter",
  baseFontSize: "16px",
  primaryColor: "#4f46e5",
  secondaryColor: "#1e1e2f",
  backgroundColor: "#0f172a",
  textColor: "#f8fafc",
};

const DEFAULT_LAYOUT: CmsLayoutConfig = {
  hero: { id: "hero", enabled: true, order: 1 },
  about: { id: "about", enabled: true, order: 2 },
  events: { id: "events", enabled: true, order: 3 },
  gallery: { id: "gallery", enabled: true, order: 4 },
  leadership: { id: "leadership", enabled: true, order: 5 },
  blog: { id: "blog", enabled: true, order: 6 },
  announcements: { id: "announcements", enabled: true, order: 7 },
  contact: { id: "contact", enabled: true, order: 8 },
  footer: { id: "footer", enabled: true, order: 9 },
};

// --- Sortable Item Component ---
function SortableItem({ id, section, onToggle }: { id: string; section: CmsLayoutSection; onToggle: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 mb-3 rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm group"
    >
      <div className="flex items-center gap-4">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:bg-slate-700 p-2 rounded text-slate-400 group-hover:text-slate-200"
        >
          <GripVertical className="w-5 h-5" />
        </div>
        <span className="font-medium text-slate-200">{SECTION_LABELS[id]}</span>
      </div>
      <div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={section.enabled}
            onChange={() => onToggle(id)}
          />
          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>
    </div>
  );
}

// --- Main Page Component ---
export default function CmsBuilderPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"layout" | "theme">("layout");
  
  // The complete config from backend
  const [config, setConfig] = useState<any>(null);

  // Derived state for editing
  const [layout, setLayout] = useState<CmsLayoutConfig>(DEFAULT_LAYOUT);
  const [theme, setTheme] = useState<CmsThemeConfig>(DEFAULT_THEME);
  const [sectionsOrder, setSectionsOrder] = useState<string[]>([]);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<any>("v1/cms/admin/config");
      setConfig(data);
      
      if (data.layoutPayload) {
        setLayout(data.layoutPayload);
        const sortedIds = Object.keys(data.layoutPayload).sort(
          (a, b) => data.layoutPayload[a].order - data.layoutPayload[b].order
        );
        setSectionsOrder(sortedIds);
      } else {
        setSectionsOrder(Object.keys(DEFAULT_LAYOUT));
      }

      if (data.themePayload) {
        setTheme({ ...DEFAULT_THEME, ...data.themePayload });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Compute new order values based on sectionsOrder array
      const newLayout = { ...layout };
      sectionsOrder.forEach((id, index) => {
        newLayout[id as keyof CmsLayoutConfig].order = index + 1;
      });

      const payload = {
        expectedVersion: config?.expectedVersion || 0,
        status: config?.status || "DRAFT",
        enableAdmissionsCta: config?.enableAdmissionsCta ?? true,
        layoutPayload: newLayout,
        themePayload: theme,
      };

      const updated = await apiClient.put<any>("v1/cms/admin/config", payload);
      
      setConfig(updated);
      alert("Saved successfully!");
    } catch (err: any) {
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // DnD Handlers
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setSectionsOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleSection = (id: string) => {
    setLayout((prev) => ({
      ...prev,
      [id as keyof CmsLayoutConfig]: {
        ...prev[id as keyof CmsLayoutConfig],
        enabled: !prev[id as keyof CmsLayoutConfig].enabled,
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Site Builder</h2>
          <p className="text-sm text-slate-400">Design your public facing website layout and theme</p>
        </div>
        <div className="flex gap-3">
          <a 
            href={config?.school?.publicSlug ? `/${config.school.publicSlug}` : '#'}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium border border-slate-700"
          >
            <Eye className="w-4 h-4" />
            Preview
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab("layout")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === "layout" ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Layout
            </button>
            <button
              onClick={() => setActiveTab("theme")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === "theme" ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Theme
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            {activeTab === "layout" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">Sections</h3>
                  <p className="text-sm text-slate-400 mb-4">Drag to reorder sections. Toggle to show/hide.</p>
                </div>
                
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={sectionsOrder} strategy={verticalListSortingStrategy}>
                    {sectionsOrder.map((id) => (
                      <SortableItem 
                        key={id} 
                        id={id} 
                        section={layout[id as keyof CmsLayoutConfig]} 
                        onToggle={toggleSection}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {activeTab === "theme" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">Appearance</h3>
                  <p className="text-sm text-slate-400 mb-4">Customize the look and feel.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Primary Color</label>
                    <div className="flex gap-3">
                      <input 
                        type="color" 
                        value={theme.primaryColor}
                        onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent p-0"
                      />
                      <input 
                        type="text" 
                        value={theme.primaryColor}
                        onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Secondary Color</label>
                    <div className="flex gap-3">
                      <input 
                        type="color" 
                        value={theme.secondaryColor}
                        onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent p-0"
                      />
                      <input 
                        type="text" 
                        value={theme.secondaryColor}
                        onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Background Color</label>
                    <div className="flex gap-3">
                      <input 
                        type="color" 
                        value={theme.backgroundColor}
                        onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent p-0"
                      />
                      <input 
                        type="text" 
                        value={theme.backgroundColor}
                        onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Text Color</label>
                    <div className="flex gap-3">
                      <input 
                        type="color" 
                        value={theme.textColor}
                        onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent p-0"
                      />
                      <input 
                        type="text" 
                        value={theme.textColor}
                        onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8">
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-[800px] flex flex-col relative">
            <div className="bg-slate-900 border-b border-slate-800 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                  <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                  <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                </div>
                <div className="ml-4 bg-slate-800 text-slate-400 text-xs px-3 py-1 rounded-md max-w-sm w-64 truncate flex gap-1">
                  <span className="text-slate-500">https://</span>
                  {config?.school?.publicSlug || 'school'}.schoolos.com
                </div>
              </div>
            </div>
            <div className="flex-1 p-8 bg-slate-900/50 overflow-y-auto">
              <div className="w-full max-w-2xl mx-auto space-y-6">
                <div className="text-center text-slate-500 text-sm mb-8">
                  Wireframe Preview
                </div>
                
                {sectionsOrder.map((id) => {
                  const section = layout[id as keyof CmsLayoutConfig];
                  if (!section?.enabled) return null;
                  
                  return (
                    <div 
                      key={`preview-${id}`}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-8 flex items-center justify-center min-h-[160px] shadow-sm relative overflow-hidden group transition-all"
                      style={{
                        borderColor: theme.primaryColor + '40',
                      }}
                    >
                      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: theme.primaryColor }}></div>
                      <h4 className="text-2xl font-bold tracking-tight text-white/80">{SECTION_LABELS[id]}</h4>
                    </div>
                  );
                })}

                {sectionsOrder.every(id => !layout[id as keyof CmsLayoutConfig]?.enabled) && (
                  <div className="text-center py-20 text-slate-500">
                    No sections enabled. Your website will be blank!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
