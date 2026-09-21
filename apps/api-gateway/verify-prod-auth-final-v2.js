const { PrismaClient } = require('../../packages/core-platform/node_modules/@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://smart-sch-saas.onrender.com';
const TEST_PASSWORD = 'TestPassword123!';
const PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$1tg4oBs4aMH3WBGhA/sm+Q$IdRIkgjhDfYcv/LeplzcVimTqMKfjpE4akyz0OabMug';

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

  const tenantId = crypto.randomUUID();
  const school1Id = crypto.randomUUID();
  const school2Id = crypto.randomUUID();
  const campus1Id = crypto.randomUUID();
  const campus2Id = crypto.randomUUID();
  const normalUserId = crypto.randomUUID();
  const campusUserId = crypto.randomUUID();
  const otherTenantId = crypto.randomUUID();
  
  const normalUserEmail = `prod-normal-${normalUserId}@test.com`;
  const campusUserEmail = `prod-campus-${campusUserId}@test.com`;

  let setupSuccess = false;
  let recordsCreated = 0;
  
  try {
    console.log(`[TEST] Setting up temporary production tenant: ${tenantId}`);
    
    await prisma.tenant.create({ data: { id: tenantId, name: 'Prod Auth Test Tenant', slug: 'prod-auth-' + tenantId } });
    recordsCreated++;
    
    await prisma.school.createMany({
      data: [
        { id: school1Id, tenantId, name: 'Prod School 1' },
        { id: school2Id, tenantId, name: 'Prod School 2' },
      ],
    });
    recordsCreated += 2;
    
    await prisma.campus.createMany({
      data: [
        { id: campus1Id, schoolId: school1Id, tenantId, name: 'Prod Campus 1' },
        { id: campus2Id, schoolId: school1Id, tenantId, name: 'Prod Campus 2' },
      ],
    });
    recordsCreated += 2;
    
    const userRole = await prisma.role.create({ data: { tenantId, name: 'USER' } });
    recordsCreated++;
    
    await prisma.user.createMany({
      data: [
        { id: normalUserId, email: normalUserEmail, passwordHash: PASSWORD_HASH },
        { id: campusUserId, email: campusUserEmail, passwordHash: PASSWORD_HASH },
      ],
    });
    recordsCreated += 2;

    await prisma.userTenantMembership.createMany({
      data: [
        { userId: normalUserId, tenantId, roleId: userRole.id, state: 'ACTIVE' },
        { userId: campusUserId, tenantId, roleId: userRole.id, state: 'ACTIVE' },
      ],
    });
    recordsCreated += 2;

    await prisma.userSchoolAccess.createMany({
      data: [
        { userId: normalUserId, tenantId, schoolId: school1Id, campusId: null },
        { userId: campusUserId, tenantId, schoolId: school1Id, campusId: campus1Id },
      ],
    });
    recordsCreated += 2;
    
    await prisma.tenant.create({ data: { id: otherTenantId, name: 'Prod Other Tenant', slug: 'prod-other-' + otherTenantId } });
    recordsCreated++;

    setupSuccess = true;
    console.log(`[TEST] Setup complete. ${recordsCreated} records created. Authenticating via production API...`);

    // AUTHENTICATE VIA PRODUCTION LOGIN ENDPOINT
    const loginUser = async (email, password) => {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        throw new Error(`Login failed for ${email} with status ${response.status}`);
      }
      const data = await response.json();
      return data.data.accessToken;
    };
    
    let normalToken, campusToken;
    try {
      normalToken = await loginUser(normalUserEmail, TEST_PASSWORD);
      console.log('[VERIFIED] Login successful for FULL_SCHOOL user');
      
      campusToken = await loginUser(campusUserEmail, TEST_PASSWORD);
      console.log('[VERIFIED] Login successful for CAMPUS_RESTRICTED user');
    } catch(e) {
      console.log('[FAILED] Login failed unexpectedly');
      throw e;
    }

    const makeRequest = async (token, headers) => {
      try {
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
        throw new Error(`Assertion Failed: ${name}`);
      }
    };

    console.log('\n[TEST] Running authorization assertions...');
    
    let status = await makeRequest(normalToken, { 'x-tenant-id': tenantId, 'x-school-id': school1Id });
    assert('1. FULL_SCHOOL access to assigned school', status, 200);

    status = await makeRequest(normalToken, { 'x-tenant-id': tenantId, 'x-school-id': school2Id });
    assert('2. FULL_SCHOOL denial for unassigned school', status, [403, 404]);

    status = await makeRequest(normalToken, { 'x-tenant-id': otherTenantId, 'x-school-id': school1Id });
    assert('3. FULL_SCHOOL denial across tenants', status, 403);

    status = await makeRequest(campusToken, { 'x-tenant-id': tenantId, 'x-school-id': school1Id, 'x-campus-id': campus1Id });
    assert('4. CAMPUS_RESTRICTED access to assigned campus', status, 200);

    status = await makeRequest(campusToken, { 'x-tenant-id': tenantId, 'x-school-id': school1Id });
    assert('5. CAMPUS_RESTRICTED safe default (omitted campusId)', status, 200);

    status = await makeRequest(campusToken, { 'x-tenant-id': tenantId, 'x-school-id': school1Id, 'x-campus-id': campus2Id });
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
    console.error('\nFatal error during setup/execution:', error.message);
  } finally {
    if (setupSuccess) {
      console.log(`\n[TEST] Attempting transactional cleanup for ${recordsCreated} production records...`);
      let recordsDeleted = 0;
      try {
        await prisma.$transaction(async (tx) => {
          // Verify exact counts before deletion
          const [t1, t2, memberships] = await Promise.all([
            tx.tenant.findUnique({ where: { id: tenantId } }),
            tx.tenant.findUnique({ where: { id: otherTenantId } }),
            tx.userTenantMembership.count({ where: { tenantId } })
          ]);
          if (!t1 || !t2) throw new Error('Tenants missing before cleanup');
          if (memberships !== 2) throw new Error(`Expected 2 memberships, got ${memberships}`);

          const c_usa = await tx.userSchoolAccess.deleteMany({ where: { tenantId } });
          const c_camp = await tx.campus.deleteMany({ where: { tenantId } });
          const c_sch = await tx.school.deleteMany({ where: { tenantId } });
          const c_mem = await tx.userTenantMembership.deleteMany({ where: { tenantId } });
          const c_role = await tx.role.deleteMany({ where: { tenantId } });
          const c_ten1 = await tx.tenant.deleteMany({ where: { id: tenantId } });
          const c_ten2 = await tx.tenant.deleteMany({ where: { id: otherTenantId } });
          const c_user = await tx.user.deleteMany({ where: { id: { in: [normalUserId, campusUserId] } } });
          
          recordsDeleted = c_usa.count + c_camp.count + c_sch.count + c_mem.count + c_role.count + c_ten1.count + c_ten2.count + c_user.count;

          // Post-Verify within transaction
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

        console.log(`[VERIFIED] Transactional cleanup successful. ${recordsDeleted} records deleted.`);
      } catch (e) {
        console.error(`[FAILED] Transactional cleanup error:`, e.message);
      }
    } else {
      console.log('[INFO] Setup failed early, skipping cleanup.');
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
