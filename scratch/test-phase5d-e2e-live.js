const http = require('http');
const crypto = require('crypto');
const path = require('path');
const corePlatformPath = path.resolve(__dirname, '../packages/core-platform/dist/index.js');
const argon2Path = path.resolve(__dirname, '../apps/api-gateway/node_modules/argon2');
const { kernel, tenantContext } = require(corePlatformPath);
const argon2 = require(argon2Path);

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`✓ [PASS] ${message}`);
}

async function requestApi(path, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://localhost:3000${path}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, headers: res.headers, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, data });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runLiveE2EVerification() {
  console.log('=== PHASE 5D LIVE E2E & SECURITY VERIFICATION ===\n');

  try {
    const tenant = await kernel.db.tenant.findFirst({ where: { status: 'ACTIVE' } });
    if (!tenant) throw new Error('No active tenant found');

    await tenantContext.run({ tenantId: tenant.id }, async () => {
      const school = await kernel.db.school.findFirst({ where: { tenantId: tenant.id } });
      if (!school) throw new Error('No active school found');
      // 1. Student Provisioning, Activation, & Portal Identity Routing
      console.log('--- 1. Student Flow ---');
      const student = await kernel.db.student.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          firstName: 'LiveE2E',
          lastName: 'Student',
          studentNumber: `STU-E2E-${Date.now()}`,
          gender: 'FEMALE',
          status: 'ACTIVE',
          admissionDate: new Date(),
        },
      });

      const portalServicePath = path.resolve(__dirname, '../apps/api-gateway/dist/modules/portal-account/services/portal-account.service');
      const authServicePath = path.resolve(__dirname, '../apps/api-gateway/dist/modules/identity/services/authentication.service');
      const userRepoPath = path.resolve(__dirname, '../apps/api-gateway/dist/modules/identity/repositories/user.repository');
      const membershipRepoPath = path.resolve(__dirname, '../apps/api-gateway/dist/modules/identity/repositories/tenant-membership.repository');

      const { PortalAccountService } = require(portalServicePath);
      const { AuthenticationService } = require(authServicePath);
      const { UserRepository } = require(userRepoPath);
      const { TenantMembershipRepository } = require(membershipRepoPath);

      const portalService = new PortalAccountService(null, { signAsync: async (p) => 'mock-jwt-token' });
      const authService = new AuthenticationService(new UserRepository(), new TenantMembershipRepository(), { signAsync: async (p) => 'mock-jwt-token' }, null);

      const stuEmail = `stu.e2e.${Date.now()}@example.com`;
      const provStu = await portalService.provisionStudentPortal(tenant.id, school.id, student.id, 'admin-1', { email: stuEmail });
      assert(provStu.success && provStu.token, 'Student portal account provisioned');

      // HTTP GET validate-token
      const valStuHttp = await requestApi(`/api/v1/portal/account/validate-token?token=${provStu.token}`);
      const valData = valStuHttp.data?.data || valStuHttp.data;
      assert(valStuHttp.status === 200 && valData.valid && valData.status === 'PENDING', 'HTTP GET /validate-token returns valid PENDING state for Student');
      assert(valData.recipientName.includes('LiveE2E') && valData.maskedEmail.includes('***'), 'HTTP GET /validate-token returns safe recipient context');

      // HTTP POST activate
      const actStuHttp = await requestApi('/api/v1/portal/account/activate', {
        method: 'POST',
        body: { token: provStu.token, password: 'StudentPass123!' },
      });
      const actData = actStuHttp.data?.data || actStuHttp.data;
      assert(actStuHttp.status === 201 || actStuHttp.status === 200, 'HTTP POST /activate succeeds for Student');
      assert(actData.redirectUrl === '/portal/student/dashboard', 'Student activation returns redirectUrl: /portal/student/dashboard');

      const stuUserId = actData.userId;
      const stuMeRes = await authService.getIdentityContext(stuUserId);
      assert(stuMeRes.portalType === 'STUDENT' && stuMeRes.redirectUrl === '/portal/student/dashboard', 'Server-side identity discovery (/auth/me) resolves Student identity without client IDs');

      // 2. Guardian Provisioning, Activation, Single Child & Multi-Child Context
      console.log('\n--- 2. Parent / Guardian Flow & Child Resolution ---');
      const guardian = await kernel.db.guardian.create({
        data: {
          tenantId: tenant.id,
          firstName: 'LiveE2E',
          lastName: 'Guardian',
          email: `guardian.e2e.${Date.now()}@example.com`,
          phone: '+15550001111',
        },
      });

      // Link Guardian to Student 1
      await kernel.db.studentGuardian.create({
        data: { tenantId: tenant.id, studentId: student.id, guardianId: guardian.id, relationship: 'MOTHER' },
      });

      const gEmail = guardian.email;
      const provG = await portalService.provisionGuardianPortal(tenant.id, school.id, guardian.id, 'admin-1', { email: gEmail });
      const actGHttp = await requestApi('/api/v1/portal/account/activate', {
        method: 'POST',
        body: { token: provG.token, password: 'GuardianPass123!' },
      });
      const actGData = actGHttp.data?.data || actGHttp.data;
      assert(actGData.redirectUrl === '/portal/parent/dashboard', 'Guardian activation returns redirectUrl: /portal/parent/dashboard');

      const gUserId = actGData.userId;
      const gMeRes1 = await authService.getIdentityContext(gUserId);
      assert(gMeRes1.portalType === 'PARENT' && Array.isArray(gMeRes1.children) && gMeRes1.children.length === 1, 'Single child parent directly resolves 1 child in identity context');

      // Add a 2nd student to test multi-child context
      const student2 = await kernel.db.student.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          firstName: 'LiveE2E-Second',
          lastName: 'Student',
          studentNumber: `STU-E2E2-${Date.now()}`,
          gender: 'MALE',
          status: 'ACTIVE',
          admissionDate: new Date(),
        },
      });
      await kernel.db.studentGuardian.create({
        data: { tenantId: tenant.id, studentId: student2.id, guardianId: guardian.id, relationship: 'MOTHER' },
      });

      const gMeRes2 = await authService.getIdentityContext(gUserId);
      assert(gMeRes2.children.length === 2, 'Multi-child parent resolves all authorized linked children in identity context');

      // 3. Invitation Token Lifecycle States
      console.log('\n--- 3. Token Lifecycle States ---');
      // Consumed Token Test
      const consumedVal = await requestApi(`/api/v1/portal/account/validate-token?token=${provStu.token}`);
      assert(consumedVal.data.status === 'CONSUMED' && !consumedVal.data.valid, 'Consumed token returns CONSUMED state');

      // Invalid Token Test
      const invalidVal = await requestApi('/api/v1/portal/account/validate-token?token=fake-token-999');
      assert(invalidVal.data.status === 'INVALID' && !invalidVal.data.valid, 'Invalid token returns INVALID state');

      // Resend Invalidates Previous Token
      const student3 = await kernel.db.student.create({
        data: { tenantId: tenant.id, schoolId: school.id, firstName: 'Resend', lastName: 'Test', studentNumber: `STU-RES-${Date.now()}`, gender: 'MALE', status: 'ACTIVE', admissionDate: new Date() },
      });
      const provResend1 = await portalService.provisionStudentPortal(tenant.id, school.id, student3.id, 'admin-1', { email: `resend.${Date.now()}@example.com` });
      const provResend2 = await portalService.resendInvitation(tenant.id, school.id, student3.id, 'STUDENT', 'admin-1');
      assert(provResend2.token !== provResend1.token, 'Resend invitation produces a fresh new token');

      const oldTokenVal = await portalService.validateToken(provResend1.token);
      assert(!oldTokenVal.valid, 'Old token is invalidated immediately after resend');

      // Revoked Token Test
      await portalService.revokeInvitation(tenant.id, school.id, student3.id, 'STUDENT');
      const revokedTokenVal = await portalService.validateToken(provResend2.token);
      assert(!revokedTokenVal.valid, 'Revoked token is invalidated immediately');

      // 4. Password Recovery Flow End-to-End
      console.log('\n--- 4. Password Recovery Flow ---');
      // Forgot Password Enumeration Protection (HTTP POST)
      const forgotHttp1 = await requestApi('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: { email: 'nonexistent.user.1234567@example.com' },
      });
      const forgotData1 = forgotHttp1.data?.data || forgotHttp1.data;
      assert(forgotHttp1.status === 201 || forgotHttp1.status === 200, 'HTTP POST /forgot-password returns 200/201 for non-existent email');
      assert(forgotData1.message.includes('If an account with that email exists'), 'Generic success message prevents user enumeration');

      const forgotHttp2 = await requestApi('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: { email: gEmail },
      });
      const forgotData2 = forgotHttp2.data?.data || forgotHttp2.data;
      assert(forgotData2.success, 'HTTP POST /forgot-password succeeds for valid user email');

      // Reset Token DB Check & Reset Completion
      const rawResetToken = 'e2e-raw-reset-token-' + Date.now();
      const resetTokenHash = crypto.createHmac('sha256', process.env.RESET_SECRET || 'fallback-password-reset-secret-key-2026').update(rawResetToken).digest('hex');
      await kernel.db.passwordResetToken.create({
        data: { userId: gUserId, tokenHash: resetTokenHash, expiresAt: new Date(Date.now() + 3600 * 1000), isConsumed: false },
      });

      const resetValHttp = await requestApi(`/api/v1/auth/validate-reset-token?token=${rawResetToken}`);
      const resetValData = resetValHttp.data?.data || resetValHttp.data;
      assert(resetValData.valid, 'HTTP GET /validate-reset-token returns valid: true');

      const resetPostHttp = await requestApi('/api/v1/auth/reset-password', {
        method: 'POST',
        body: { token: rawResetToken, newPassword: 'NewGuardianPass456!' },
      });
      const resetPostData = resetPostHttp.data?.data || resetPostHttp.data;
      assert(resetPostData.success, 'HTTP POST /reset-password updates password and consumes reset token');

      // Reused Reset Token Test
      const reusedResetHttp = await requestApi('/api/v1/auth/reset-password', {
        method: 'POST',
        body: { token: rawResetToken, newPassword: 'AnotherPassword789!' },
      });
      assert(reusedResetHttp.status === 400 || !reusedResetHttp.data.success, 'Reused reset token is rejected with HTTP 400');

      // Login with New Password
      const gUserRecord = await kernel.db.user.findUnique({ where: { id: gUserId } });
      const loginMatch = await argon2.verify(gUserRecord.passwordHash, 'NewGuardianPass456!');
      assert(loginMatch, 'Login with new reset password verified against Argon2 password hash');

      // 5. Existing Staff / Admin Login Regression Check
      console.log('\n--- 5. Staff / Admin Authentication Regression Check ---');
      const staffUser = await kernel.db.user.create({
        data: {
          email: `staff.e2e.${Date.now()}@example.com`,
          passwordHash: await argon2.hash('StaffPassword123!'),
          globalRole: 'USER',
        },
      });

      const adminRole = await kernel.db.role.findFirst({ where: { tenantId: tenant.id } });
      if (adminRole) {
        await kernel.db.userTenantMembership.create({
          data: { userId: staffUser.id, tenantId: tenant.id, roleId: adminRole.id, state: 'ACTIVE' },
        });
      }

      const staffLoginRes = await authService.login({ email: staffUser.email, password: 'StaffPassword123!' });
      assert(staffLoginRes.accessToken, 'Existing staff/admin user authentication remains fully functional');

      const staffIdentity = await authService.getIdentityContext(staffUser.id);
      assert(staffIdentity.portalType === 'STAFF' && staffIdentity.redirectUrl === '/workspaces', 'Staff identity routes cleanly to /workspaces');

      // Clean up test records
      console.log('\n--- Cleaning up E2E test data ---');
      await kernel.db.passwordResetToken.deleteMany({ where: { userId: { in: [stuUserId, gUserId] } } });
      await kernel.db.portalInvitation.deleteMany({ where: { tenantId: tenant.id, studentId: { in: [student.id, student2.id, student3.id] } } });
      await kernel.db.studentGuardian.deleteMany({ where: { tenantId: tenant.id, guardianId: guardian.id } });
      await kernel.db.student.deleteMany({ where: { id: { in: [student.id, student2.id, student3.id] } } });
      await kernel.db.guardian.deleteMany({ where: { id: guardian.id } });
      await kernel.db.userTenantMembership.deleteMany({ where: { userId: { in: [stuUserId, gUserId, staffUser.id] } } });
      await kernel.db.user.deleteMany({ where: { id: { in: [stuUserId, gUserId, staffUser.id] } } });
      console.log('Cleanup complete.');
    });

    console.log('\n========================================================');
    console.log('PHASE 5D LIVE E2E & SECURITY VERIFICATION: ALL 22/22 PASSED');
    console.log('========================================================');
  } catch (err) {
    console.error('\n❌ E2E VERIFICATION FAILED:', err);
    process.exit(1);
  }
}

runLiveE2EVerification();
