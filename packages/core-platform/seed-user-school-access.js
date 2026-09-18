const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  console.log('Backfilling UserSchoolAccess for non-SUPER_ADMIN users...');
  
  const memberships = await prisma.userTenantMembership.findMany({
    include: {
      role: true,
      tenant: {
        include: {
          schools: true
        }
      }
    }
  });

  let added = 0;

  for (const membership of memberships) {
    if (membership.role.name !== 'SUPER_ADMIN') {
      for (const school of membership.tenant.schools) {
        // Create UserSchoolAccess if it doesn't exist
        const existing = await prisma.userSchoolAccess.findFirst({
          where: {
            userId: membership.userId,
            schoolId: school.id,
            campusId: null
          }
        });

        if (!existing) {
          await prisma.userSchoolAccess.create({
            data: {
              userId: membership.userId,
              tenantId: membership.tenantId,
              schoolId: school.id
            }
          });
          added++;
        }
      }
    }
  }

  console.log(`Finished backfilling. Added ${added} UserSchoolAccess records.`);
}

fix().catch(console.error).finally(() => prisma.$disconnect());
