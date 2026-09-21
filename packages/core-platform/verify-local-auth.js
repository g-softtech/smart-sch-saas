const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000';

async function run() {
  const envFile = fs.readFileSync(path.join(__dirname, '../../.env.test'), 'utf8');
  let dbUrl = '';
  for (const line of envFile.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.split('=')[1].replace(/"/g, '').trim();
    }
  }

  // We read JWT_SECRET from main .env just in case the local server uses it
  const mainEnvFile = fs.readFileSync(path.join(__dirname, '../../.env'), 'utf8');
  let jwtSecret = '';
  for (const line of mainEnvFile.split('\n')) {
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
  const getToken = (userId, email) => {
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = base64url(JSON.stringify({ sub: userId, email: email, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 }));
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
    
    await prisma.tenant.create({ data: { id: tenantId, name: 'Local Auth Test Tenant', slug: 'local-auth-' + tenantId } });
    await prisma.school.createMany({
      data: [
        { id: school1Id, tenantId, name: 'Local School 1' },
        { id: school2Id, tenantId, name: 'Local School 2' },
      ],
    });
    await prisma.campus.createMany({
      data: [
        { id: campus1Id, schoolId: school1Id, tenantId, name: 'Local Campus 1' },
        { id: campus2Id, schoolId: school1Id, tenantId, name: 'Local Campus 2' },
      ],
    });
    
    const userRole = await prisma.role.create({ data: { tenantId, name: 'USER' } });
    
    // REMOVED 'status: ACTIVE' which caused the crash, User does not have a status field.
    await prisma.user.createMany({
      data: [
        { id: normalUserId, email: `local-normal-${normalUserId}@test.com` },
        { id: campusUserId, email: `local-campus-${campusUserId}@test.com` },
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
    
    await prisma.tenant.create({ data: { id: otherTenantId, name: 'Local Other Tenant', slug: 'local-other-' + otherTenantId } });

    console.log('[TEST] Setup complete. Running assertions...\n');

    const makeRequest = async (userId, email, headers) => {
      try {
        const token = getToken(userId, email);
        const res = await fetch(`${API_URL}/api/v1/academics/academic-years`, {
          headers: { Authorization: `Bearer ${token}`, ...headers }
        });
        return res.status;
      } catch (err) {
        console.error('Fetch error:', err);
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

    // 1. FULL_SCHOOL user access to assigned school
    let status = await makeRequest(normalUserId, `local-normal-${normalUserId}@test.com`, { 'x-tenant-id': tenantId, 'x-school-id': school1Id });
    assert('1. FULL_SCHOOL access to assigned school', status, 200);

    // 2. Denial for unassigned school
    status = await makeRequest(normalUserId, `local-normal-${normalUserId}@test.com`, { 'x-tenant-id': tenantId, 'x-school-id': school2Id });
    assert('2. FULL_SCHOOL denial for unassigned school', status, [403, 404]);

    // 3. Denial across tenants
    status = await makeRequest(normalUserId, `local-normal-${normalUserId}@test.com`, { 'x-tenant-id': otherTenantId, 'x-school-id': school1Id });
    assert('3. FULL_SCHOOL denial across tenants', status, 403);

    // 4. CAMPUS_RESTRICTED access to assigned campus
    status = await makeRequest(campusUserId, `local-campus-${campusUserId}@test.com`, { 'x-tenant-id': tenantId, 'x-school-id': school1Id, 'x-campus-id': campus1Id });
    assert('4. CAMPUS_RESTRICTED access to assigned campus', status, 200);

    // 5. Safe/default campus behavior when x-campus-id is omitted
    status = await makeRequest(campusUserId, `local-campus-${campusUserId}@test.com`, { 'x-tenant-id': tenantId, 'x-school-id': school1Id });
    assert('5. CAMPUS_RESTRICTED safe default (omitted campusId)', status, 200);

    // 6. Denial when wrong campus explicitly requested
    status = await makeRequest(campusUserId, `local-campus-${campusUserId}@test.com`, { 'x-tenant-id': tenantId, 'x-school-id': school1Id, 'x-campus-id': campus2Id });
    assert('6. CAMPUS_RESTRICTED denial for explicit wrong campus', status, 403);

    // 7. Duplicate NULL campusId constraint
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
      // Safe transactional cleanup mimicking production success
      await prisma.$transaction(async (tx) => {
        await tx.userSchoolAccess.deleteMany({ where: { tenantId } });
        await tx.campus.deleteMany({ where: { tenantId } });
        await tx.school.deleteMany({ where: { tenantId } });
        await tx.userTenantMembership.deleteMany({ where: { tenantId } });
        await tx.role.deleteMany({ where: { tenantId } });
        await tx.tenant.deleteMany({ where: { id: tenantId } });
        await tx.tenant.deleteMany({ where: { id: otherTenantId } });
        await tx.user.deleteMany({ where: { id: { in: [normalUserId, campusUserId] } } });
      });

      const t1 = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!t1) {
        console.log('[VERIFIED] 8. Cleanup of every temporary record created by the test');
        cleanupSuccess = true;
      }
    } catch (e) {
      console.log(`[FAILED] Cleanup error: ${e.message}`);
    }
    await prisma.$disconnect();
  }
}

run().catch(console.error);
