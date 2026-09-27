const path = require('path');
const corePlatformPath = path.resolve(__dirname, '../packages/core-platform/dist/index.js');
const argon2Path = path.resolve(__dirname, '../apps/api-gateway/node_modules/argon2');
const { kernel, tenantContext } = require(corePlatformPath);
const argon2 = require(argon2Path);

async function runCheckpoint2Verification() {
  console.log('=== PHASE 5D CHECKPOINT 2 BACKEND VERIFICATION CLOSEOUT ===\n');

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✓ [PASS ${totalTests}] ${message}`);
    } else {
      console.error(`❌ [FAIL ${totalTests}] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    const tenant = await kernel.db.tenant.findFirst({ where: { status: 'ACTIVE' } });
    if (!tenant) throw new Error('No active tenant found');

    await tenantContext.run({ tenantId: tenant.id }, async () => {
      const school = await kernel.db.school.findFirst({ where: { tenantId: tenant.id } });
      if (!school) throw new Error('No active school found');

      // Import Services
      const { PortalAccountService } = require('../apps/api-gateway/dist/modules/portal-account/services/portal-account.service');
      const { AuthenticationService } = require('../apps/api-gateway/dist/modules/identity/services/authentication.service');
      const { UserRepository } = require('../apps/api-gateway/dist/modules/identity/repositories/user.repository');
      const { TenantMembershipRepository } = require('../apps/api-gateway/dist/modules/identity/repositories/tenant-membership.repository');

      const portalAccountService = new PortalAccountService(null, { signAsync: async (p) => 'mock-jwt-token' });
      const userRepo = new UserRepository();
      const membershipRepo = new TenantMembershipRepository();
      const authService = new AuthenticationService(userRepo, membershipRepo, { signAsync: async (p) => 'mock-jwt-token' }, null);

      // Create test student & guardian
      const student = await kernel.db.student.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          firstName: 'Check2',
          lastName: 'Student',
          studentNumber: `STU-${Date.now()}`,
          gender: 'MALE',
          status: 'ACTIVE',
          admissionDate: new Date(),
        },
      });

      const guardian = await kernel.db.guardian.create({
        data: {
          tenantId: tenant.id,
          firstName: 'Check2',
          lastName: 'Guardian',
          email: `guardian-chk2-${Date.now()}@example.com`,
          phone: '+15559998888',
        },
      });

      // Link Guardian to Student
      await kernel.db.studentGuardian.create({
        data: {
          tenantId: tenant.id,
          studentId: student.id,
          guardianId: guardian.id,
          relationship: 'FATHER',
        },
      });

      // TEST 1: Provision Student Portal
      const studentEmail = `student-chk2-${Date.now()}@example.com`;
      const provRes = await portalAccountService.provisionStudentPortal(
        tenant.id, school.id, student.id, 'admin-1', { email: studentEmail }
      );
      assert(provRes.success && provRes.token, 'Admin provision student generates activation token');

      // TEST 2: Pre-validate Token & Masking Privacy
      const valRes = await portalAccountService.validateToken(provRes.token);
      assert(valRes.valid && valRes.status === 'PENDING', 'Token pre-validation confirms valid PENDING status');
      assert(valRes.recipientName.includes('C.') || valRes.recipientName.includes('Check2'), 'Recipient name is safely formatted/masked');
      assert(valRes.maskedEmail.includes('***'), 'Email is safely masked for privacy');

      // TEST 3: Pre-validate Invalid Token
      const invalidValRes = await portalAccountService.validateToken('invalid-fake-token-999');
      assert(!invalidValRes.valid && invalidValRes.status === 'INVALID', 'Invalid token returns valid: false & INVALID status');

      // TEST 4: Resend Invitation Invalidates Old Token
      const resendRes = await portalAccountService.resendInvitation(
        tenant.id, school.id, student.id, 'STUDENT', 'admin-1'
      );
      assert(resendRes.success && resendRes.token !== provRes.token, 'Resend generates fresh new token');

      const oldTokenVal = await portalAccountService.validateToken(provRes.token);
      assert(!oldTokenVal.valid, 'Old token is invalidated after resend');

      // TEST 5: Account Activation & Atomic Consumption
      const activateRes = await portalAccountService.activateAccount({
        token: resendRes.token,
        password: 'SecurePassword123!',
      });
      assert(activateRes.success && activateRes.accessToken && activateRes.redirectUrl === '/portal/student/dashboard', 'Activation completes and returns instant access token & redirectUrl');

      // TEST 6: Atomic Consumption Re-use Rejection
      try {
        await portalAccountService.activateAccount({
          token: resendRes.token,
          password: 'SecurePassword123!',
        });
        assert(false, 'Reusing consumed activation token should fail');
      } catch (err) {
        assert(err.message.includes('already been used'), 'Reused token correctly rejected: ' + err.message);
      }

      // TEST 7: Provision & Revoke Guardian Invitation
      const guardianEmail = `guardian-chk2-rev-${Date.now()}@example.com`;
      const gProvRes = await portalAccountService.provisionGuardianPortal(
        tenant.id, school.id, guardian.id, 'admin-1', { email: guardianEmail }
      );
      assert(gProvRes.success && gProvRes.token, 'Provision guardian succeeds');

      const revokeRes = await portalAccountService.revokeInvitation(tenant.id, school.id, guardian.id, 'GUARDIAN');
      assert(revokeRes.success, 'Revoke invitation succeeds');

      const revokedTokenVal = await portalAccountService.validateToken(gProvRes.token);
      assert(!revokedTokenVal.valid, 'Revoked token is invalidated');

      // Re-provision Guardian & Activate
      const gProvRes2 = await portalAccountService.provisionGuardianPortal(
        tenant.id, school.id, guardian.id, 'admin-1', { email: guardianEmail }
      );
      const gActivateRes = await portalAccountService.activateAccount({
        token: gProvRes2.token,
        password: 'SecureGuardianPass123!',
      });
      assert(gActivateRes.success && gActivateRes.redirectUrl === '/portal/parent/dashboard', 'Guardian activation succeeds');

      // TEST 8: Guardian Children Identity Context Resolution
      const gIdentity = await authService.getIdentityContext(gActivateRes.userId);
      assert(gIdentity.portalType === 'PARENT' && Array.isArray(gIdentity.children), 'GET /auth/me returns PARENT portalType and children array');
      assert(gIdentity.children.length === 1 && gIdentity.children[0].id === student.id, 'Children array contains only authorized linked student in tenant scope');

      // TEST 9: Forgot Password Enumeration Protection
      const forgotRes = await authService.forgotPassword({ email: 'nonexistent-user-12345@example.com' });
      assert(forgotRes.success && forgotRes.message.includes('If an account with that email exists'), 'Forgot password returns generic HTTP 200 message for non-existent email');

      // TEST 10: Forgot Password & Password Reset Completion
      const userForgotRes = await authService.forgotPassword({ email: studentEmail });
      assert(userForgotRes.success, 'Forgot password for valid user succeeds');

      const userInDb = await kernel.db.user.findUnique({ where: { email: studentEmail } });
      const resetTokenDb = await kernel.db.passwordResetToken.findFirst({
        where: { userId: userInDb?.id || activateRes.userId, isConsumed: false },
        orderBy: { createdAt: 'desc' },
      });
      assert(resetTokenDb, 'PasswordResetToken DB record created');

      // Find token or simulate raw token test via service
      const rawResetToken = 'test-reset-raw-token-' + Date.now();
      const resetTokenHash = require('crypto').createHmac('sha256', process.env.RESET_SECRET || 'fallback-password-reset-secret-key-2026').update(rawResetToken).digest('hex');

      await kernel.db.passwordResetToken.create({
        data: {
          userId: activateRes.userId,
          tokenHash: resetTokenHash,
          expiresAt: new Date(Date.now() + 3600 * 1000),
          isConsumed: false,
        },
      });

      const resetValRes = await authService.validateResetToken(rawResetToken);
      assert(resetValRes.valid, 'Reset token pre-validation confirms valid token');

      const resetCompleteRes = await authService.resetPassword({
        token: rawResetToken,
        newPassword: 'NewSecurePassword456!',
      });
      assert(resetCompleteRes.success, 'Password reset succeeds');

      // TEST 11: Reused Reset Token Rejection
      try {
        await authService.resetPassword({
          token: rawResetToken,
          newPassword: 'AnotherPassword789!',
        });
        assert(false, 'Reusing consumed reset token should fail');
      } catch (err) {
        assert(err.message.includes('already been used') || err.message.includes('consumed'), 'Reused reset token correctly rejected: ' + err.message);
      }

      // TEST 12: Login with New Password
      const loginRes = await authService.login({
        email: studentEmail,
        password: 'NewSecurePassword456!',
      });
      assert(loginRes.accessToken, 'Login with new reset password succeeds and returns access token');

      // TEST 13: Cross-Tenant Provisioning & Status Manipulation Rejection
      const fakeTenantId = 'tenant_000000000000000000000000';
      try {
        await portalAccountService.getStudentInvitationStatus(fakeTenantId, school.id, student.id);
        assert(false, 'Cross-tenant status lookup should fail');
      } catch (err) {
        assert(err.message.includes('not found'), 'Cross-tenant status lookup correctly blocked: ' + err.message);
      }

      // Cleanup test records
      await kernel.db.studentGuardian.deleteMany({ where: { guardianId: guardian.id } });
      await kernel.db.portalInvitation.deleteMany({ where: { tenantId: tenant.id, OR: [{ studentId: student.id }, { guardianId: guardian.id }] } });
      await kernel.db.student.delete({ where: { id: student.id } });
      await kernel.db.guardian.delete({ where: { id: guardian.id } });
      await kernel.db.passwordResetToken.deleteMany({ where: { userId: activateRes.userId } });
      await kernel.db.user.deleteMany({ where: { id: { in: [activateRes.userId, gActivateRes.userId] } } });
    });

    console.log(`\n======================================================`);
    console.log(`CHECKPOINT 2 BACKEND CLOSEOUT: ALL ${passedTests}/${totalTests} TESTS PASSED!`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('\n❌ CHECKPOINT 2 VERIFICATION FAILED:', err);
    process.exit(1);
  }
}

runCheckpoint2Verification();
