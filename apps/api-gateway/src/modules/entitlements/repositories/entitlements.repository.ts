import { Injectable } from "@nestjs/common";
import { kernel, ModuleKey, EntitlementStatus } from "@saas/core-platform";

@Injectable()
export class EntitlementsRepository {
  async findTenantEntitlements(tenantId: string) {
    return kernel.db.tenantEntitlement.findMany({
      where: { tenantId },
    });
  }

  async findTenantEntitlement(tenantId: string, moduleKey: ModuleKey) {
    return kernel.db.tenantEntitlement.findUnique({
      where: {
        tenantId_moduleKey: {
          tenantId,
          moduleKey,
        },
      },
    });
  }

  async upsertTenantEntitlement(
    tenantId: string,
    moduleKey: ModuleKey,
    status: EntitlementStatus,
    validUntil?: Date | null,
  ) {
    return kernel.db.tenantEntitlement.upsert({
      where: {
        tenantId_moduleKey: {
          tenantId,
          moduleKey,
        },
      },
      create: {
        tenantId,
        moduleKey,
        status,
        validUntil: validUntil || null,
      },
      update: {
        status,
        validUntil: validUntil !== undefined ? validUntil : undefined,
      },
    });
  }

  async findSchoolModuleSettings(tenantId: string, schoolId: string) {
    return kernel.db.schoolModuleSetting.findMany({
      where: { tenantId, schoolId },
    });
  }

  async findSchoolModuleSetting(tenantId: string, schoolId: string, moduleKey: ModuleKey) {
    return kernel.db.schoolModuleSetting.findUnique({
      where: {
        schoolId_moduleKey: {
          schoolId,
          moduleKey,
        },
      },
    });
  }

  async upsertSchoolModuleSetting(
    tenantId: string,
    schoolId: string,
    moduleKey: ModuleKey,
    isEnabled: boolean,
    configJson?: Record<string, any>,
  ) {
    return kernel.db.schoolModuleSetting.upsert({
      where: {
        schoolId_moduleKey: {
          schoolId,
          moduleKey,
        },
      },
      create: {
        tenantId,
        schoolId,
        moduleKey,
        isEnabled,
        configJson: configJson || {},
      },
      update: {
        isEnabled,
        configJson: configJson !== undefined ? configJson : undefined,
      },
    });
  }
}
