const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const envPath = path.join(__dirname, '..', '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/^DATABASE_URL="(.*)"$/m);
if (!match) throw new Error('DATABASE_URL not found in root .env');

const dbUrl = match[1];

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
});

async function fix() {
  console.log('Connecting to:', dbUrl.split('@')[1]);
  const latestTenant = await prisma.tenant.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  if (!latestTenant) {
    console.log('No tenant found!');
    return;
  }
  const tenantId = latestTenant.id;
  console.log('Using tenant:', tenantId);
  
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
  
  // Create Campus and Class for Neon
  const school = await prisma.school.findFirst({ where: { tenantId } });
  if (school) {
    let campus = await prisma.campus.findFirst({ where: { tenantId } });
    if (!campus) {
      campus = await prisma.campus.create({
        data: { tenantId, name: 'Main Campus', schoolId: school.id }
      });
      console.log('Created campus:', campus.name);
    }
    let cls = await prisma.class.findFirst({ where: { tenantId } });
    if (!cls) {
      cls = await prisma.class.create({
        data: { tenantId, name: 'Year 10', schoolId: school.id }
      });
      console.log('Created class:', cls.name);
    }
  }
}

fix().catch(console.error).finally(() => prisma.$disconnect());
