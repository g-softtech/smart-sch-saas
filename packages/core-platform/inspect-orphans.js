const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function run() {
  const envFile = fs.readFileSync(path.join(__dirname, '../../.env'), 'utf8');
  let dbUrl = '';
  for (const line of envFile.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.split('=')[1].replace(/"/g, '').trim();
    }
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  const tenantIds = ['c5522af6-653a-4a25-8acc-10d6dc847f6e', 'f44d2053-9d0a-4487-a8ea-aa40fa1b9b18'];
  const userIds = ['5cbf27d5-9340-4357-b35d-0bafe7775947', 'a0561b83-08bd-40b3-b3b1-cc91cbc62082'];

  try {
    for (const tenantId of tenantIds) {
      console.log(`\n--- Inspecting Tenant: ${tenantId} ---`);
      
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      console.log(`Tenant exists: ${!!tenant}`);
      
      const schools = await prisma.school.findMany({ where: { tenantId } });
      console.log(`Schools count: ${schools.length}`);
      
      const campuses = await prisma.campus.findMany({ where: { tenantId } });
      console.log(`Campuses count: ${campuses.length}`);
      
      const roles = await prisma.role.findMany({ where: { tenantId } });
      console.log(`Roles count: ${roles.length}`);
      
      const memberships = await prisma.userTenantMembership.findMany({ where: { tenantId } });
      console.log(`Memberships count: ${memberships.length}`);
      
      const access = await prisma.userSchoolAccess.findMany({ where: { tenantId } });
      console.log(`UserSchoolAccess count: ${access.length}`);
    }

    console.log(`\n--- Inspecting Users ---`);
    for (const userId of userIds) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      console.log(`User ${userId} exists: ${!!user}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
