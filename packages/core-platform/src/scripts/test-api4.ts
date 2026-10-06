import { kernel } from "../index";

async function main() {
  const grade3Classes = await kernel.db.class.findMany({ where: { name: { contains: 'grade 3', mode: 'insensitive' } } });
  const mathSubjects = await kernel.db.subject.findMany({ where: { name: { contains: 'math', mode: 'insensitive' } } });
  
  for (const cls of grade3Classes) {
    for (const sub of mathSubjects) {
      const comps = await kernel.db.assessmentComponent.findMany({
          where: { classId: cls.id, subjectId: sub.id },
          include: { assessmentType: true }
      });
      if (comps.length > 0) {
        console.log(`\nFound components for Class [${cls.name}] and Subject [${sub.name}]:`);
        comps.forEach(c => console.log(`- ${c.title} (weight: ${c.weight}) - isActive: ${c.assessmentType?.isActive}`));
        const total = comps.reduce((acc, c) => acc + c.weight, 0);
        console.log(`Total Weight: ${total}`);
      }
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
