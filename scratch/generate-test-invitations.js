const crypto = require("crypto");
const path = require("path");
const argon2 = require(path.resolve(__dirname, "../apps/api-gateway/node_modules/argon2"));
const { kernel, tenantContext } = require("../packages/core-platform/dist/index.js");

async function generateTestInvitations() {
  console.log("=================================================");
  console.log("  GENERATING PHASE 5 BROWSER TEST INVITATIONS");
  console.log("=================================================");

  try {
    const tenant = await kernel.db.tenant.findFirst({ where: { status: "ACTIVE" } });
    if (!tenant) throw new Error("No active tenant found");

    await tenantContext.run({ tenantId: tenant.id }, async () => {
      const school = await kernel.db.school.findFirst({ where: { tenantId: tenant.id } });
      if (!school) throw new Error("No active school found");

      const defaultPasswordHash = await argon2.hash("TempPassword123!");

      // 1. Create or find Test Student User
      const studentEmail = `student-${Date.now()}@schoolos.test`;
      const studentUser = await kernel.db.user.create({
        data: {
          email: studentEmail,
          passwordHash: defaultPasswordHash,
          globalRole: "USER",
        },
      });

      const student = await kernel.db.student.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          userId: studentUser.id,
          firstName: "Alex",
          lastName: "Tester",
          gender: "MALE",
          dateOfBirth: new Date("2010-05-15"),
          admissionDate: new Date(),
          studentNumber: `STU-${Date.now()}`,
        },
      });

      const studentRawToken = crypto.randomBytes(32).toString("hex");
      const studentTokenHash = crypto.createHash("sha256").update(studentRawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 72 * 3600 * 1000);

      await kernel.db.portalInvitation.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          targetType: "STUDENT",
          studentId: student.id,
          userId: studentUser.id,
          createdById: studentUser.id,
          tokenHash: studentTokenHash,
          expiresAt,
        },
      });

      // 2. Create or find Test Guardian User
      const guardianEmail = `guardian-${Date.now()}@schoolos.test`;
      const guardianUser = await kernel.db.user.create({
        data: {
          email: guardianEmail,
          passwordHash: defaultPasswordHash,
          globalRole: "USER",
        },
      });

      const guardian = await kernel.db.guardian.create({
        data: {
          tenantId: tenant.id,
          userId: guardianUser.id,
          firstName: "Patricia",
          lastName: "Tester",
          email: guardianEmail,
          phone: `+23480${Math.floor(10000000 + Math.random() * 90000000)}`,
        },
      });

      // Link Guardian to Student
      await kernel.db.studentGuardian.create({
        data: {
          tenantId: tenant.id,
          studentId: student.id,
          guardianId: guardian.id,
          relationship: "MOTHER",
          isPrimary: true,
          isEmergencyContact: true,
        },
      });

      const guardianRawToken = crypto.randomBytes(32).toString("hex");
      const guardianTokenHash = crypto.createHash("sha256").update(guardianRawToken).digest("hex");

      await kernel.db.portalInvitation.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          targetType: "GUARDIAN",
          guardianId: guardian.id,
          userId: guardianUser.id,
          createdById: guardianUser.id,
          tokenHash: guardianTokenHash,
          expiresAt,
        },
      });

      console.log("\n-------------------------------------------------");
      console.log("  1. STUDENT ACTIVATION URL:");
      console.log(`  http://localhost:3000/activate?token=${studentRawToken}`);
      console.log(`  Recipient: ${student.firstName} ${student.lastName} (${studentEmail})`);
      console.log("-------------------------------------------------");
      console.log("  2. PARENT / GUARDIAN ACTIVATION URL:");
      console.log(`  http://localhost:3000/activate?token=${guardianRawToken}`);
      console.log(`  Recipient: ${guardian.firstName} ${guardian.lastName} (${guardianEmail})`);
      console.log("-------------------------------------------------\n");
    });
  } catch (err) {
    console.error("Error generating test invitations:", err);
  } finally {
    process.exit(0);
  }
}

generateTestInvitations();
