const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function verify() {
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

  const tenantId = 'c5522af6-653a-4a25-8acc-10d6dc847f6e';

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const schools = await prisma.school.findMany({ where: { tenantId } });
    const campuses = await prisma.campus.findMany({ where: { tenantId } });
    const roles = await prisma.role.findMany({ where: { tenantId } });
    
    console.log(`\n--- Independent Post-Cleanup Verification ---`);
    console.log(`Tenant exists: ${!!tenant}`);
    console.log(`Role count: ${roles.length}`);
    console.log(`School count: ${schools.length}`);
    console.log(`Campus count: ${campuses.length}`);
    
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
verify();
