import { kernel } from "../index";
import { TeacherGradebookService } from "../../../../apps/api-gateway/src/modules/academics/services/teacher-gradebook.service";
import { ResultsEngineService } from "../../../../apps/api-gateway/src/modules/academics/services/results-engine.service";
import { AssignmentsService } from "../../../../apps/api-gateway/src/modules/assignments/services/assignments.service";

async function main() {
  const mathSubject = await kernel.db.subject.findFirst({ where: { name: { contains: 'math', mode: 'insensitive' } } });
  if (!mathSubject) throw new Error("Math not found");

  const components = await kernel.db.assessmentComponent.findMany({
      where: { subjectId: mathSubject.id, class: { name: { contains: 'grade 3', mode: 'insensitive' } } },
      include: { assessmentType: true }
  });

  const grade3Class = await kernel.db.class.findFirst({ where: { id: components[0]?.classId } });
  if (!grade3Class) throw new Error("Class not found from components");

  const subjectResult = await kernel.db.subjectResult.findFirst({
      where: { subjectId: mathSubject.id, enrollment: { classId: grade3Class.id } },
      include: { enrollment: true }
  });
  if (!subjectResult) throw new Error("No student enrolled with subject result");

  const tenantId = grade3Class.tenantId;
  const schoolId = grade3Class.schoolId;

  const assignmentsService = new AssignmentsService();
  assignmentsService.checkTeacherGradingAuthority = async () => ({ hasAuthority: true, scope: 'CLASS_WIDE' } as any);

  const teacherGradebookService = new TeacherGradebookService(
      new ResultsEngineService(),
      assignmentsService
  );
  teacherGradebookService['getTeacherStaffProfile'] = async () => ({ id: "mock-teacher-id" } as any);

  const caComp = components.find(c => c.title.includes("CA"));
  const cbtComp = components.find(c => c.title.includes("CBT"));
  const mockComp = components.find(c => c.title.includes("MOCK"));

  const q = { academicYearId: caComp!.academicYearId, termId: caComp!.termId, classId: grade3Class.id, subjectId: mathSubject.id };
  const userId = "mock-user-id";

  console.log("\n--- FRONTEND ENTRY ---");
  const payload = {
      ...q,
      entries: [
          {
              studentId: subjectResult.enrollment.studentId,
              scores: [
                  { assessmentComponentId: caComp!.id, score: 32, maxScore: caComp!.maxScore || 40, isAbsent: false },
                  { assessmentComponentId: cbtComp!.id, score: 40, maxScore: cbtComp!.maxScore || 50, isAbsent: false },
                  { assessmentComponentId: mockComp!.id, score: 8, maxScore: mockComp!.maxScore || 10, isAbsent: false },
              ]
          }
      ]
  };

  console.log("1. Frontend Save Draft Payload:");
  console.dir(payload, { depth: null });

  await teacherGradebookService.saveGradebookDraft(tenantId, schoolId, userId, payload);

  console.log("\n2. Database Rows immediately after saving:");
  const savedScores = await kernel.db.assessmentScore.findMany({
      where: { subjectResultId: subjectResult.id }
  });
  for (const sc of savedScores) {
      const comp = components.find(c => c.id === sc.assessmentComponentId);
      console.log(`- ${comp?.title || 'Unknown'} (ID: ${sc.assessmentComponentId}): Score = ${sc.score}/${sc.maxScore}`);
  }

  console.log("\n3. GET GradebookData Response:");
  const gradebook = await teacherGradebookService.getGradebook(tenantId, schoolId, userId, q);
  const studentData = gradebook.students.find((s: any) => s.studentId === subjectResult.enrollment.studentId);
  console.dir(studentData?.scores, { depth: null });
  
  console.log("\n4. Frontend Mapping Simulation:");
  const compScores: any = {};
  
  // The exact mapping logic from page.tsx:
  components.forEach((comp) => {
      // The API returns components via another route, so let's simulate the `activeComps`
      // Active comps from DB have `type` (which might be null in Phase 6G)
      const match = studentData?.scores.find(
          (sc: any) => sc.assessmentComponentId === comp.id || sc.type === comp.type
      );
      compScores[comp.id] = {
          title: comp.title, // Just for debugging
          assessmentComponentId: comp.id,
          type: comp.assessmentType?.code || comp.type || "COMPONENT",
          score: match?.score !== undefined && match?.score !== null ? String(match.score) : "",
          mappedFromScoreId: match?.assessmentScoreId
      };
  });
  
  console.dir(compScores, { depth: null });

}
main().catch(console.error).finally(() => process.exit(0));
