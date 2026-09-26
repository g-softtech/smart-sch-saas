"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface Term {
  id: string;
  name: string;
  academicYearId: string;
  startDate: string;
  endDate: string;
}

export interface Class {
  id: string;
  name: string;
}

export interface FeeStructure {
  id: string;
  name: string;
  academicYearId: string;
  termId: string;
  classId: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  studentNumber?: string;
  admissionNumber?: string;
  status?: string;
}

export interface Enrollment {
  id: string;
  academicYearId: string;
  classId: string;
  armId?: string;
  status: string;
  academicYear?: { id: string; name: string };
  class?: { id: string; name: string };
  arm?: { id: string; name: string };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAcademicYears() {
  const [data, setData] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .get("api/v1/academics/academic-years?take=100")
      .then((res: unknown) => {
        if (!cancelled) setData(Array.isArray(res) ? res : []);
      })
      .catch((e: Error | unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load academic years");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}

export function useTerms(academicYearId: string | null) {
  const [data, setData] = useState<Term[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!academicYearId) {
      // Intentionally not setting state here to avoid cascade renders,
      // as data starts [] anyway and reset happens on change.
      return;
    }
    setLoading(true);
    setError(null);
    apiClient
      .get("api/v1/academics/terms?take=100")
      .then((res: unknown) => {
        if (!cancelled) {
          const all: Term[] = Array.isArray(res) ? res : [];
          setData(all.filter((t) => t.academicYearId === academicYearId));
        }
      })
      .catch((e: Error | unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load terms");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [academicYearId]);

  return { data, loading, error };
}

export function useClasses() {
  const [data, setData] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .get("api/v1/academics/classes?take=200")
      .then((res: unknown) => {
        if (!cancelled) setData(Array.isArray(res) ? res : []);
      })
      .catch((e: Error | unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load classes");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}

export function useArms(classId?: string | null) {
  const [data, setData] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    let url = "api/v1/academics/arms?take=200";
    if (classId) url += `&classId=${classId}`;

    apiClient
      .get(url)
      .then((res: unknown) => {
        if (!cancelled) setData(Array.isArray(res) ? res : []);
      })
      .catch((e: Error | unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load arms");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [classId]);

  return { data, loading, error };
}

export function useSubjects() {
  const [data, setData] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .get("api/v1/academics/subjects?take=200")
      .then((res: unknown) => {
        if (!cancelled) setData(Array.isArray(res) ? res : []);
      })
      .catch((e: Error | unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load subjects");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}

export function useFeeStructures(
  academicYearId: string | null,
  termId: string | null,
  classId: string | null,
) {
  const [data, setData] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .get("api/v1/finance/fee-structures?take=200")
      .then((res: unknown) => {
        if (!cancelled) {
          let all: FeeStructure[] = Array.isArray(res) ? res : [];
          if (academicYearId) all = all.filter((f) => f.academicYearId === academicYearId);
          if (termId) all = all.filter((f) => f.termId === termId);
          if (classId) all = all.filter((f) => f.classId === classId);
          setData(all);
        }
      })
      .catch((e: Error | unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load fee structures");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [academicYearId, termId, classId]);

  return { data, loading, error };
}

export function useStudentSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res: unknown = await apiClient.get(
        `api/v1/students?search=${encodeURIComponent(q.trim())}&limit=20`,
      );
      setResults(Array.isArray(res) ? res : []);
    } catch (e: Error | unknown) {
      setError(e instanceof Error ? e.message : "Failed to search students");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { query, results, loading, error, search };
}

export function useStudentEnrollments(studentId: string | null) {
  const [data, setData] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!studentId) {
      return;
    }
    setLoading(true);
    setError(null);
    apiClient
      .get(`api/v1/students/${studentId}/enrollments`)
      .then((res: unknown) => {
        if (!cancelled) setData(Array.isArray(res) ? res : []);
      })
      .catch((e: Error | unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load enrollments");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [studentId]);

// Return the most recent ACTIVE enrollment for prefill
  const activeEnrollment = data.find((e) => e.status === "ACTIVE") ?? data[0] ?? null;
  return { data, activeEnrollment, loading, error };
}

export function useClassRoster(
  academicYearId: string | null,
  classId: string | null,
  armId?: string | null,
) {
  const [data, setData] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!academicYearId || !classId) {
      setData([]);
      return;
    }
    setLoading(true);
    setError(null);

    let url = `api/v1/students?academicYearId=${academicYearId}&classId=${classId}&limit=100`;
    if (armId) url += `&armId=${armId}`;

    apiClient
      .get(url)
      .then((res: unknown) => {
        if (!cancelled) {
          // The API returns paginated data: { success: true, data: [...], meta: {...} }
          // apiClient might unwrap 'data' depending on interceptors, let's handle both
          const payload = res as any;
          if (Array.isArray(payload)) {
            setData(payload);
          } else if (payload && Array.isArray(payload.data)) {
            setData(payload.data);
          } else {
            setData([]);
          }
        }
      })
      .catch((e: Error | unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load class roster");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [academicYearId, classId, armId]);

  return { data, loading, error };
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function studentDisplayName(s: Student): string {
  const name = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ");
  const ref = s.admissionNumber ?? s.studentNumber;
  return ref ? `${name} — ${ref}` : name;
}
