import { kernel } from "../index";

async function main() {
  const mathSubject = await kernel.db.subject.findFirst({ where: { name: { contains: 'math', mode: 'insensitive' } } });
  
  const subjectResult = await kernel.db.subjectResult.findFirst({
      where: { scores: { some: {} } },
      include: { scores: true, enrollment: { include: { student: true } } }
  });
  if (!subjectResult) throw new Error("No subject results with scores found!");

  const components = await kernel.db.assessmentComponent.findMany({
      where: { subjectId: subjectResult.subjectId },
      include: { assessmentType: true }
  });

  console.log("Database Subject Result for Student:");
  console.log(`Student: ${subjectResult!.enrollment.student.firstName} ${subjectResult!.enrollment.student.lastName}`);
  console.log(`SubjectResult Total: ${subjectResult!.totalScore}`);
  console.log(`Grade: ${subjectResult!.grade}`);
  console.log("\nAssessment Component | Assessment Type | Score | Max Score");

  for (const score of subjectResult!.scores) {
      const comp = components.find(c => c.id === score.assessmentComponentId);
      console.log(`${comp?.title || "Unknown"} | ${comp?.assessmentType?.code || "Unknown"} | ${score.score} | ${score.maxScore}`);
  }

  console.log("\nRaw API Response Shape (from WorkflowService):");
  console.dir(subjectResult!.scores, { depth: null });
}
main().catch(console.error).finally(() => process.exit(0));
