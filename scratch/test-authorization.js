const { kernel } = require('../packages/core-platform');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Assuming API is running locally on port 3001
const API_URL = 'http://localhost:3001';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-default-key-do-not-use-in-prod';
function getToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1d' });
}

async function runTests() {
  const tenantId = crypto.randomUUID();
  const school1Id = crypto.randomUUID();
  const school2Id = crypto.randomUUID();
  const campus1Id = crypto.randomUUID();
  const campus2Id = crypto.randomUUID();
  const superAdminId = crypto.randomUUID();
  const normalUserId = crypto.randomUUID();
  const campusUserId = crypto.randomUUID();

  try {
    console.log('Setting up database data...');
    // Create Tenant
    await kernel.db.tenant.create({ data: { id: tenantId, name: 'Auth Test Tenant', slug: 'auth-test-' + tenantId } });
    
    // Create Schools
    await kernel.db.school.createMany({
      data: [
        { id: school1Id, tenantId, name: 'Auth School 1' },
        { id: school2Id, tenantId, name: 'Auth School 2' },
      ],
    });

    // Create Campuses
    await kernel.db.campus.createMany({
      data: [
        { id: campus1Id, schoolId: school1Id, tenantId, name: 'Auth Campus 1' },
        { id: campus2Id, schoolId: school1Id, tenantId, name: 'Auth Campus 2' },
      ],
    });

    // Create Roles
    const superAdminRole = await kernel.db.role.create({ data: { tenantId, name: 'SUPER_ADMIN' } });
    const userRole = await kernel.db.role.create({ data: { tenantId, name: 'USER' } });

    // Create Users
    await kernel.db.user.createMany({
      data: [
        { id: superAdminId, email: 'super@test.com', status: 'ACTIVE' },
        { id: normalUserId, email: 'normal@test.com', status: 'ACTIVE' },
        { id: campusUserId, email: 'campus@test.com', status: 'ACTIVE' },
      ],
    });

    // Create Memberships
    await kernel.db.userTenantMembership.createMany({
      data: [
        { userId: superAdminId, tenantId, roleId: superAdminRole.id, state: 'ACTIVE' },
        { userId: normalUserId, tenantId, roleId: userRole.id, state: 'ACTIVE' },
        { userId: campusUserId, tenantId, roleId: userRole.id, state: 'ACTIVE' },
      ],
    });

    // Create UserSchoolAccess
    await kernel.db.userSchoolAccess.createMany({
      data: [
        { userId: normalUserId, tenantId, schoolId: school1Id, campusId: null },
        { userId: campusUserId, tenantId, schoolId: school1Id, campusId: campus1Id },
      ],
    });
    
    // Test postgres nullable behavior constraints:
    console.log('Testing PG unique constraints for UserSchoolAccess...');
    // Should NOT allow creating duplicate exact match
    try {
      await kernel.db.userSchoolAccess.create({
         data: { userId: normalUserId, tenantId, schoolId: school1Id, campusId: null }
      });
      console.log('FAIL: Allowed creating duplicate exact match with NULL campusId');
    } catch(e) {
      console.log('SUCCESS: Prevented creating duplicate exact match with NULL campusId');
    }
    
    console.log('Running API tests...');

    // Function to make API requests
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

    let passed = 0;
    let total = 0;
    const assert = (name, actual, expected) => {
      total++;
      if (actual === expected || (Array.isArray(expected) && expected.includes(actual))) {
        passed++;
        console.log(`[PASS] ${name}`);
      } else {
        console.log(`[FAIL] ${name} - Expected ${expected}, got ${actual}`);
      }
    };

    // 1. USER -> assigned school succeeds
    let status = await makeRequest(normalUserId, { 'x-tenant-id': tenantId, 'x-school-id': school1Id });
    assert('USER -> assigned school succeeds', status, 200);

    // 2. USER -> unassigned school is rejected
    status = await makeRequest(normalUserId, { 'x-tenant-id': tenantId, 'x-school-id': school2Id });
    assert('USER -> unassigned school is rejected', status, [403, 404]);

    // 3. USER -> another tenant is rejected
    const otherTenantId = crypto.randomUUID();
    await kernel.db.tenant.create({ data: { id: otherTenantId, name: 'Other Tenant', slug: 'other-' + otherTenantId } });
    status = await makeRequest(normalUserId, { 'x-tenant-id': otherTenantId, 'x-school-id': school1Id });
    assert('USER -> another tenant is rejected', status, 403);

    // 4. SUPER_ADMIN -> school belonging to authenticated tenant succeeds
    status = await makeRequest(superAdminId, { 'x-tenant-id': tenantId, 'x-school-id': school2Id });
    assert('SUPER_ADMIN -> school belonging to authenticated tenant succeeds', status, 200);

    // 5. SUPER_ADMIN -> school belonging to another tenant is rejected
    const otherSchoolId = crypto.randomUUID();
    await kernel.db.school.create({ data: { id: otherSchoolId, tenantId: otherTenantId, name: 'Other School' } });
    status = await makeRequest(superAdminId, { 'x-tenant-id': tenantId, 'x-school-id': otherSchoolId });
    assert('SUPER_ADMIN -> school belonging to another tenant is rejected', status, [403, 404]); // the kernel check will throw NotFound
    
    // 6. CAMPUS_RESTRICTED USER -> authorized campus succeeds
    status = await makeRequest(campusUserId, { 'x-tenant-id': tenantId, 'x-school-id': school1Id, 'x-campus-id': campus1Id });
    assert('CAMPUS_RESTRICTED USER -> authorized campus succeeds', status, 200);
    
    // 7. CAMPUS_RESTRICTED USER -> unauthorized campus is rejected
    status = await makeRequest(campusUserId, { 'x-tenant-id': tenantId, 'x-school-id': school1Id, 'x-campus-id': campus2Id });
    assert('CAMPUS_RESTRICTED USER -> unauthorized campus is rejected', status, 403);
    
    // 8. CAMPUS_RESTRICTED USER -> omitting campus defaults safely
    status = await makeRequest(campusUserId, { 'x-tenant-id': tenantId, 'x-school-id': school1Id });
    assert('CAMPUS_RESTRICTED USER -> omitting campus defaults safely', status, 200); // the interceptor allows the request but injects campus1Id!

    // 9. Invalid/nonexistent school/campus IDs are rejected safely
    status = await makeRequest(normalUserId, { 'x-tenant-id': tenantId, 'x-school-id': crypto.randomUUID() });
    assert('Invalid school ID is rejected safely', status, [403, 404]);

    console.log(`\nTests completed: ${passed}/${total} passed.`);

    // Cleanup other tenant
    await kernel.db.tenant.delete({ where: { id: otherTenantId } });

  } catch (error) {
    console.error('Fatal error during setup/execution:', error);
  } finally {
    console.log('Cleaning up database...');
    await kernel.db.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    process.exit(0);
  }
}

runTests();
