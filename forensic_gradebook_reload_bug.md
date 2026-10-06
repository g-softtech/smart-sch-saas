# Phase 6J Forensic Investigation: Gradebook Save/Reload Corruption

## Executive Summary

The bug described is highly specific and accurately reproduced by tracing the frontend and backend payloads. The core issue is a **frontend mapping bug** in `apps/web-app/src/app/portal/teacher/gradebook/page.tsx` during the translation of the API response back into the UI state. 

It causes the very first score in the student's record (e.g., the CA score) to be mistakenly applied to **all** assessment components. If a Teacher enters `23` into the first box, the frontend reloads and displays `23` in every box. When the teacher saves again, those duplicated `23`s are written to the database, resulting in `23 + 23 + 23 = 69`.

**The database and backend calculation engines are fully intact and correct. The corruption occurs exclusively during GET/mapping in the React state.**

---

## 1. Exact Trace Flow

### A. FRONTEND ENTRY & PAYLOAD CONSTRUCTION
The Teacher enters: `CA = 32`, `CBT TERM = 40`, `MOCK = 8`.
The frontend `handleSaveDraft` correctly constructs the payload mapping exactly by component ID:
```javascript
scores: [
  { assessmentComponentId: 'ca-id', score: 32 },
  { assessmentComponentId: 'cbt-id', score: 40 },
  { assessmentComponentId: 'mock-id', score: 8 }
]
```

### B. BACKEND SAVE DRAFT (`TeacherGradebookService.saveGradebookDraft`)
The backend iterates through `dto.entries` and cleanly upserts the database rows matching by `subjectResultId` and `assessmentComponentId`.
**At this exact moment, the Database is 100% correct:**
- `AssessmentScore` (CA) = 32
- `AssessmentScore` (CBT) = 40
- `AssessmentScore` (MOCK) = 8

### C. REFRESH & GET GRADEBOOK (`TeacherGradebookService.getGradebook`)
The frontend reloads and calls `getGradebook`. The backend returns the `scores` array accurately mapping the saved data, but it omits the legacy `.type` string:
```javascript
scores: res.scores.map((s) => ({
    assessmentScoreId: s.id,
    assessmentComponentId: s.assessmentComponentId,
    score: s.score,
    maxScore: s.maxScore,
    isAbsent: s.isAbsent ?? false,
}))
// NOTE: `sc.type` is missing from the API response payload and is therefore `undefined`.
```

### D. THE CORRUPTION (Frontend Mapping in `page.tsx`)
Inside `loadGradebook`, the frontend takes the `activeComps` (from `/components`) and iterates through them to map the `s.scores` array back to the UI state:
```javascript
activeComps.forEach((comp) => {
    const match = s.scores.find(
        (sc) => sc.assessmentComponentId === comp.id || sc.type === comp.type
    );
```

**What goes wrong here:**
JavaScript's `Array.prototype.find()` executes sequentially. Let's trace it for the `CBT` component:
1. It checks the first item in the array (the `CA` score which has `assessmentComponentId = "ca-id"`).
2. It evaluates `sc.assessmentComponentId === comp.id` (`"ca-id" === "cbt-id"` -> `false`).
3. It falls back to evaluating `sc.type === comp.type`.
4. Because the backend omitted `.type`, `sc.type` is `undefined`.
5. Because Phase 6G components use `assessmentType` relations rather than legacy `.type` columns, `comp.type` is also `undefined`.
6. Therefore, `undefined === undefined` evaluates to **`TRUE`**.

Because it evaluated to `TRUE` on the very first item in the array, `.find()` immediately stops and assigns the `CA` score object to the `CBT` component. It does the exact same thing for the `MOCK` component.

**Result:**
The UI renders the `CA` score (e.g. `23`) into the CA box, the CBT box, and the MOCK box. 

### E. SECOND SAVE (The Database Corruption)
When the teacher hits "Save Draft" again without changing anything, the payload sent to the backend is now:
```javascript
scores: [
  { assessmentComponentId: 'ca-id', score: 23 },
  { assessmentComponentId: 'cbt-id', score: 23 },
  { assessmentComponentId: 'mock-id', score: 23 }
]
```
The backend dutifully persists these values, corrupting the database.

---

## 2. Answers to Specific Required Evidence

1. **Frontend Save Draft Payload:** Sends perfect `assessmentComponentId` and `score` pairings initially.
2. **`saveGradebookDraft` Update Loop:** Safe. It explicitly queries and updates by `assessmentComponentId`. It cannot accidentally reuse records.
3. **Identifier Tracing:** Perfect on the way IN. `assessmentComponentId` is passed correctly.
4. **Prisma Write:** Correctly updates 3 separate rows initially.
5. **Persisted Rows Immediately After First Save:**
   - CA: 32/40
   - CBT: 40/50
   - MOCK: 8/10
   *(Database is correct at this stage).*
6. **GET GradebookData Response:** Correctly returns the 3 separate scores, but entirely omits the `type` field.
7. **Frontend Mapping:** The root cause is a **stale fallback logic collision** (`sc.type === comp.type`) combined with `undefined === undefined` causing `Array.find()` to aggressively match the 0th element array element.
8. **Origin of "23":** `23` was simply the value of the CA score (or the first score in the array). The bug duplicated the 1st component's value into the 2nd and 3rd components.
9. **`SubjectResult.totalScore` Calculation:** `69` is accurately calculated from the corrupted data (`23 + 23 + 23`) saved during the second "Save Draft" pass.
10. **ResultsEngine:** Fully dynamic and mathematically correct. No patches required.

## Conclusion & Proposed Fix
The issue is 100% isolated to `apps/web-app/src/app/portal/teacher/gradebook/page.tsx` line 254. 
The fallback `|| sc.type === comp.type` is dangerous in Phase 6G where `type` might be undefined on both sides.

**Proposed fix:**
Strictly bind scores using `assessmentComponentId` and remove the legacy type fallback which is causing the collision.
```javascript
const match = s.scores.find(
  (sc) => sc.assessmentComponentId === comp.id
);
```
