import { EntitlementStatus } from "@saas/core-platform";

export function isTenantModuleEntitled(
  entitlement: { status: EntitlementStatus; validUntil?: Date | null } | null,
  now: Date = new Date(),
): boolean {
  if (!entitlement) return false;
  if (entitlement.status === "SUSPENDED" || entitlement.status === "EXPIRED") return false;
  if (entitlement.validUntil && new Date(entitlement.validUntil) < now) return false;
  return entitlement.status === "ACTIVE" || entitlement.status === "TRIAL";
}

export function isModuleAvailableForSchool(
  entitlement: { status: EntitlementStatus; validUntil?: Date | null } | null,
  setting: { isEnabled: boolean } | null,
  now: Date = new Date(),
): { available: boolean; reason?: "MODULE_NOT_ENTITLED" | "MODULE_DISABLED_AT_SCHOOL" } {
  if (!isTenantModuleEntitled(entitlement, now)) {
    return { available: false, reason: "MODULE_NOT_ENTITLED" };
  }
  if (!setting || !setting.isEnabled) {
    return { available: false, reason: "MODULE_DISABLED_AT_SCHOOL" };
  }
  return { available: true };
}
