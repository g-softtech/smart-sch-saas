const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMembership() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@schoolos.com' } });
  if (!user) throw new Error("User not found");

  const tenant = await prisma.tenant.findFirst({ where: { name: 'Test Tenant' } });
  if (!tenant) throw new Error("Tenant not found");

  // Check if role exists
  let role = await prisma.role.findFirst({ where: { tenantId: tenant.id, name: 'ADMIN' } });
  if (!role) {
    role = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'ADMIN',
        isSystem: true
      }
    });
  }

  // Create Membership
  await prisma.userTenantMembership.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
    update: { state: 'ACTIVE', roleId: role.id, isRevoked: false },
    create: {
      userId: user.id,
      tenantId: tenant.id,
      state: 'ACTIVE',
      roleId: role.id,
      isRevoked: false
    }
  });

  console.log('Membership fixed!');
}

fixMembership().catch(console.error).finally(() => prisma.$disconnect());
