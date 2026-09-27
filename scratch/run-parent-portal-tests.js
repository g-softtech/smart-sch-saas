const { kernel, tenantContext } = require("../packages/core-platform/dist/index.js");
const crypto = require("crypto");

async function main() {
  console.log("==========================================");
  console.log("PHASE 5B: PARENT PORTAL BFF UNIT & SECURITY TEST RUNNER");
  console.log("==========================================");

  const tenantId = "097c6dc2-1383-447b-a5eb-97ef631f6cff";
  const { ParentPortalService } = require("../apps/api-gateway/dist/modules/portal-parent/services/parent-portal.service.js");

  const service = new ParentPortalService();

  await tenantContext.run({ tenantId }, async () => {
    // 1. Test unlinked user rejection
    console.log("\n1. Testing Guardian Identity Resolution (unlinked user rejection)...");
    const fakeUserId = "00000000-0000-0000-0000-000000000000";
    try {
      await service.resolveGuardian(fakeUserId, tenantId);
      console.error("FAILED: Expected unlinked user to throw NotFoundException");
      process.exit(1);
    } catch (err) {
      if (err.status === 404 || err.name === "NotFoundException" || err.message.includes("not linked")) {
        console.log("✓ Unlinked user correctly rejected (NotFoundException 404)");
      } else {
        console.error("FAILED with unexpected error:", err);
        process.exit(1);
      }
    }

    // 2. Link a test user to an active Guardian profile & Student link
    console.log("\n2. Linking test user to Guardian profile...");
    const users = await kernel.db.$queryRaw`SELECT * FROM idm_users;`;
    const userId = users[0].id;

    let guardian = await kernel.db.guardian.findFirst({ where: { tenantId } });
    if (!guardian) {
      guardian = await kernel.db.guardian.create({
        data: {
          id: crypto.randomUUID(),
          tenantId,
          firstName: "Parent",
          lastName: "Verif",
          email: "parent.verif@schoolos.com",
        },
      });
    }

    // Link Guardian -> User
    await kernel.db.guardian.update({
      where: { id: guardian.id },
      data: { userId },
    });

    const student = await kernel.db.student.findFirst({ where: { tenantId } });
    if (student) {
      // Ensure StudentGuardian link exists
      const link = await kernel.db.studentGuardian.findFirst({
        where: { tenantId, studentId: student.id, guardianId: guardian.id },
      });
      if (!link) {
        await kernel.db.studentGuardian.create({
          data: {
            tenantId,
            studentId: student.id,
            guardianId: guardian.id,
            relationship: "FATHER",
            isPrimary: true,
          },
        });
      }
    }

    const resolvedGuardian = await service.resolveGuardian(userId, tenantId);
    console.log(`✓ Authoritative userId lookup resolved Guardian: ${resolvedGuardian.firstName} ${resolvedGuardian.lastName} (${resolvedGuardian.id})`);
    console.log(`✓ Guardian has ${resolvedGuardian.students.length} linked child(ren)`);

    // 3. Test Unauthorized Child Access Rejection
    console.log("\n3. Testing Child Linkage Authorization Check...");
    const unlinkedChildId = "00000000-0000-0000-0000-000000000000";
    try {
      await service.getChildResults(userId, tenantId, unlinkedChildId);
      console.error("FAILED: Expected unlinked child access to throw ForbiddenException");
      process.exit(1);
    } catch (err) {
      if (err.status === 403 || err.name === "ForbiddenException" || err.message.includes("authorization")) {
        console.log("✓ Unlinked child data access correctly blocked (ForbiddenException 403)");
      } else {
        console.error("FAILED with unexpected error:", err);
        process.exit(1);
      }
    }

    // 4. Test Cross-Tenant Guardian Isolation
    console.log("\n4. Testing Cross-Tenant Guardian Isolation...");
    const badTenantId = "00000000-0000-0000-0000-000000000000";
    try {
      await service.resolveGuardian(userId, badTenantId);
      console.error("FAILED: Expected cross-tenant guardian lookup to throw NotFoundException");
      process.exit(1);
    } catch (err) {
      console.log("✓ Cross-tenant guardian lookup correctly isolated");
    }

    console.log("\n==========================================");
    console.log("ALL PHASE 5B PARENT BFF SECURITY TESTS PASSED!");
    console.log("==========================================");
  });
}

main()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await kernel.db.$disconnect();
  });
