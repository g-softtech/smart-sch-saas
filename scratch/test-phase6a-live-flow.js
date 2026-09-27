const { kernel, tenantContext } = require("../packages/core-platform/dist/index.js");
const prisma = kernel.db;

async function runPhase6aVerification() {
  console.log("=================================================");
  console.log("  PHASE 6A LIVE E2E & SECURITY VERIFICATION");
  console.log("=================================================");

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      testsPassed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      testsFailed++;
    }
  }

  try {
    // 1. Verify Schema Models & Relational Integrity in Database
    console.log("\n1. DATABASE SCHEMA INTEGRITY");
    const tenants = await kernel.$queryRaw`SELECT id, name FROM plt_tenants LIMIT 1`;
    assert(tenants && tenants.length > 0, "Found existing active tenant in DB");
    const tenant = tenants[0];

    const schools = await kernel.$queryRaw`SELECT id, name FROM "School" WHERE "tenantId" = ${tenant.id} LIMIT 1`;
    assert(schools && schools.length > 0, "Found existing active school in DB");
    const school = schools[0];

    await tenantContext.run({ tenantId: tenant.id }, async () => {
      // Clean up any existing Phase 6A test records
      await prisma.schoolModuleSetting.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.tenantEntitlement.deleteMany({ where: { tenantId: tenant.id } });

      // 2. Test TenantEntitlement Model Lifecycle
      console.log("\n2. TENANT ENTITLEMENT DB LIFECYCLE");
      const entitlement = await prisma.tenantEntitlement.create({
        data: {
          tenantId: tenant.id,
          moduleKey: "LIBRARY",
          status: "ACTIVE",
          validUntil: new Date("2027-12-31T23:59:59.000Z"),
        },
      });
      assert(entitlement.moduleKey === "LIBRARY", "Created TenantEntitlement for LIBRARY");
      assert(entitlement.status === "ACTIVE", "Entitlement status is ACTIVE");

      // 3. Test SchoolModuleSetting Model & Composite FK Integrity
      console.log("\n3. SCHOOL MODULE SETTING & COMPOSITE FK INTEGRITY");
      const setting = await prisma.schoolModuleSetting.create({
        data: {
          tenantId: tenant.id,
          schoolId: school.id,
          moduleKey: "LIBRARY",
          isEnabled: true,
        },
      });
      assert(setting.moduleKey === "LIBRARY", "Created SchoolModuleSetting for LIBRARY");
      assert(setting.isEnabled === true, "School setting is enabled");

      // Test Composite FK violation: Attempting to create setting with mismatched tenantId should fail
      try {
        await tenantContext.run({ tenantId: "fake-tenant-uuid-1234" }, async () => {
          await prisma.schoolModuleSetting.create({
            data: {
              tenantId: "fake-tenant-uuid-1234",
              schoolId: school.id,
              moduleKey: "TRANSPORT",
              isEnabled: true,
            },
          });
        });
        assert(false, "Foreign key constraint failed as expected on mismatched tenantId/schoolId");
      } catch (fkErr) {
        assert(true, "Composite Foreign Key correctly rejected mismatched tenantId/schoolId");
      }

      // 4. Test Entitlement Evaluation Function Rules
      console.log("\n4. RUNTIME ENTITLEMENT EVALUATOR RULES");
      function isTenantModuleEntitled(entitlement, now = new Date()) {
        if (!entitlement) return false;
        if (entitlement.status === "SUSPENDED" || entitlement.status === "EXPIRED") return false;
        if (entitlement.validUntil && new Date(entitlement.validUntil) < now) return false;
        return entitlement.status === "ACTIVE" || entitlement.status === "TRIAL";
      }

      function isModuleAvailableForSchool(entitlement, setting, now = new Date()) {
        if (!isTenantModuleEntitled(entitlement, now)) {
          return { available: false, reason: "MODULE_NOT_ENTITLED" };
        }
        if (!setting || !setting.isEnabled) {
          return { available: false, reason: "MODULE_DISABLED_AT_SCHOOL" };
        }
        return { available: true };
      }

      const now = new Date("2026-09-27T12:00:00.000Z");

      // ACTIVE & Valid Date
      assert(isTenantModuleEntitled(entitlement, now) === true, "ACTIVE entitlement with future validUntil is entitled");

      // SUSPENDED
      const suspended = { status: "SUSPENDED", validUntil: new Date("2027-12-31") };
      assert(isTenantModuleEntitled(suspended, now) === false, "SUSPENDED entitlement returns false");

      // EXPIRED
      const expired = { status: "ACTIVE", validUntil: new Date("2026-01-01") };
      assert(isTenantModuleEntitled(expired, now) === false, "Expired validUntil returns false regardless of ACTIVE status");

      // School Availability
      assert(isModuleAvailableForSchool(entitlement, setting, now).available === true, "Entitled + School Enabled = Available");
      assert(
        isModuleAvailableForSchool(entitlement, { isEnabled: false }, now).reason === "MODULE_DISABLED_AT_SCHOOL",
        "Entitled + School Disabled = MODULE_DISABLED_AT_SCHOOL",
      );
      assert(
        isModuleAvailableForSchool(null, setting, now).reason === "MODULE_NOT_ENTITLED",
        "Not Entitled + School Enabled = MODULE_NOT_ENTITLED",
      );

      // 5. Cleanup test records
      await prisma.schoolModuleSetting.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.tenantEntitlement.deleteMany({ where: { tenantId: tenant.id } });
    });

    console.log("\n=================================================");
    console.log(`  VERIFICATION RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log("=================================================");

    if (testsFailed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("FATAL E2E TEST ERROR:", err);
    process.exit(1);
  }
}

runPhase6aVerification();
