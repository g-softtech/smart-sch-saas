import { kernel } from "../index";
import { ResultsService } from "../../../apps/api-gateway/src/modules/academics/services/results.service";

async function main() {
  const grade3Class = await kernel.db.class.findFirst({ where: { name: { contains: 'grade 3', mode: 'insensitive' } } });
  const mathSubject = await kernel.db.subject.findFirst({ where: { name: { contains: 'math', mode: 'insensitive' } } });
  
  if (!grade3Class || !mathSubject) return;

  const resultsService = new ResultsService();
  
  // Find a component to get termId and academicYearId
  const comp = await kernel.db.assessmentComponent.findFirst({
      where: { classId: grade3Class.id, subjectId: mathSubject.id }
  });

  const adminComps = await kernel.db.assessmentComponent.findMany({
      where: {
          tenantId: grade3Class.tenantId,
          schoolId: grade3Class.schoolId,
          academicYearId: comp?.academicYearId,
          termId: comp?.termId,
          classId: grade3Class.id,
          subjectId: mathSubject.id,
      },
      include: { assessmentType: true }
  });

  const adminTotal = adminComps.reduce((acc, c) => acc + c.weight, 0);
  console.log(`Admin Total Weight: ${adminTotal}`);
  
  const teacherComps = await kernel.db.assessmentComponent.findMany({
      where: {
          tenantId: grade3Class.tenantId,
          schoolId: grade3Class.schoolId,
          academicYearId: comp?.academicYearId,
          termId: comp?.termId,
          classId: grade3Class.id,
          subjectId: mathSubject.id,
      },
      include: {
          class: true,
          arm: true,
          subject: true,
          assessmentType: true,
      },
      orderBy: { title: "asc" }
  });

  const teacherTotal = teacherComps.reduce((acc, c) => acc + c.weight, 0);
  console.log(`Teacher API Total Weight: ${teacherTotal}`);
  
  // Teacher UI fallback logic in Gradebook
  console.log(`\nTeacher UI components logic:`);
  let uiTotal = 0;
  teacherComps.forEach(c => {
      console.log(`- ${c.title} : maxScore=${c.maxScore}, weight=${c.weight}, type=${c.assessmentType?.name}`);
      uiTotal += c.weight;
  });
  console.log(`UI Total Weight: ${uiTotal}`);
}
main().catch(console.error).finally(() => process.exit(0));
