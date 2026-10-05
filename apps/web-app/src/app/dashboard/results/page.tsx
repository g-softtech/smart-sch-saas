"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  Award,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Sliders,
  BookOpen,
  Scale as ScaleIcon,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";

interface AcademicYear {
  id: string;
  name: string;
}

interface Term {
  id: string;
  name: string;
  academicYearId: string;
}

interface ClassItem {
  id: string;
  name: string;
}

interface ArmItem {
  id: string;
  name: string;
}

interface SubjectItem {
  id: string;
  name: string;
}

interface GradeBoundary {
  id: string;
  minScore: number;
  grade: string;
  remark?: string | null;
}

interface GradingScale {
  id: string;
  name: string;
  description?: string | null;
  boundaries: GradeBoundary[];
}

interface AcademicGradingConfig {
  id: string;
  academicYearId: string;
  termId: string;
  gradingScaleId: string;
  gradingScale: GradingScale;
}

interface AssessmentType {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
}

interface AssessmentComponent {
  id: string;
  academicYearId: string;
  termId: string;
  classId: string;
  armId?: string | null;
  subjectId: string;
  assessmentTypeId: string;
  assessmentType?: AssessmentType;
  title: string;
  maxScore: number;
  weight: number;
  class?: ClassItem;
  arm?: ArmItem;
  subject?: SubjectItem;
}

export default function ResultsAndGradingPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [arms, setArms] = useState<ArmItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>([]);

  // Selected Contexts
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  // Grading Scales & Config
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
  const [gradingConfig, setGradingConfig] = useState<AcademicGradingConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [selectedScaleId, setSelectedScaleId] = useState<string>("");

  // Assessment Components
  const [components, setComponents] = useState<AssessmentComponent[]>([]);
  const [componentsLoading, setComponentsLoading] = useState(false);

  // Form States
  const [newScaleName, setNewScaleName] = useState("");
  const [creatingScale, setCreatingScale] = useState(false);

  const [boundaryScaleId, setBoundaryScaleId] = useState("");
  const [boundaryMinScore, setBoundaryMinScore] = useState("");
  const [boundaryGrade, setBoundaryGrade] = useState("");
  const [boundaryRemark, setBoundaryRemark] = useState("");
  const [addingBoundary, setAddingBoundary] = useState(false);

  // Assessment Types Form State
  const [newTypeCode, setNewTypeCode] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDesc, setNewTypeDesc] = useState("");
  const [creatingType, setCreatingType] = useState(false);

  const [compTitle, setCompTitle] = useState("");
  const [compAssessmentTypeId, setCompAssessmentTypeId] = useState<string>("");
  const [compMaxScore, setCompMaxScore] = useState("40");
  const [compWeight, setCompWeight] = useState("40");
  const [compArmId, setCompArmId] = useState("");
  const [creatingComp, setCreatingComp] = useState(false);

  // Global Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load Initial Reference Data
  useEffect(() => {
    async function loadRefData() {
      try {
        const [yRes, tRes, cRes, sRes, scalesRes, typesRes] = await Promise.all([
          apiClient.get<AcademicYear[]>("/api/v1/academics/academic-years"),
          apiClient.get<Term[]>("/api/v1/academics/terms"),
          apiClient.get<ClassItem[]>("/api/v1/academics/classes"),
          apiClient.get<SubjectItem[]>("/api/v1/academics/subjects"),
          apiClient.get<any>("/api/v1/academics/results/scales"),
          apiClient.get<any>("/api/v1/academics/results/assessment-types"),
        ]);

        const yList = yRes || [];
        const tList = tRes || [];
        const cList = cRes || [];
        const sList = sRes || [];
        const scalesList = scalesRes?.data || scalesRes || [];
        const typesList = typesRes?.data || typesRes || [];

        setAcademicYears(yList);
        setTerms(tList);
        setClasses(cList);
        setSubjects(sList);
        setGradingScales(Array.isArray(scalesList) ? scalesList : []);
        setAssessmentTypes(Array.isArray(typesList) ? typesList : []);

        if (yList.length > 0) setSelectedYearId(yList[0].id);
        if (Array.isArray(typesList) && typesList.length > 0) {
          const firstActive = typesList.find((t: any) => t.isActive);
          if (firstActive) setCompAssessmentTypeId(firstActive.id);
        }
      } catch (err: any) {
        console.error("Failed to load reference data", err);
        setError("Failed to load academic reference data.");
      }
    }
    loadRefData();
  }, []);

  // Update terms when academic year changes
  useEffect(() => {
    if (selectedYearId) {
      const yearTerms = terms.filter((t) => t.academicYearId === selectedYearId);
      if (yearTerms.length > 0) {
        setSelectedTermId(yearTerms[0].id);
      } else {
        setSelectedTermId("");
      }
    }
  }, [selectedYearId, terms]);

  // Load Arms when class changes
  useEffect(() => {
    if (selectedClassId) {
      apiClient.get<ArmItem[]>(`/api/v1/academics/arms?classId=${selectedClassId}`).then((res) => {
        setArms(res || []);
      }).catch(() => setArms([]));
    } else {
      setArms([]);
    }
  }, [selectedClassId]);

  // Fetch Authoritative Grading Config for selected Year + Term
  const fetchGradingConfig = useCallback(async () => {
    if (!selectedYearId || !selectedTermId) return;
    try {
      setConfigLoading(true);
      const res = await apiClient.get<any>(
        `/api/v1/academics/results/grading-config?academicYearId=${selectedYearId}&termId=${selectedTermId}`
      );
      const config = res?.data !== undefined ? res.data : res;
      setGradingConfig(config || null);
      if (config?.gradingScaleId) {
        setSelectedScaleId(config.gradingScaleId);
      } else {
        setSelectedScaleId("");
      }
    } catch (err: any) {
      console.error("Failed to fetch grading config:", err);
      setGradingConfig(null);
    } finally {
      setConfigLoading(false);
    }
  }, [selectedYearId, selectedTermId]);

  useEffect(() => {
    fetchGradingConfig();
  }, [fetchGradingConfig]);

  // Fetch Assessment Components when Year + Term (+ optional Class/Subject) selected
  const fetchComponents = useCallback(async () => {
    if (!selectedYearId || !selectedTermId) {
      setComponents([]);
      return;
    }
    try {
      setComponentsLoading(true);
      let query = `academicYearId=${selectedYearId}&termId=${selectedTermId}`;
      if (selectedClassId) query += `&classId=${selectedClassId}`;
      if (selectedSubjectId) query += `&subjectId=${selectedSubjectId}`;

      const res = await apiClient.get<any>(`/api/v1/academics/results/components?${query}`);
      const list = res?.data !== undefined ? res.data : res;
      setComponents(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error("Failed to fetch assessment components:", err);
    } finally {
      setComponentsLoading(false);
    }
  }, [selectedYearId, selectedTermId, selectedClassId, selectedSubjectId]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  // Save / Assign Authoritative GradingScale to Year + Term
  const handleSaveGradingConfig = async () => {
    if (!selectedYearId || !selectedTermId || !selectedScaleId) {
      setError("Please select Academic Year, Term, and Grading Scale.");
      return;
    }
    try {
      setSavingConfig(true);
      setError(null);
      setSuccess(null);

      await apiClient.post("/api/v1/academics/results/grading-config", {
        academicYearId: selectedYearId,
        termId: selectedTermId,
        gradingScaleId: selectedScaleId,
      });

      setSuccess("Authoritative Grading Scale assigned successfully to term.");
      fetchGradingConfig();
    } catch (err: any) {
      setError(err.message || "Failed to assign grading scale to term.");
    } finally {
      setSavingConfig(false);
    }
  };

  // Create new Grading Scale
  const handleCreateScale = async () => {
    if (!newScaleName.trim()) return;
    try {
      setCreatingScale(true);
      setError(null);
      setSuccess(null);

      await apiClient.post("/api/v1/academics/results/scales", {
        name: newScaleName.trim(),
      });

      setSuccess(`Grading scale '${newScaleName}' created.`);
      setNewScaleName("");

      // Refresh scales list
      const scalesRes = await apiClient.get<any>("/api/v1/academics/results/scales");
      const list = scalesRes?.data || scalesRes || [];
      setGradingScales(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.message || "Failed to create grading scale.");
    } finally {
      setCreatingScale(false);
    }
  };

  // Add Grade Boundary to Scale
  const handleAddBoundary = async () => {
    if (!boundaryScaleId || boundaryMinScore === "" || !boundaryGrade.trim()) {
      setError("Please select scale, minimum score, and grade letter.");
      return;
    }
    try {
      setAddingBoundary(true);
      setError(null);
      setSuccess(null);

      await apiClient.post("/api/v1/academics/results/boundaries", {
        gradingScaleId: boundaryScaleId,
        minScore: Number(boundaryMinScore),
        grade: boundaryGrade.trim().toUpperCase(),
        remark: boundaryRemark.trim() || undefined,
      });

      setSuccess(`Grade boundary '${boundaryGrade}' added.`);
      setBoundaryMinScore("");
      setBoundaryGrade("");
      setBoundaryRemark("");

      // Refresh scales list & active config
      const scalesRes = await apiClient.get<any>("/api/v1/academics/results/scales");
      const list = scalesRes?.data || scalesRes || [];
      setGradingScales(Array.isArray(list) ? list : []);
      fetchGradingConfig();
    } catch (err: any) {
      setError(err.message || "Failed to add grade boundary.");
    } finally {
      setAddingBoundary(false);
    }
  };

  // Create Custom Assessment Type
  const handleCreateAssessmentType = async () => {
    if (!newTypeCode.trim() || !newTypeName.trim()) {
      setError("Please provide a type code (e.g. PRACTICAL) and name.");
      return;
    }
    try {
      setCreatingType(true);
      setError(null);
      setSuccess(null);

      const res = await apiClient.post<any>("/api/v1/academics/results/assessment-types", {
        code: newTypeCode.trim().toUpperCase(),
        name: newTypeName.trim(),
        description: newTypeDesc.trim() || undefined,
      });

      setSuccess(`Assessment Type '${newTypeName}' created successfully.`);
      setNewTypeCode("");
      setNewTypeName("");
      setNewTypeDesc("");

      const typesRes = await apiClient.get<any>("/api/v1/academics/results/assessment-types");
      const list = typesRes?.data || typesRes || [];
      setAssessmentTypes(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.message || "Failed to create assessment type.");
    } finally {
      setCreatingType(false);
    }
  };

  // Toggle Assessment Type active status
  const handleToggleAssessmentType = async (id: string) => {
    try {
      setError(null);
      setSuccess(null);
      await apiClient.put(`/api/v1/academics/results/assessment-types/${id}/toggle-active`, {});
      const typesRes = await apiClient.get<any>("/api/v1/academics/results/assessment-types");
      const list = typesRes?.data || typesRes || [];
      setAssessmentTypes(Array.isArray(list) ? list : []);
      setSuccess("Assessment type status updated.");
    } catch (err: any) {
      setError(err.message || "Failed to toggle assessment type.");
    }
  };

  // Create Assessment Component
  const handleCreateComponent = async () => {
    if (!selectedYearId || !selectedTermId || !selectedClassId || !selectedSubjectId || !compAssessmentTypeId || !compTitle.trim()) {
      setError("Please select Year, Term, Class, Subject, Assessment Type, and provide a component title.");
      return;
    }
    try {
      setCreatingComp(true);
      setError(null);
      setSuccess(null);

      await apiClient.post("/api/v1/academics/results/components", {
        academicYearId: selectedYearId,
        termId: selectedTermId,
        classId: selectedClassId,
        armId: compArmId || undefined,
        subjectId: selectedSubjectId,
        assessmentTypeId: compAssessmentTypeId,
        title: compTitle.trim(),
        maxScore: Number(compMaxScore),
        weight: Number(compWeight),
      });

      setSuccess(`Assessment Component '${compTitle}' created.`);
      setCompTitle("");

      fetchComponents();
    } catch (err: any) {
      setError(err.message || "Failed to create assessment component.");
    } finally {
      setCreatingComp(false);
    }
  };

  // Delete Assessment Component
  const handleDeleteComponent = async (id: string) => {
    try {
      setError(null);
      setSuccess(null);
      await apiClient.delete(`/api/v1/academics/results/components/${id}`);
      setSuccess("Assessment component removed.");
      fetchComponents();
    } catch (err: any) {
      setError(err.message || "Failed to delete assessment component.");
    }
  };

  // Component Weight Total calculation
  const totalWeight = components.reduce((sum, c) => sum + (c.weight || 0), 0);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ScaleIcon className="h-7 w-7 text-[#D2AD36]" />
            Results & Grading Engine Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure authoritative grading scales, termly grading rules, and assessment component weights.
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs text-rose-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-xs text-emerald-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Academic Context & Authoritative Grading Config Selector */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-[#D2AD36]" />
            <h2 className="text-lg font-bold text-white">Termly Authoritative Grading Configuration</h2>
          </div>
          {gradingConfig ? (
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" /> Configured ({gradingConfig.gradingScale.name})
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Missing Grading Config
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Academic Year
            </label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#D2AD36]"
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
            >
              <option value="">Select Academic Year...</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Academic Term
            </label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#D2AD36]"
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              disabled={!selectedYearId}
            >
              <option value="">Select Term...</option>
              {terms
                .filter((t) => t.academicYearId === selectedYearId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Authoritative Grading Scale
            </label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#D2AD36]"
              value={selectedScaleId}
              onChange={(e) => setSelectedScaleId(e.target.value)}
              disabled={!selectedTermId}
            >
              <option value="">Select Scale to Assign...</option>
              {gradingScales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.boundaries?.length || 0} boundaries)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveGradingConfig}
            disabled={savingConfig || !selectedScaleId}
            className="px-5 py-2.5 rounded-xl bg-[#D2AD36] hover:bg-[#c29d2b] text-slate-950 font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {savingConfig && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Authoritative Config
          </button>
        </div>

        {!gradingConfig && selectedTermId && !configLoading && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300 text-xs flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
            <span>
              <strong>Warning:</strong> No Authoritative Grading Configuration is set for this term. Gradebook saving and CBT score compilation will fail until a Grading Scale is assigned above.
            </span>
          </div>
        )}
      </div>

      {/* 2. Grading Scales & Boundaries Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Scale & Add Boundary */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <Sliders className="h-5 w-5 text-[#D2AD36]" />
            <h2 className="text-lg font-bold text-white">Grading Scales & Boundaries Authoring</h2>
          </div>

          {/* Create Scale */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Create New Grading Scale</h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Scale Name (e.g. Standard WAEC / O-Level)"
                value={newScaleName}
                onChange={(e) => setNewScaleName(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D2AD36]"
              />
              <button
                onClick={handleCreateScale}
                disabled={creatingScale || !newScaleName.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {creatingScale && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <Plus className="h-3.5 w-3.5" /> Create
              </button>
            </div>
          </div>

          {/* Add Boundary */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Add Grade Boundary to Scale</h3>
            <div className="space-y-3">
              <select
                value={boundaryScaleId}
                onChange={(e) => setBoundaryScaleId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D2AD36]"
              >
                <option value="">Select Target Scale...</option>
                {gradingScales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  placeholder="Min Score"
                  value={boundaryMinScore}
                  onChange={(e) => setBoundaryMinScore(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D2AD36]"
                />
                <input
                  type="text"
                  placeholder="Grade (e.g. A)"
                  value={boundaryGrade}
                  onChange={(e) => setBoundaryGrade(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D2AD36]"
                />
                <input
                  type="text"
                  placeholder="Remark (e.g. EXCELLENT)"
                  value={boundaryRemark}
                  onChange={(e) => setBoundaryRemark(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D2AD36]"
                />
              </div>

              <button
                onClick={handleAddBoundary}
                disabled={addingBoundary || !boundaryScaleId || boundaryMinScore === "" || !boundaryGrade.trim()}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {addingBoundary && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <Plus className="h-3.5 w-3.5 text-[#D2AD36]" /> Add Grade Boundary
              </button>
            </div>
          </div>
        </div>

        {/* Existing Scales List */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <Award className="h-5 w-5 text-[#D2AD36]" />
            <h2 className="text-lg font-bold text-white">Configured Scales & Boundaries</h2>
          </div>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {gradingScales.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No grading scales configured yet.</p>
            ) : (
              gradingScales.map((scale) => (
                <div key={scale.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-white">{scale.name}</h3>
                    <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-800 font-mono">
                      {scale.boundaries?.length || 0} boundaries
                    </span>
                  </div>

                  {scale.boundaries && scale.boundaries.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {scale.boundaries.map((b) => (
                        <div key={b.id} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                          <span className="block font-extrabold text-[#D2AD36]">{b.grade}</span>
                          <span className="block text-[10px] text-slate-400">≥ {b.minScore}%</span>
                          {b.remark && <span className="block text-[9px] text-slate-500 truncate">{b.remark}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. Assessment Components Configuration & 100% Weight Validation */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-[#D2AD36]" />
            <div>
              <h2 className="text-lg font-bold text-white">Subject Assessment Components & Weight Allocation</h2>
              <p className="text-xs text-slate-400">Configure CA, Exam, CBT, and Assignment weights per Class & Subject scope.</p>
            </div>
          </div>

          {/* Weight Validation Indicator */}
          {components.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Configured Total Weight:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  isWeightValid
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}
              >
                {isWeightValid ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
                {totalWeight}% {isWeightValid ? "(Valid 100%)" : "(Must equal 100%)"}
              </span>
            </div>
          )}
        </div>

        {/* Filters for Class and Subject */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
            >
              <option value="">Select Class...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Arm (Optional Override)</label>
            <select
              value={compArmId}
              onChange={(e) => setCompArmId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
              disabled={!selectedClassId}
            >
              <option value="">Class-wide (All Arms)</option>
              {arms.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Subject</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
            >
              <option value="">Select Subject...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-xs text-slate-500 block mb-2">Scope: {selectedClassId && selectedSubjectId ? "Ready" : "Select Class & Subject"}</span>
          </div>
        </div>

        {/* Assessment Types Management */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">School Assessment Types</h3>
            <span className="text-[10px] text-slate-400 font-mono">{assessmentTypes.length} types registered</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Code (e.g. PRACTICAL)"
              value={newTypeCode}
              onChange={(e) => setNewTypeCode(e.target.value.toUpperCase())}
              className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
            />
            <input
              type="text"
              placeholder="Name (e.g. Practical Exam)"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Description (Optional)"
                value={newTypeDesc}
                onChange={(e) => setNewTypeDesc(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
              />
              <button
                onClick={handleCreateAssessmentType}
                disabled={creatingType || !newTypeCode.trim() || !newTypeName.trim()}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shrink-0 disabled:opacity-50 transition-colors"
              >
                {creatingType && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {assessmentTypes.map((t) => (
              <div
                key={t.id}
                className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${
                  t.isActive
                    ? "bg-slate-900 border-slate-700 text-white"
                    : "bg-slate-950/40 border-slate-800/60 text-slate-500"
                }`}
              >
                <span className="font-bold">{t.name}</span>
                <span className="text-[10px] font-mono text-[#D2AD36]">({t.code})</span>
                {t.isSystem && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">System</span>
                )}
                {!t.isSystem && (
                  <button
                    onClick={() => handleToggleAssessmentType(t.id)}
                    className={`text-[10px] font-semibold underline ml-1 ${
                      t.isActive ? "text-amber-400 hover:text-amber-300" : "text-emerald-400 hover:text-emerald-300"
                    }`}
                  >
                    {t.isActive ? "Deactivate" : "Activate"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Component Creation Form */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Add Assessment Component</h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Assessment Type</label>
              <select
                value={compAssessmentTypeId}
                onChange={(e) => setCompAssessmentTypeId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
              >
                <option value="">Select Type...</option>
                {assessmentTypes
                  .filter((t) => t.isActive)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] text-slate-400 mb-1">Component Title</label>
              <input
                type="text"
                placeholder="e.g. Midterm CA or Laboratory Practical"
                value={compTitle}
                onChange={(e) => setCompTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Max Score</label>
              <input
                type="number"
                placeholder="e.g. 40"
                value={compMaxScore}
                onChange={(e) => setCompMaxScore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Weight (%)</label>
              <input
                type="number"
                placeholder="e.g. 40"
                value={compWeight}
                onChange={(e) => setCompWeight(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#D2AD36]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCreateComponent}
              disabled={creatingComp || !selectedClassId || !selectedSubjectId || !compAssessmentTypeId || !compTitle.trim()}
              className="px-4 py-2 rounded-xl bg-[#D2AD36] hover:bg-[#c29d2b] text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {creatingComp && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Plus className="h-3.5 w-3.5" /> Add Component
            </button>
          </div>
        </div>

        {/* Configured Components Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Assessment Components</h3>
          {componentsLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading components...</div>
          ) : components.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
              No assessment components configured for the selected scope yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="p-3">Title</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Scope</th>
                    <th className="p-3 text-right">Max Score</th>
                    <th className="p-3 text-right">Weight (%)</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {components.map((c) => (
                    <tr key={c.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-white">{c.title}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-[#D2AD36]">
                          {c.assessmentType?.name || c.assessmentType?.code || "Component"}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {c.class?.name} {c.arm ? `(${c.arm.name})` : "(Class-wide)"} • {c.subject?.name}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-200">{c.maxScore} pts</td>
                      <td className="p-3 text-right font-mono font-bold text-[#D2AD36]">{c.weight}%</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteComponent(c.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove component"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
