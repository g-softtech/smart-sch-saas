import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const cbtType = await prisma.assessmentType.findFirst({ where: { name: { contains: 'cbt', mode: 'insensitive' } } });
  console.log("CBT Type IsActive:", cbtType?.isActive);

  const grade3Class = await prisma.class.findFirst({ where: { name: { contains: 'grade 3', mode: 'insensitive' } } });
  const mathSubject = await prisma.subject.findFirst({ where: { name: { contains: 'math', mode: 'insensitive' } } });
  
  if (!grade3Class || !mathSubject) return;

  const comps = await prisma.assessmentComponent.findMany({
      where: {
          tenantId: grade3Class.tenantId,
          schoolId: grade3Class.schoolId,
          classId: grade3Class.id,
          subjectId: mathSubject.id,
      },
      include: { assessmentType: true }
  });

  const validComps = comps.filter(c => c.assessmentType?.isActive);
  
  const uiTotal = validComps.reduce((acc, c) => acc + c.weight, 0);
  const realTotal = comps.reduce((acc, c) => acc + c.weight, 0);

  console.log(`UI Total Weight (if filtered by isActive): ${uiTotal}`);
  console.log(`Real Total Weight: ${realTotal}`);
  
  comps.forEach(c => {
    console.log(`- ${c.title} (weight: ${c.weight}) - isActive: ${c.assessmentType?.isActive}`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
