const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function fix() {
  console.log('Connecting to:', process.env.DATABASE_URL.split('@')[1]);
  const tenantId = 'dabb35dc-a40a-414c-a3d7-5caaa01a5fb9';
  
  const user = await prisma.user.findUnique({ where: { email: 'admin@schoolos.com' } });
  if (!user) {
    console.log('User admin@schoolos.com not found!');
    return;
  }
  console.log('User found:', user.id);

  let role = await prisma.role.findFirst({
    where: { tenantId, name: 'SUPER_ADMIN' }
  });
  if (!role) {
    role = await prisma.role.create({
      data: { tenantId, name: 'SUPER_ADMIN' }
    });
  }

  const existingMembership = await prisma.userTenantMembership.findFirst({
    where: { userId: user.id, tenantId }
  });
  
  if (!existingMembership) {
    await prisma.userTenantMembership.create({
      data: { userId: user.id, tenantId, roleId: role.id, state: 'ACTIVE' }
    });
    console.log('Membership created for Neon!');
  } else {
    await prisma.userTenantMembership.update({
      where: { id: existingMembership.id },
      data: { roleId: role.id, state: 'ACTIVE' }
    });
    console.log('Membership updated for Neon!');
  }
}

fix().catch(console.error).finally(() => prisma.$disconnect());
