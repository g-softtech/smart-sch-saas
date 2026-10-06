import { kernel } from "../index";
import { TeacherGradebookService } from "../../../../apps/api-gateway/src/modules/academics/services/teacher-gradebook.service";
import { ResultsEngineService } from "../../../../apps/api-gateway/src/modules/academics/services/results-engine.service";
import { AssignmentsService } from "../../../../apps/api-gateway/src/modules/assignments/services/assignments.service";

async function main() {
  const grade3Class = await kernel.db.class.findFirst({ where: { name: { contains: 'grade 3', mode: 'insensitive' } } });
  const mathSubject = await kernel.db.subject.findFirst({ where: { name: { contains: 'math', mode: 'insensitive' } } });
  
  if (!grade3Class || !mathSubject) throw new Error("Grade 3 or Math not found");

  const components = await kernel.db.assessmentComponent.findMany({
      where: { classId: grade3Class.id, subjectId: mathSubject.id }
  });

  const caComp = components.find(c => c.title.includes("CA"));
  const cbtComp = components.find(c => c.title.includes("CBT"));
  const mockComp = components.find(c => c.title.includes("MOCK"));

  if (!caComp || !cbtComp || !mockComp) throw new Error("Missing one of CA, CBT, MOCK");

  const enrollment = await kernel.db.enrollment.findFirst({
      where: { classId: grade3Class.id, status: "ACTIVE" }
  });
  if (!enrollment) throw new Error("No student enrolled");

  const assignmentsService = new AssignmentsService();
  assignmentsService.checkTeacherGradingAuthority = async () => ({
      hasAuthority: true,
      scope: 'CLASS_WIDE'
  } as any);

  const teacherGradebookService = new TeacherGradebookService(
      new ResultsEngineService(),
      assignmentsService
  );
  teacherGradebookService['getTeacherStaffProfile'] = async () => ({
      id: "mock-teacher-id"
  } as any);

  const tenantId = grade3Class.tenantId;
  const schoolId = grade3Class.schoolId;
  const userId = "mock-user-id";
  const academicYearId = caComp.academicYearId;
  const termId = caComp.termId;

  const q = { academicYearId, termId, classId: grade3Class.id, subjectId: mathSubject.id };

  console.log("\n--- TEST 1: DRAFT FOR 80% ---");
  await teacherGradebookService.saveGradebookDraft(tenantId, schoolId, userId, {
      ...q,
      scores: [
          { enrollmentId: enrollment.id, assessmentComponentId: caComp.id, score: 32 },
          { enrollmentId: enrollment.id, assessmentComponentId: cbtComp.id, score: 40 },
          { enrollmentId: enrollment.id, assessmentComponentId: mockComp.id, score: 8 }
      ]
  });

  let gradebook = await teacherGradebookService.getGradebook(tenantId, schoolId, userId, q);
  let student = gradebook.students.find((s: any) => s.enrollmentId === enrollment.id);
  console.log("Draft Saved. Student TotalScore in DB (should NOT be 80 yet):", student?.totalScore);

  console.log("\n--- TEST 2: SUBMIT FOR 80% ---");
  await teacherGradebookService.submitGradebook(tenantId, schoolId, userId, {
      ...q,
      scores: [
          { enrollmentId: enrollment.id, assessmentComponentId: caComp.id, score: 32 },
          { enrollmentId: enrollment.id, assessmentComponentId: cbtComp.id, score: 40 },
          { enrollmentId: enrollment.id, assessmentComponentId: mockComp.id, score: 8 }
      ]
  });

  gradebook = await teacherGradebookService.getGradebook(tenantId, schoolId, userId, q);
  student = gradebook.students.find((s: any) => s.enrollmentId === enrollment.id);
  console.log("Submitted. Student TotalScore in DB (should be 80):", student?.totalScore);

  console.log("\n--- TEST 3: DRAFT FOR 50% ---");
  await teacherGradebookService.saveGradebookDraft(tenantId, schoolId, userId, {
      ...q,
      scores: [
          { enrollmentId: enrollment.id, assessmentComponentId: caComp.id, score: 20 },
          { enrollmentId: enrollment.id, assessmentComponentId: cbtComp.id, score: 25 },
          { enrollmentId: enrollment.id, assessmentComponentId: mockComp.id, score: 5 }
      ]
  });

  gradebook = await teacherGradebookService.getGradebook(tenantId, schoolId, userId, q);
  student = gradebook.students.find((s: any) => s.enrollmentId === enrollment.id);
  console.log("Draft Saved. Student TotalScore in DB (should STILL be 80, not 50):", student?.totalScore);

  console.log("\n--- TEST 4: SUBMIT FOR 50% ---");
  await teacherGradebookService.submitGradebook(tenantId, schoolId, userId, {
      ...q,
      scores: [
          { enrollmentId: enrollment.id, assessmentComponentId: caComp.id, score: 20 },
          { enrollmentId: enrollment.id, assessmentComponentId: cbtComp.id, score: 25 },
          { enrollmentId: enrollment.id, assessmentComponentId: mockComp.id, score: 5 }
      ]
  });

  gradebook = await teacherGradebookService.getGradebook(tenantId, schoolId, userId, q);
  student = gradebook.students.find((s: any) => s.enrollmentId === enrollment.id);
  console.log("Submitted. Student TotalScore in DB (should be 50):", student?.totalScore);

}
main().catch(console.error).finally(() => process.exit(0));
