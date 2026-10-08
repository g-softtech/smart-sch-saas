const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function main() {
  const tenantId = 'cortex-tenant';
  const schoolId = 'cortex-school';
  const campusId = '773d893e-6f76-42ae-ad75-4058b4799553';
  const userId = 'cortex-admin-id';
  
  // Clean up first if any remnants
  try {
    await prisma.campus.deleteMany();
    await prisma.school.deleteMany();
    await prisma.userTenantMembership.deleteMany();
    await prisma.role.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
  } catch (e) {
    console.log("Cleanup failed or nothing to clean");
  }

  // 1. Create Tenant
  await prisma.tenant.create({
    data: {
      id: tenantId,
      name: 'Cortex',
      slug: 'cortex',
      status: 'ACTIVE'
    }
  });

  // 2. Create User
  await prisma.user.create({
    data: {
      id: userId,
      email: 'admin@schoolos.com', // or admin@cortex.edu
      globalRole: 'SUPER_ADMIN', // Just to give them access
    }
  });
  
  // 3. Create Role
  const role = await prisma.role.create({
    data: {
      tenantId: tenantId,
      name: 'ADMIN',
      isSystem: true
    }
  });

  // 4. Create Membership
  await prisma.userTenantMembership.create({
    data: {
      userId: userId,
      tenantId: tenantId,
      roleId: role.id,
      state: 'ACTIVE'
    }
  });

  // 5. Create School
  await prisma.school.create({
    data: {
      id: schoolId,
      tenantId: tenantId,
      name: 'Cortex School',
    }
  });

  // 6. Create Campus
  await prisma.campus.create({
    data: {
      id: campusId,
      tenantId: tenantId,
      schoolId: schoolId,
      name: 'Main Campus'
    }
  });
  
  console.log("Cortex DB seeded successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
