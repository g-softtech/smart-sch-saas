const { PrismaClient } = require('../../packages/core-platform/node_modules/@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API_URL = 'https://smart-sch-saas.onrender.com';

async function run() {
  const envFile = fs.readFileSync(path.join(__dirname, '../../.env'), 'utf8');
  let dbUrl = '';
  let jwtSecret = '';
  for (const line of envFile.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.split('=')[1].replace(/"/g, '').trim();
    }
    if (line.startsWith('JWT_SECRET=')) {
      jwtSecret = line.split('=')[1].replace(/"/g, '').trim();
    }
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  function base64url(str) {
    return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }
  const getToken = (userId) => {
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = base64url(JSON.stringify({ sub: userId, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 }));
    const signature = base64url(crypto.createHmac('sha256', jwtSecret).update(header + '.' + payload).digest());
    return header + '.' + payload + '.' + signature;
  };

  const tenantId = crypto.randomUUID();
  const school1Id = crypto.randomUUID();
  const school2Id = crypto.randomUUID();
  const campus1Id = crypto.randomUUID();
  const campus2Id = crypto.randomUUID();
  const normalUserId = crypto.randomUUID();
  const campusUserId = crypto.randomUUID();
  const otherTenantId = crypto.randomUUID();

  let cleanupSuccess = false;

  try {
    console.log(`[TEST] Setting up temporary tenant: ${tenantId}`);
    
    await prisma.tenant.create({ data: { id: tenantId, name: 'Prod Auth Test Tenant', slug: 'prod-auth-test-' + tenantId } });
    await prisma.school.createMany({
      data: [
        { id: school1Id, tenantId, name: 'Prod Auth School 1' },
        { id: school2Id, tenantId, name: 'Prod Auth School 2' },
      ],
    });
    await prisma.campus.createMany({
      data: [
        { id: campus1Id, schoolId: school1Id, tenantId, name: 'Prod Auth Campus 1' },
        { id: campus2Id, schoolId: school1Id, tenantId, name: 'Prod Auth Campus 2' },
      ],
    });
    
    const userRole = await prisma.role.create({ data: { tenantId, name: 'USER' } });
    
    await prisma.user.createMany({
      data: [
        { id: normalUserId, email: 'prod-normal@test.com', status: 'ACTIVE' },
        { id: campusUserId, email: 'prod-campus@test.com', status: 'ACTIVE' },
      ],
    });

    await prisma.userTenantMembership.createMany({
      data: [
        { userId: normalUserId, tenantId, roleId: userRole.id, state: 'ACTIVE' },
        { userId: campusUserId, tenantId, roleId: userRole.id, state: 'ACTIVE' },
      ],
    });

    await prisma.userSchoolAccess.createMany({
      data: [
        { userId: normalUserId, tenantId, schoolId: school1Id, campusId: null },
        { userId: campusUserId, tenantId, schoolId: school1Id, campusId: campus1Id },
      ],
    });
    
    // Other tenant for cross-tenant checks
    await prisma.tenant.create({ data: { id: otherTenantId, name: 'Prod Auth Other Tenant', slug: 'prod-auth-other-' + otherTenantId } });

    console.log('[TEST] Setup complete. Running assertions...\n');

    const makeRequest = async (userId, headers) => {
      try {
        const token = getToken(userId);
        const res = await fetch(`${API_URL}/api/v1/academics/academic-years`, {
          headers: { Authorization: `Bearer ${token}`, ...headers }
        });
        return res.status;
      } catch (err) {
        return 500;
      }
    };

    const assert = (name, actual, expected) => {
      if (actual === expected || (Array.isArray(expected) && expected.includes(actual))) {
        console.log(`[VERIFIED] ${name}`);
      } else {
        console.log(`[FAILED] ${name} - Expected ${expected}, got ${actual}`);
      }
    };

    // 1. FULL_SCHOOL standard-user access to its assigned school.
    let status = await makeRequest(normalUserId, { 'x-tenant-id': tenantId, 'x-school-id': school1Id });
    assert('1. FULL_SCHOOL user access to assigned school', status, 200);

    // 2. Rejection (403/404) when that user attempts to access an unassigned school.
    status = await makeRequest(normalUserId, { 'x-tenant-id': tenantId, 'x-school-id': school2Id });
    assert('2. FULL_SCHOOL user rejection for unassigned school', status, [403, 404]);

    // 3. Rejection (403) for cross-tenant access.
    status = await makeRequest(normalUserId, { 'x-tenant-id': otherTenantId, 'x-school-id': school1Id });
    assert('3. FULL_SCHOOL user rejection for cross-tenant access', status, 403);

    // 4. CAMPUS_RESTRICTED access to its assigned campus.
    status = await makeRequest(campusUserId, { 'x-tenant-id': tenantId, 'x-school-id': school1Id, 'x-campus-id': campus1Id });
    assert('4. CAMPUS_RESTRICTED user access to assigned campus', status, 200);

    // 5. Safe/default campus behavior when x-campus-id is omitted.
    status = await makeRequest(campusUserId, { 'x-tenant-id': tenantId, 'x-school-id': school1Id });
    assert('5. CAMPUS_RESTRICTED user omits campus ID (defaults safely)', status, 200);

    // 6. Rejection (403) when the campus-restricted user explicitly requests another campus.
    status = await makeRequest(campusUserId, { 'x-tenant-id': tenantId, 'x-school-id': school1Id, 'x-campus-id': campus2Id });
    assert('6. CAMPUS_RESTRICTED user rejection for explicitly requesting another campus', status, 403);

    // 7. Duplicate NULL constraint check via Prisma (simulating API failure).
    try {
      await prisma.userSchoolAccess.create({
         data: { userId: normalUserId, tenantId, schoolId: school1Id, campusId: null }
      });
      console.log('[FAILED] 7. Duplicate NULL campusId constraint - Allowed creation');
    } catch(e) {
      if (e.code === 'P2002') {
        console.log('[VERIFIED] 7. Duplicate NULL campusId constraint - Properly rejected (P2002)');
      } else {
        console.log(`[FAILED] 7. Duplicate NULL campusId constraint - Failed with unexpected error: ${e.message}`);
      }
    }

  } catch (error) {
    console.error('Fatal error during setup/execution:', error);
  } finally {
    console.log(`\n[TEST] Attempting cleanup for Tenant: ${tenantId} and ${otherTenantId}`);
    try {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
      await prisma.tenant.delete({ where: { id: otherTenantId } }).catch(() => {});
      
      // Verify cleanup
      const t1 = await prisma.tenant.findUnique({ where: { id: tenantId } });
      const t2 = await prisma.tenant.findUnique({ where: { id: otherTenantId } });
      const u1 = await prisma.user.findUnique({ where: { id: normalUserId } });
      const u2 = await prisma.user.findUnique({ where: { id: campusUserId } });
      
      if (!t1 && !t2) {
        console.log('[VERIFIED] Cleanup successful. Temporary data removed.');
        cleanupSuccess = true;
      } else {
        console.log(`[FAILED] Cleanup incomplete. Temporary tenants still exist. Manual cleanup required for: ${tenantId}, ${otherTenantId}`);
      }
      
      if (u1) await prisma.user.delete({ where: { id: normalUserId } }).catch(()=>{});
      if (u2) await prisma.user.delete({ where: { id: campusUserId } }).catch(()=>{});

    } catch (e) {
      console.log(`[FAILED] Cleanup error. Temporary tenants might still exist. Manual cleanup required for: ${tenantId}, ${otherTenantId}`);
    }
    
    await prisma.$disconnect();
    
    if (!cleanupSuccess) {
      console.log('\n!!! MANUAL CLEANUP REQUIRED !!!');
      console.log(`Run: DELETE FROM idm_tenants WHERE id IN ('${tenantId}', '${otherTenantId}');`);
      console.log(`Run: DELETE FROM idm_users WHERE id IN ('${normalUserId}', '${campusUserId}');`);
    }
  }
}

run().catch(console.error);
