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

  const tenantId = 'c5522af6-653a-4a25-8acc-10d6dc847f6e';

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const schools = await prisma.school.findMany({ where: { tenantId } });
    const campuses = await prisma.campus.findMany({ where: { tenantId } });
    const roles = await prisma.role.findMany({ where: { tenantId } });
    
    console.log(`Tenant ID: ${tenant.id}`);
    console.log(`Role IDs: ${roles.map(r => r.id).join(', ')}`);
    console.log(`School IDs: ${schools.map(s => s.id).join(', ')}`);
    console.log(`Campus IDs: ${campuses.map(c => c.id).join(', ')}`);
    
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
