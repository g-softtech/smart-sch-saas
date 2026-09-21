const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function runCleanup() {
  const envFile = fs.readFileSync(path.join(__dirname, '../../.env'), 'utf8');
  let dbUrl = '';
  for (const line of envFile.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) dbUrl = line.split('=')[1].replace(/"/g, '').trim();
  }
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  const tenantId = 'c5522af6-653a-4a25-8acc-10d6dc847f6e';
  const roleId = 'c249905d-4fc5-449c-9680-3d9a03d3be63';
  const expectedSchoolIds = ['6c767ae8-052a-435f-abac-96d3b057517e', 'ec3de29f-484c-4337-a0d1-729cde0b6bc2'].sort();
  const expectedCampusIds = ['76c41166-c462-4e8d-a14d-f05291b31af5', '80148f09-dc51-4578-bfa6-4abdb00d029a'].sort();

  try {
    await prisma.$transaction(async (tx) => {
      // --- PRE-DELETE ASSERTIONS ---
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) throw new Error(`Precondition Failed: Tenant not found`);

      const campuses = await tx.campus.findMany({ where: { tenantId } });
      const actualCampusIds = campuses.map(c => c.id).sort();
      if (actualCampusIds.join(',') !== expectedCampusIds.join(',')) {
        throw new Error(`Precondition Failed: Expected campuses ${expectedCampusIds}, found ${actualCampusIds}`);
      }

      const schools = await tx.school.findMany({ where: { tenantId } });
      const actualSchoolIds = schools.map(s => s.id).sort();
      if (actualSchoolIds.join(',') !== expectedSchoolIds.join(',')) {
        throw new Error(`Precondition Failed: Expected schools ${expectedSchoolIds}, found ${actualSchoolIds}`);
      }

      const roles = await tx.role.findMany({ where: { tenantId } });
      if (roles.length !== 1 || roles[0].id !== roleId) {
        throw new Error(`Precondition Failed: Expected 1 Role ${roleId}, found ${roles.map(r => r.id)}`);
      }

      const membershipCount = await tx.userTenantMembership.count({ where: { tenantId } });
      if (membershipCount !== 0) throw new Error(`Precondition Failed: Expected 0 Memberships, found ${membershipCount}`);

      // --- EXECUTE DELETIONS IN SAFE ORDER ---
      await tx.campus.deleteMany({ where: { tenantId } });
      await tx.school.deleteMany({ where: { tenantId } });
      await tx.role.deleteMany({ where: { tenantId } });
      await tx.tenant.deleteMany({ where: { id: tenantId } });

      // --- POST-DELETE VERIFICATION ---
      const postTenant = await tx.tenant.count({ where: { id: tenantId } });
      if (postTenant !== 0) throw new Error(`Postcondition Failed: Tenant was not deleted!`);

      const postCampus = await tx.campus.count({ where: { tenantId } });
      if (postCampus !== 0) throw new Error(`Postcondition Failed: Campuses were not deleted!`);
      
      const postSchool = await tx.school.count({ where: { tenantId } });
      if (postSchool !== 0) throw new Error(`Postcondition Failed: Schools were not deleted!`);
      
      const postRole = await tx.role.count({ where: { tenantId } });
      if (postRole !== 0) throw new Error(`Postcondition Failed: Roles were not deleted!`);
    });

    console.log('[VERIFIED] Transaction committed successfully. The temporary tenant and all associated records have been cleanly removed.');
  } catch (err) {
    console.error('[FAILED] Transaction Rolled Back due to error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}
runCleanup();
