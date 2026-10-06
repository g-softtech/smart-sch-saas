import { kernel } from "../index";

async function main() {
  const components = await kernel.db.assessmentComponent.findMany({
    where: {
      subject: { name: { contains: 'math', mode: 'insensitive' } },
      class: { name: { contains: 'grade 3', mode: 'insensitive' } }
    },
    include: {
      assessmentType: true,
      subject: true,
      class: true
    }
  });
  console.log('Math Assessment Components for Grade 3 Types:');
  console.log(components.map(c => ({ title: c.title, weight: c.weight, type: c.assessmentType?.name, assessmentTypeId: c.assessmentTypeId })));
}
main().catch(console.error).finally(() => process.exit(0));
