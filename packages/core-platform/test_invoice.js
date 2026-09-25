const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { studentId: '191e5e3d-7697-42bb-82e3-c35177637f3e' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        academicYear: true,
        term: true
      }
    });
    console.log(invoices);
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
