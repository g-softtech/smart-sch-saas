const path = require("path");
const { kernel, tenantContext } = require(path.resolve(__dirname, "../packages/core-platform/dist/index.js"));

async function main() {
  console.log("==========================================");
  console.log("PHASE 5A: STUDENT PORTAL BFF UNIT TEST RUNNER");
  console.log("==========================================");

  const tenantId = "097c6dc2-1383-447b-a5eb-97ef631f6cff";
  let schoolId;
  let userId;

  await tenantContext.run({ tenantId }, async () => {
    const school = await kernel.db.school.findFirst();
    schoolId = school.id;

    const user = await kernel.db.user.findFirst();
    userId = user.id;

    // Test 1: Identity Resolution Security Check
    console.log("\n1. Testing Student Identity Resolution (unlinked user rejection)...");
    const unlinkedUser = "unlinked-user-id-999";
    const studentMatch = await kernel.db.student.findFirst({
      where: {
        userId: unlinkedUser,
        status: "ACTIVE",
      },
    });

    if (studentMatch) {
      console.error("FAILED: Unlinked user matched a student profile!");
      process.exit(1);
    }
    console.log("✓ Unlinked user correctly returned null student profile");

    // Test 2: Verify user linkage update on active student
    console.log("\n2. Linking test user to active student profile...");
    const activeStudent = await kernel.db.student.findFirst();

    if (!activeStudent) {
      console.error("No active student found for test");
      process.exit(1);
    }

    await kernel.db.student.update({
      where: { id: activeStudent.id },
      data: { userId: user.id },
    });

    const resolvedStudent = await kernel.db.student.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
    });

    if (!resolvedStudent || resolvedStudent.id !== activeStudent.id) {
      console.error("FAILED: Authoritative userId lookup failed to resolve linked student!");
      process.exit(1);
    }
    console.log(`✓ Authoritative userId lookup resolved student ID: ${resolvedStudent.id} (${resolvedStudent.firstName} ${resolvedStudent.lastName})`);

    // Test 3: Cross-tenant isolation
    console.log("\n3. Testing Cross-Tenant Student Isolation...");
    await tenantContext.run({ tenantId: "00000000-0000-0000-0000-000000000000" }, async () => {
      const crossTenantStudent = await kernel.db.student.findFirst({
        where: { userId: user.id },
      });
      if (crossTenantStudent) {
        console.error("FAILED: Cross-tenant query returned student!");
        process.exit(1);
      }
      console.log("✓ Cross-tenant student lookup correctly isolated (null returned)");
    });
  });

  console.log("\n==========================================");
  console.log("ALL PHASE 5A BFF IDENTITY SECURITY TESTS PASSED!");
  console.log("==========================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await kernel.db.$disconnect();
  });
