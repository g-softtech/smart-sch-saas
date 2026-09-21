const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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

  let setupSuccess = false;
  try {
    console.log(`[TEST] Setting up temporary production tenant: ${tenantId}`);
    
    await prisma.tenant.create({ data: { id: tenantId, name: 'Prod Auth Test Tenant', slug: 'prod-auth-' + tenantId } });
    await prisma.school.createMany({
      data: [
        { id: school1Id, tenantId, name: 'Prod School 1' },
        { id: school2Id, tenantId, name: 'Prod School 2' },
      ],
    });
    await prisma.campus.createMany({
      data: [
        { id: campus1Id, schoolId: school1Id, tenantId, name: 'Prod Campus 1' },
        { id: campus2Id, schoolId: school1Id, tenantId, name: 'Prod Campus 2' },
      ],
    });
    
    const userRole = await prisma.role.create({ data: { tenantId, name: 'USER' } });
    
    await prisma.user.createMany({
      data: [
        { id: normalUserId, email: `prod-normal-${normalUserId}@test.com` },
        { id: campusUserId, email: `prod-campus-${campusUserId}@test.com` },
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
    
    await prisma.tenant.create({ data: { id: otherTenantId, name: 'Prod Other Tenant', slug: 'prod-other-' + otherTenantId } });

    setupSuccess = true;
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

    let status = await makeRequest(normalUserId, `prod-normal-${normalUserId}@test.com`, { 'x-tenant-id': tenantId, 'x-school-id': school1Id });
    assert('1. FULL_SCHOOL access to assigned school', status, 200);

    status = await makeRequest(normalUserId, `prod-normal-${normalUserId}@test.com`, { 'x-tenant-id': tenantId, 'x-school-id': school2Id });
    assert('2. FULL_SCHOOL denial for unassigned school', status, [403, 404]);

    status = await makeRequest(normalUserId, `prod-normal-${normalUserId}@test.com`, { 'x-tenant-id': otherTenantId, 'x-school-id': school1Id });
    assert('3. FULL_SCHOOL denial across tenants', status, 403);

    status = await makeRequest(campusUserId, `prod-campus-${campusUserId}@test.com`, { 'x-tenant-id': tenantId, 'x-school-id': school1Id, 'x-campus-id': campus1Id });
    assert('4. CAMPUS_RESTRICTED access to assigned campus', status, 200);

    status = await makeRequest(campusUserId, `prod-campus-${campusUserId}@test.com`, { 'x-tenant-id': tenantId, 'x-school-id': school1Id });
    assert('5. CAMPUS_RESTRICTED safe default (omitted campusId)', status, 200);

    status = await makeRequest(campusUserId, `prod-campus-${campusUserId}@test.com`, { 'x-tenant-id': tenantId, 'x-school-id': school1Id, 'x-campus-id': campus2Id });
    assert('6. CAMPUS_RESTRICTED denial for explicit wrong campus', status, 403);

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
    if (setupSuccess) {
      console.log(`\n[TEST] Attempting transactional cleanup for production tenants...`);
      try {
        await prisma.$transaction(async (tx) => {
          // Verify
          const [t1, t2, memberships] = await Promise.all([
            tx.tenant.findUnique({ where: { id: tenantId } }),
            tx.tenant.findUnique({ where: { id: otherTenantId } }),
            tx.userTenantMembership.count({ where: { tenantId } })
          ]);
          if (!t1 || !t2) throw new Error('Tenants missing before cleanup');
          if (memberships !== 2) throw new Error(`Expected 2 memberships, got ${memberships}`);

          await tx.userSchoolAccess.deleteMany({ where: { tenantId } });
          await tx.campus.deleteMany({ where: { tenantId } });
          await tx.school.deleteMany({ where: { tenantId } });
          await tx.userTenantMembership.deleteMany({ where: { tenantId } });
          await tx.role.deleteMany({ where: { tenantId } });
          await tx.tenant.deleteMany({ where: { id: tenantId } });
          await tx.tenant.deleteMany({ where: { id: otherTenantId } });
          await tx.user.deleteMany({ where: { id: { in: [normalUserId, campusUserId] } } });

          // Post-Verify
          const [postT1, postSchools, postMemberships, postUsers] = await Promise.all([
            tx.tenant.count({ where: { id: tenantId } }),
            tx.school.count({ where: { tenantId } }),
            tx.userTenantMembership.count({ where: { tenantId } }),
            tx.user.count({ where: { id: { in: [normalUserId, campusUserId] } } })
          ]);
          if (postT1 !== 0 || postSchools !== 0 || postMemberships !== 0 || postUsers !== 0) {
            throw new Error('Cleanup failed to remove all records');
          }
        }, { maxWait: 15000, timeout: 60000 });

        console.log('[VERIFIED] Transactional cleanup successful.');
      } catch (e) {
        console.error(`[FAILED] Transactional cleanup error:`, e);
      }
    } else {
      console.log('[INFO] Setup failed, skipping cleanup (nothing to clean).');
    }
    
    await prisma.$disconnect();
    
    console.log(`\n--- INDEPENDENT POST-CLEANUP VERIFICATION ---`);
    const verifyPrisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    const postTenants = await verifyPrisma.tenant.count({ where: { id: { in: [tenantId, otherTenantId] } } });
    const postSchools = await verifyPrisma.school.count({ where: { tenantId } });
    const postCampuses = await verifyPrisma.campus.count({ where: { tenantId } });
    const postUsers = await verifyPrisma.user.count({ where: { id: { in: [normalUserId, campusUserId] } } });
    
    console.log(`Remaining Tenants: ${postTenants}`);
    console.log(`Remaining Schools: ${postSchools}`);
    console.log(`Remaining Campuses: ${postCampuses}`);
    console.log(`Remaining Users: ${postUsers}`);
    
    await verifyPrisma.$disconnect();
  }
}

run().catch(console.error);
