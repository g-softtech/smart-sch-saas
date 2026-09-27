const { kernel, tenantContext } = require("../packages/core-platform/dist/index.js");
const { Test, TestingModule } = require("../apps/api-gateway/node_modules/@nestjs/testing");
const { PortalAccountModule } = require("../apps/api-gateway/dist/modules/portal-account/portal-account.module");
const { PortalAccountService } = require("../apps/api-gateway/dist/modules/portal-account/services/portal-account.service");
const { StudentsModule } = require("../apps/api-gateway/dist/modules/students/students.module");
const { StudentsService } = require("../apps/api-gateway/dist/modules/students/services/students.service");
const { NotificationsModule } = require("../apps/api-gateway/dist/modules/notifications/notifications.module");
const { NotificationsService } = require("../apps/api-gateway/dist/modules/notifications/notifications.service");

async function runPhase5ELiveTest() {
  console.log("=== PHASE 5E LIVE ONBOARDING & SAFETY VERIFICATION SUITE ===");

  const moduleRef = await Test.createTestingModule({
    imports: [NotificationsModule, PortalAccountModule, StudentsModule],
  }).compile();

  const portalService = moduleRef.get(PortalAccountService);
  const studentsService = moduleRef.get(StudentsService);
  const notificationsService = moduleRef.get(NotificationsService);

  let passed = 0;
  let failed = 0;

  function assert(condition, label) {
    if (condition) {
      console.log(`✅ PASSED: ${label}`);
      passed++;
    } else {
      console.error(`❌ FAILED: ${label}`);
      failed++;
    }
  }

  // 1. Setup test tenant & school
  const tenant = await kernel.db.tenant.create({
    data: { name: `Phase5E Tenant ${Date.now()}`, slug: `phase5e-${Date.now()}` },
  });

  const school = await tenantContext.run({ tenantId: tenant.id }, async () => {
    await kernel.db.role.create({
      data: { tenantId: tenant.id, name: "Student" },
    });
    await kernel.db.role.create({
      data: { tenantId: tenant.id, name: "Parent" },
    });
    return kernel.db.school.create({
      data: { tenantId: tenant.id, name: `Phase5E School ${Date.now()}` },
    });
  });

  const runScoped = (fn) =>
    tenantContext.run(
      { tenantId: tenant.id, schoolId: school.id, userId: "admin-5e" },
      fn
    );

  await runScoped(async () => {
    // 2. Create student without email initially
    const student = await studentsService.createStudent({
      schoolId: school.id,
      firstName: "Chidi",
      lastName: "Okafor",
      gender: "MALE",
      admissionDate: new Date(),
    });

    assert(student.id, "Student created successfully");
    assert(student.email === null || student.email === undefined, "Unprovisioned student starts with null email");

    // 3. Test rejection of empty email / no fallback
    try {
      await portalService.provisionStudentPortal(tenant.id, school.id, student.id, "admin-5e", {});
      assert(false, "Should reject empty email provisioning");
    } catch (err) {
      assert(err.message.includes("Email address is required"), "Rejects empty email with explicit BadRequestException");
    }

    // 4. Test rejection of synthetic @school.internal email
    try {
      await portalService.provisionStudentPortal(tenant.id, school.id, student.id, "admin-5e", { email: "stu.1234@school.internal" });
      assert(false, "Should reject @school.internal fallback email");
    } catch (err) {
      assert(err.message.includes("valid recipient email address"), "Rejects @school.internal fallback email");
    }

    // 5. Test successful student provisioning with real email
    const realStuEmail = `chidi.test.${Date.now()}@example.com`;
    const stuProvRes = await portalService.provisionStudentPortal(tenant.id, school.id, student.id, "admin-5e", { email: realStuEmail });

    assert(stuProvRes.success === true, "Student provisioning returns success");
    assert(stuProvRes.email === realStuEmail, "Provision returns real email address");
    assert(typeof stuProvRes.emailSent === "boolean", "Returns explicit emailSent boolean");

    // Verify Student model email field was populated & synced
    const updatedStu = await kernel.db.student.findUnique({ where: { id: student.id } });
    assert(updatedStu.email === realStuEmail, "Student.email field updated in database");

    const linkedUser = await kernel.db.user.findUnique({ where: { id: updatedStu.userId } });
    assert(linkedUser.email === realStuEmail, "User.email created and synced to student email");

    // 6. Test updating student email updates both Student & User
    const updatedStuEmail = `chidi.updated.${Date.now()}@example.com`;
    await studentsService.updateStudent(student.id, { email: updatedStuEmail });

    const reFetchedStu = await kernel.db.student.findUnique({ where: { id: student.id } });
    const reFetchedUser = await kernel.db.user.findUnique({ where: { id: linkedUser.id } });
    assert(reFetchedStu.email === updatedStuEmail, "Student.email updated via PATCH API");
    assert(reFetchedUser.email === updatedStuEmail, "Linked User.email synchronized on PATCH");

    // 7. Create Guardian & test Guardian provisioning
    const guardian = await studentsService.createGuardian({
      firstName: "Ngozi",
      lastName: "Okafor",
      phone: "+2348099887766",
      email: `ngozi.test.${Date.now()}@example.com`,
    });

    await studentsService.linkGuardian({
      studentId: student.id,
      guardianId: guardian.id,
      relationship: "MOTHER",
      isPrimary: true,
      schoolId: school.id,
      roleId: "Super Admin",
    });

    const gProvRes = await portalService.provisionGuardianPortal(tenant.id, school.id, guardian.id, "admin-5e", {});
    assert(gProvRes.success === true, "Guardian portal provisioned cleanly");
    assert(gProvRes.email === guardian.email.toLowerCase(), "Guardian provision uses stored guardian email");

    // 8. Test updating Guardian email updates both Guardian & User
    const updatedGEmail = `ngozi.updated.${Date.now()}@example.com`;
    await studentsService.updateGuardian(guardian.id, { email: updatedGEmail });

    const reFetchedG = await kernel.db.guardian.findUnique({ where: { id: guardian.id } });
    const reFetchedGUser = await kernel.db.user.findUnique({ where: { id: gProvRes.userId } });
    assert(reFetchedG.email === updatedGEmail, "Guardian.email updated via PATCH API");
    assert(reFetchedGUser.email === updatedGEmail, "Linked Guardian User.email synchronized on PATCH");

    // 9. Test honest delivery reporting when email provider fails
    const originalSend = notificationsService.sendTransactionalEmail.bind(notificationsService);
    notificationsService.sendTransactionalEmail = async () => {
      throw new Error("SMTP Connection Failed");
    };

    const resendRes = await portalService.resendInvitation(tenant.id, school.id, student.id, "STUDENT", "admin-5e");
    assert(resendRes.success === true, "Resend returns success=true for token creation");
    assert(resendRes.emailSent === false, "Honest reporting: emailSent=false when SMTP fails");
    assert(resendRes.emailError.includes("we could not send the invitation email"), "Returns user-friendly error message");
    assert(resendRes.token, "Token is preserved for manual copy/retry despite email failure");

    notificationsService.sendTransactionalEmail = originalSend;

    // 10. Activation token verification & account activation
    const valRes = await portalService.validateToken(resendRes.token);
    assert(valRes.valid === true, "Activation token validates cleanly");

    const actRes = await portalService.activateAccount({ token: resendRes.token, password: "Password123!" });
    assert(actRes.success === true, "Account activated successfully with password");

    const activatedUser = await kernel.db.user.findUnique({ where: { id: resendRes.userId } });
    assert(activatedUser.passwordHash !== null, "Password hash set on activated user");
  });

  console.log("\n==================================================");
  console.log(`PHASE 5E VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5ELiveTest().catch((err) => {
  console.error("FATAL TEST EXCEPTION:", err);
  process.exit(1);
});
