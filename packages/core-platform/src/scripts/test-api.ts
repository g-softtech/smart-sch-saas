import { kernel } from "../index";

async function main() {
  const grade3Class = await kernel.db.class.findFirst({ where: { name: { contains: 'grade 3', mode: 'insensitive' } } });
  const mathSubject = await kernel.db.subject.findFirst({ where: { name: { contains: 'math', mode: 'insensitive' } } });
  
  if (!grade3Class || !mathSubject) {
    console.log("Could not find class or subject");
    return;
  }

  // Admin API equivalent
  const adminComponents = await kernel.db.assessmentComponent.findMany({
    where: {
      tenantId: grade3Class.tenantId,
      schoolId: grade3Class.schoolId,
      classId: grade3Class.id,
      subjectId: mathSubject.id,
      // Term/Academic year inferred from first component for testing
    },
    include: {
      assessmentType: true,
    }
  });

  const termId = adminComponents[0]?.termId;
  const academicYearId = adminComponents[0]?.academicYearId;

  const filteredAdmin = adminComponents.filter(c => c.termId === termId && c.academicYearId === academicYearId);

  console.log("====== ADMIN API (All Components) ======");
  filteredAdmin.forEach(c => console.log(`${c.title.padEnd(20)} = ${c.weight}`));
  const adminTotal = filteredAdmin.reduce((sum, c) => sum + c.weight, 0);
  console.log(`Total                = ${adminTotal}`);

  // Teacher UI equivalent logic
  // Teacher gradebook UI fetches the exact same endpoint, but let's check what it actually displays
  // Is it possible the frontend filters by AssessmentType.isSystem? No, we didn't find filter.
  // Is it possible the backend endpoint filters by something?
  // Let's call the actual ResultsService method
  console.log("\n====== TEACHER API (ResultsService) ======");
  
  const teacherComponents = await kernel.db.assessmentComponent.findMany({
      where: {
        tenantId: grade3Class.tenantId,
        schoolId: grade3Class.schoolId,
        academicYearId,
        termId,
        classId: grade3Class.id,
        subjectId: mathSubject.id,
      },
      include: {
        class: true,
        arm: true,
        subject: true,
        assessmentType: true,
      },
      orderBy: { title: "asc" },
  });

  teacherComponents.forEach(c => console.log(`${c.title.padEnd(20)} = ${c.weight} (type: ${c.assessmentType?.name})`));
  const teacherTotal = teacherComponents.reduce((sum, c) => sum + c.weight, 0);
  console.log(`Total                = ${teacherTotal}`);
  
  console.log("\n====== RESULTS ENGINE ACTUAL USAGE ======");
  // Logic from recalculateSubjectResult:
  const activeComponentsMap = new Map<string, any>();
    for (const comp of teacherComponents) {
      const existing = activeComponentsMap.get(comp.assessmentTypeId);
      if (!existing) {
        activeComponentsMap.set(comp.assessmentTypeId, comp);
      } else {
        if (comp.armId !== null) {
          activeComponentsMap.set(comp.assessmentTypeId, comp);
        }
      }
    }
    
  const engineComponents = Array.from(activeComponentsMap.values());
  engineComponents.forEach(c => console.log(`${c.title.padEnd(20)} = ${c.weight} (typeId: ${c.assessmentTypeId})`));
  const engineTotal = engineComponents.reduce((sum, c) => sum + c.weight, 0);
  console.log(`Total                = ${engineTotal}`);

}
main().catch(console.error).finally(() => process.exit(0));
