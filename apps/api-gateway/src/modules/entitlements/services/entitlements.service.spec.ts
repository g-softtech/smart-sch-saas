import { isTenantModuleEntitled, isModuleAvailableForSchool } from "../utils/entitlement-evaluator";
import { EntitlementStatus } from "@saas/core-platform";

describe("Phase 6A Entitlement Evaluator Utility", () => {
  const now = new Date("2026-09-27T12:00:00.000Z");

  describe("isTenantModuleEntitled", () => {
    it("returns false if entitlement is null", () => {
      expect(isTenantModuleEntitled(null, now)).toBe(false);
    });

    it("returns true for ACTIVE entitlement with no expiration", () => {
      expect(isTenantModuleEntitled({ status: EntitlementStatus.ACTIVE }, now)).toBe(true);
    });

    it("returns true for TRIAL entitlement with future expiration", () => {
      expect(
        isTenantModuleEntitled(
          { status: EntitlementStatus.TRIAL, validUntil: new Date("2026-12-31T23:59:59.000Z") },
          now,
        ),
      ).toBe(true);
    });

    it("returns false for SUSPENDED status even if validUntil is in future", () => {
      expect(
        isTenantModuleEntitled(
          { status: EntitlementStatus.SUSPENDED, validUntil: new Date("2026-12-31T23:59:59.000Z") },
          now,
        ),
      ).toBe(false);
    });

    it("returns false for EXPIRED status", () => {
      expect(isTenantModuleEntitled({ status: EntitlementStatus.EXPIRED }, now)).toBe(false);
    });

    it("returns false when validUntil is in the past even if status is ACTIVE", () => {
      expect(
        isTenantModuleEntitled(
          { status: EntitlementStatus.ACTIVE, validUntil: new Date("2026-01-01T00:00:00.000Z") },
          now,
        ),
      ).toBe(false);
    });
  });

  describe("isModuleAvailableForSchool", () => {
    it("returns available=false with MODULE_NOT_ENTITLED if tenant is not entitled", () => {
      const res = isModuleAvailableForSchool(null, { isEnabled: true }, now);
      expect(res.available).toBe(false);
      expect(res.reason).toBe("MODULE_NOT_ENTITLED");
    });

    it("returns available=false with MODULE_DISABLED_AT_SCHOOL if school setting is missing", () => {
      const entitlement = { status: EntitlementStatus.ACTIVE };
      const res = isModuleAvailableForSchool(entitlement, null, now);
      expect(res.available).toBe(false);
      expect(res.reason).toBe("MODULE_DISABLED_AT_SCHOOL");
    });

    it("returns available=false with MODULE_DISABLED_AT_SCHOOL if school setting is disabled", () => {
      const entitlement = { status: EntitlementStatus.ACTIVE };
      const res = isModuleAvailableForSchool(entitlement, { isEnabled: false }, now);
      expect(res.available).toBe(false);
      expect(res.reason).toBe("MODULE_DISABLED_AT_SCHOOL");
    });

    it("returns available=true when tenant is entitled AND school setting is enabled", () => {
      const entitlement = { status: EntitlementStatus.ACTIVE };
      const res = isModuleAvailableForSchool(entitlement, { isEnabled: true }, now);
      expect(res.available).toBe(true);
      expect(res.reason).toBeUndefined();
    });
  });
});
