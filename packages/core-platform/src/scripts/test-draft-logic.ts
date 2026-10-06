import { kernel } from "../index";
import { TeacherGradebookService } from "../../../apps/api-gateway/src/modules/academics/services/teacher-gradebook.service";
import { ResultsEngineService } from "../../../apps/api-gateway/src/modules/academics/services/results-engine.service";
import { AssignmentsService } from "../../../apps/api-gateway/src/modules/assignments/services/assignments.service";

async function main() {
  const grade3Class = await kernel.db.class.findFirst({ where: { name: { contains: 'grade 3', mode: 'insensitive' } } });
  const mathSubject = await kernel.db.subject.findFirst({ where: { name: { contains: 'math', mode: 'insensitive' } } });
  
  if (!grade3Class || !mathSubject) return;

  const result = await kernel.db.subjectResult.findFirst({
      where: { classId: grade3Class.id, subjectId: mathSubject.id },
      include: { enrollment: { include: { student: true } }, scores: true }
  });

  if (!result) {
      console.log("No SubjectResult found for Grade 3 Math to test with.");
      return;
  }

  console.log(`Initial DB SubjectResult totalScore: ${result.totalScore}`);

  const teacherGradebookService = new TeacherGradebookService(
      new ResultsEngineService(),
      new AssignmentsService()
  );

  // We will manually invoke saveGradebookDraft or just check the logic visually
  console.log("If we call saveGradebookDraft, it just saves AssessmentScore records and explicitly skips recalculating SubjectResult totalScore.");
}
main().catch(console.error).finally(() => process.exit(0));
