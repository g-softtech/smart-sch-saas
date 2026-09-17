const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const userId = 'cf9d70e8-5a01-4fe2-adbf-5bbf76c6284c';
  const tenantId = 'dabb35dc-a40a-414c-a3d7-5caaa01a5fb9';
  
  // Create or get role
  let role = await prisma.role.findFirst({
    where: { tenantId, name: 'SUPER_ADMIN' }
  });
  
  if (!role) {
    role = await prisma.role.create({
      data: {
        tenantId,
        name: 'SUPER_ADMIN'
      }
    });
  }
  
  // Create membership
  const existingMembership = await prisma.userTenantMembership.findFirst({
    where: { userId, tenantId }
  });
  
  if (!existingMembership) {
    await prisma.userTenantMembership.create({
      data: {
        userId,
        tenantId,
        roleId: role.id,
        state: 'ACTIVE'
      }
    });
    console.log('Membership created!');
  } else {
    await prisma.userTenantMembership.update({
      where: { id: existingMembership.id },
      data: { roleId: role.id, state: 'ACTIVE' }
    });
    console.log('Membership updated!');
  }
  
}

fix().catch(console.error).finally(() => prisma.$disconnect());
