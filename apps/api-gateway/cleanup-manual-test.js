const { PrismaClient } = require('../../packages/core-platform/node_modules/@prisma/client');
const fs = require('fs');
const path = require('path');

const tenantId = process.argv[2];
const otherTenantId = process.argv[3];
const fullSchoolUserId = process.argv[4];
const campusRestrictedUserId = process.argv[5];

if (!tenantId || !otherTenantId || !fullSchoolUserId || !campusRestrictedUserId) {
  console.error('Usage: node cleanup-manual-test.js <tenantId> <otherTenantId> <fullSchoolUserId> <campusRestrictedUserId>');
  process.exit(1);
}

async function run() {
  const envFile = fs.readFileSync(path.join(__dirname, '../../.env'), 'utf8');
  let dbUrl = '';
  for (const line of envFile.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.split('=')[1].replace(/"/g, '').trim();
    }
  }

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  console.log(`Attempting transactional cleanup for tenants: ${tenantId}, ${otherTenantId}`);
  
  let recordsDeleted = 0;
  try {
    await prisma.$transaction(async (tx) => {
      const c_usa = await tx.userSchoolAccess.deleteMany({ where: { tenantId } });
      const c_camp = await tx.campus.deleteMany({ where: { tenantId } });
      const c_sch = await tx.school.deleteMany({ where: { tenantId } });
      const c_mem = await tx.userTenantMembership.deleteMany({ where: { tenantId } });
      const c_role = await tx.role.deleteMany({ where: { tenantId } });
      const c_ten1 = await tx.tenant.deleteMany({ where: { id: tenantId } });
      const c_ten2 = await tx.tenant.deleteMany({ where: { id: otherTenantId } });
      const c_user = await tx.user.deleteMany({ where: { id: { in: [fullSchoolUserId, campusRestrictedUserId] } } });
      
      recordsDeleted = c_usa.count + c_camp.count + c_sch.count + c_mem.count + c_role.count + c_ten1.count + c_ten2.count + c_user.count;
    }, { maxWait: 15000, timeout: 60000 });
    
    console.log(`✅ Transactional cleanup successful. ${recordsDeleted} records deleted.`);
  } catch (e) {
    console.error(`❌ Transactional cleanup error:`, e.message);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(console.error);
