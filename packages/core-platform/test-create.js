const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Find a tenant and school
    const tenant = await prisma.tenant.findFirst();
    const school = await prisma.school.findFirst({ where: { tenantId: tenant.id } });
    
    console.log("Tenant:", tenant.id);
    console.log("School:", school.id);
    
    const year = await prisma.academicYear.create({
      data: {
        tenantId: tenant.id,
        schoolId: school.id,
        name: "TestYear" + Date.now(),
      }
    });
    console.log("Created successfully:", year);
  } catch (e) {
    console.error("Error creating:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
