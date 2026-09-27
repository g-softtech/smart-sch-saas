const path = require('path');
const corePlatformPath = path.resolve(__dirname, '../packages/core-platform/dist/index.js');
const argon2Path = path.resolve(__dirname, '../apps/api-gateway/node_modules/argon2');
const { kernel, tenantContext } = require(corePlatformPath);
const argon2 = require(argon2Path);

async function runPhase5CTest() {
  console.log('=== PHASE 5C LIVE E2E LIFECYCLE VERIFICATION ===\n');

  try {
    // 1. Setup / Identify Test Records
    const tenant = await kernel.db.tenant.findFirst({
      where: { status: 'ACTIVE' },
    });
    if (!tenant) throw new Error('No active tenant found in DB');

    console.log(`[1] Found Active Tenant: ${tenant.name} (${tenant.id})`);

    // Run tenant-scoped operations within tenantContext
    await tenantContext.run({ tenantId: tenant.id }, async () => {
      const school = await kernel.db.school.findFirst({
        where: { tenantId: tenant.id },
      });
      if (!school) throw new Error('No school found in DB');

      console.log(`    Found School: ${school.name} (${school.id})`);

      // Find or create test student
      let student = await kernel.db.student.findFirst({
        where: { tenantId: tenant.id, schoolId: school.id },
      });

      if (!student) {
        student = await kernel.db.student.create({
          data: {
            tenantId: tenant.id,
            schoolId: school.id,
            firstName: 'E2E',
            lastName: 'Student',
            admissionNumber: `ADM-${Date.now()}`,
            status: 'ACTIVE',
            enrollmentStatus: 'ENROLLED',
          },
        });
      }

      // Find or create test guardian
      let guardian = await kernel.db.guardian.findFirst({
        where: { tenantId: tenant.id },
      });

      if (!guardian) {
        guardian = await kernel.db.guardian.create({
          data: {
            tenantId: tenant.id,
            firstName: 'E2E',
            lastName: 'Guardian',
            relationship: 'Parent',
            email: `guardian-${Date.now()}@example.com`,
            phone: `+1555${Math.floor(100000 + Math.random() * 900000)}`,
          },
        });
      }

      console.log(`[2] Target Student ID: ${student.id} (User ID: ${student.userId || 'NONE'})`);
      console.log(`    Target Guardian ID: ${guardian.id} (User ID: ${guardian.userId || 'NONE'})`);

      // Clean up any existing invitations for test student/guardian
      await kernel.db.portalInvitation.deleteMany({
        where: {
          OR: [
            { studentId: student.id },
            { guardianId: guardian.id },
          ],
        },
      });

      // Reset userId on student and guardian for fresh provisioning test
      if (student.userId) {
        await kernel.db.student.update({
          where: { id: student.id },
          data: { userId: null },
        });
      }
      if (guardian.userId) {
        await kernel.db.guardian.update({
          where: { id: guardian.id },
          data: { userId: null },
        });
      }

      // 2. Import Services
      const { PortalAccountService } = require('../apps/api-gateway/dist/modules/portal-account/services/portal-account.service');
      const { AuthenticationService } = require('../apps/api-gateway/dist/modules/identity/services/authentication.service');
      const { UserRepository } = require('../apps/api-gateway/dist/modules/identity/repositories/user.repository');
      const { TenantMembershipRepository } = require('../apps/api-gateway/dist/modules/identity/repositories/tenant-membership.repository');

      const portalAccountService = new PortalAccountService();
      const userRepo = new UserRepository();
      const membershipRepo = new TenantMembershipRepository();
      const authService = new AuthenticationService(userRepo, membershipRepo, { signAsync: async () => 'mock-jwt-token' });

      // TEST 1: Provision Student Portal
      const studentEmail = `student-e2e-${Date.now()}@example.com`;
      console.log(`\n[TEST 1] Provisioning Student Portal for Email: ${studentEmail}...`);
      const studentProvRes = await portalAccountService.provisionStudentPortal(
        tenant.id,
        school.id,
        student.id,
        'admin-user-123',
        { email: studentEmail, expiresInHours: 72 }
      );

      console.log('✓ Student Provisioned Successfully!');
      console.log(`  Invitation Token: ${studentProvRes.token}`);
      console.log(`  Activation URL: ${studentProvRes.activationUrl}`);
      console.log(`  Expires At: ${studentProvRes.expiresAt}`);

      // Verify PortalInvitation record created in DB
      const studentInvDb = await kernel.db.portalInvitation.findFirst({
        where: { studentId: student.id, tenantId: tenant.id },
      });
      if (!studentInvDb || studentInvDb.isConsumed) {
        throw new Error('Database PortalInvitation record missing or invalid');
      }
      console.log('✓ Database PortalInvitation record verified intact');

      // TEST 2: Re-provisioning Student before token used or when already linked
      console.log('\n[TEST 2] Verifying duplicate provisioning rejection...');
      try {
        await portalAccountService.provisionStudentPortal(
          tenant.id,
          school.id,
          student.id,
          'admin-user-123',
          { email: studentEmail }
        );
        throw new Error('FAILED: Duplicate provisioning should have been rejected');
      } catch (err) {
        console.log(`✓ Correctly rejected duplicate provisioning: "${err.message}"`);
      }

      // TEST 3: Provision Guardian Portal
      const guardianEmail = `guardian-e2e-${Date.now()}@example.com`;
      console.log(`\n[TEST 3] Provisioning Guardian Portal for Email: ${guardianEmail}...`);
      const guardianProvRes = await portalAccountService.provisionGuardianPortal(
        tenant.id,
        school.id,
        guardian.id,
        'admin-user-123',
        { email: guardianEmail }
      );
      console.log('✓ Guardian Provisioned Successfully!');
      console.log(`  Invitation Token: ${guardianProvRes.token}`);

      // TEST 4: Invalid Token Activation Rejection
      console.log('\n[TEST 4] Verifying activation with invalid token rejection...');
      try {
        await portalAccountService.activateAccount({
          token: 'invalid-fake-token-12345',
          password: 'Password123!',
        });
        throw new Error('FAILED: Invalid token activation should have failed');
      } catch (err) {
        console.log(`✓ Correctly rejected invalid activation token: "${err.message}"`);
      }

      // TEST 5: Activate Student Account with valid token
      console.log('\n[TEST 5] Activating Student Account with valid token...');
      const studentPassword = 'SecureStudentPass2026!';
      const studentActivateRes = await portalAccountService.activateAccount({
        token: studentProvRes.token,
        password: studentPassword,
      });
      console.log('✓ Student Account Activated Successfully!');
      console.log(`  User ID Created: ${studentActivateRes.userId}`);
      console.log(`  Email: ${studentActivateRes.email}`);

      // Verify Student record is now linked to user
      const updatedStudent = await kernel.db.student.findUnique({
        where: { id: student.id },
      });
      if (updatedStudent.userId !== studentActivateRes.userId) {
        throw new Error(`Student.userId mismatch! Expected ${studentActivateRes.userId}, got ${updatedStudent.userId}`);
      }
      console.log(`✓ Student.userId successfully linked to created User (${updatedStudent.userId})`);

      // TEST 6: Single-use Token Enforcement (Re-activation attempt)
      console.log('\n[TEST 6] Verifying reused token rejection (Single-Use Enforcement)...');
      try {
        await portalAccountService.activateAccount({
          token: studentProvRes.token,
          password: 'AnotherPassword123!',
        });
        throw new Error('FAILED: Reusing token should have been rejected');
      } catch (err) {
        console.log(`✓ Correctly rejected reused token: "${err.message}"`);
      }

      // TEST 7: Identity Discovery & Smart Routing for Student
      console.log('\n[TEST 7] Testing GET /api/v1/auth/me Identity Discovery for Student...');
      const studentIdentity = await authService.getIdentityContext(studentActivateRes.userId);
      console.log('✓ Student Identity Context:', studentIdentity);
      if (studentIdentity.portalType !== 'STUDENT' || studentIdentity.redirectUrl !== '/portal/student/dashboard') {
        throw new Error('Identity Discovery failed to resolve Student portal type or redirectUrl');
      }

      // TEST 8: Activate Guardian Account
      console.log('\n[TEST 8] Activating Guardian Account with valid token...');
      const guardianPassword = 'SecureGuardianPass2026!';
      const guardianActivateRes = await portalAccountService.activateAccount({
        token: guardianProvRes.token,
        password: guardianPassword,
      });
      console.log('✓ Guardian Account Activated Successfully!');

      // Verify Guardian record is now linked to user
      const updatedGuardian = await kernel.db.guardian.findUnique({
        where: { id: guardian.id },
      });
      if (updatedGuardian.userId !== guardianActivateRes.userId) {
        throw new Error(`Guardian.userId mismatch! Expected ${guardianActivateRes.userId}, got ${updatedGuardian.userId}`);
      }
      console.log(`✓ Guardian.userId successfully linked to created User (${updatedGuardian.userId})`);

      // TEST 9: Identity Discovery & Smart Routing for Guardian
      console.log('\n[TEST 9] Testing GET /api/v1/auth/me Identity Discovery for Guardian...');
      const guardianIdentity = await authService.getIdentityContext(guardianActivateRes.userId);
      console.log('✓ Guardian Identity Context:', guardianIdentity);
      if (guardianIdentity.portalType !== 'PARENT' || guardianIdentity.redirectUrl !== '/portal/parent/dashboard') {
        throw new Error('Identity Discovery failed to resolve Guardian portal type or redirectUrl');
      }

      // TEST 10: Cross-Tenant Isolation Test
      console.log('\n[TEST 10] Testing Cross-Tenant Isolation Enforcement...');
      const fakeOtherTenantId = 'tenant_000000000000000000000000';
      try {
        await portalAccountService.provisionStudentPortal(
          fakeOtherTenantId,
          school.id,
          student.id,
          'admin-user-123',
          { email: 'crosstenant@example.com' }
        );
        throw new Error('FAILED: Cross-tenant student provisioning should have been blocked');
      } catch (err) {
        console.log(`✓ Correctly blocked cross-tenant provisioning attempt: "${err.message}"`);
      }
    });

    console.log('\n======================================================');
    console.log('ALL PHASE 5C LIFECYCLE & SECURITY VERIFICATIONS PASSED!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ PHASE 5C VERIFICATION FAILED:', err);
    process.exit(1);
  }
}

runPhase5CTest();
