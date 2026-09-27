import { Injectable, NotFoundException } from "@nestjs/common";
import { EntitlementsRepository } from "../repositories/entitlements.repository";
import { ModuleKey, EntitlementStatus, tenantContext, kernel } from "@saas/core-platform";
import { isTenantModuleEntitled, isModuleAvailableForSchool } from "../utils/entitlement-evaluator";
import { UpdateTenantEntitlementDto, UpdateSchoolModuleSettingDto } from "../dto/entitlements.dto";

const ALL_MODULE_KEYS: ModuleKey[] = [
  ModuleKey.LIBRARY,
  ModuleKey.TRANSPORT,
  ModuleKey.HOSTEL,
  ModuleKey.CMS,
  ModuleKey.MARKETPLACE,
  ModuleKey.AI,
];

@Injectable()
export class EntitlementsService {
  constructor(private readonly repo: EntitlementsRepository) {}

  async getTenantEntitlementsSummary(tenantId: string, schoolId?: string) {
    return tenantContext.run({ tenantId }, async () => {
      const entitlements = await this.repo.findTenantEntitlements(tenantId);
      const settings = schoolId ? await this.repo.findSchoolModuleSettings(tenantId, schoolId) : [];

      const entitlementMap = new Map(entitlements.map((e) => [e.moduleKey, e]));
      const settingMap = new Map(settings.map((s) => [s.moduleKey, s]));

      return ALL_MODULE_KEYS.map((moduleKey) => {
        const entitlement = entitlementMap.get(moduleKey) || null;
        const setting = settingMap.get(moduleKey) || null;
        const isEntitled = isTenantModuleEntitled(entitlement);
        const { available } = isModuleAvailableForSchool(entitlement, setting);

        return {
          moduleKey,
          status: entitlement?.status || EntitlementStatus.EXPIRED,
          isEntitled,
          isEnabledAtSchool: setting?.isEnabled || false,
          isAvailable: available,
          validUntil: entitlement?.validUntil || null,
        };
      });
    });
  }

  async updateTenantEntitlement(
    tenantId: string,
    moduleKey: ModuleKey,
    dto: UpdateTenantEntitlementDto,
    actorUserId: string,
  ) {
    return tenantContext.run({ tenantId }, async () => {
      const validUntilDate = dto.validUntil ? new Date(dto.validUntil) : null;
      const updated = await this.repo.upsertTenantEntitlement(tenantId, moduleKey, dto.status, validUntilDate);

      try {
        await kernel.db.auditLog.create({
          data: {
            tenantId,
            action: "ENTITLEMENT_UPDATED",
            entity: "TenantEntitlement",
            entityId: updated.id,
            userId: actorUserId,
            metadata: { moduleKey, status: dto.status, validUntil: dto.validUntil },
          },
        });
      } catch (err) {
        // Non-destructive audit logging
      }

      return updated;
    });
  }

  async getSchoolModuleSetting(tenantId: string, schoolId: string, moduleKey: ModuleKey) {
    return tenantContext.run({ tenantId }, async () => {
      const setting = await this.repo.findSchoolModuleSetting(tenantId, schoolId, moduleKey);
      if (!setting) {
        return {
          tenantId,
          schoolId,
          moduleKey,
          isEnabled: false,
          schemaVersion: 1,
          configJson: {},
        };
      }
      return setting;
    });
  }

  async updateSchoolModuleSetting(
    tenantId: string,
    schoolId: string,
    moduleKey: ModuleKey,
    dto: UpdateSchoolModuleSettingDto,
    actorUserId: string,
  ) {
    return tenantContext.run({ tenantId }, async () => {
      const updated = await this.repo.upsertSchoolModuleSetting(
        tenantId,
        schoolId,
        moduleKey,
        dto.isEnabled,
        dto.configJson,
      );

      try {
        await kernel.db.auditLog.create({
          data: {
            tenantId,
            action: "SCHOOL_MODULE_SETTING_UPDATED",
            entity: "SchoolModuleSetting",
            entityId: updated.id,
            userId: actorUserId,
            metadata: { schoolId, moduleKey, isEnabled: dto.isEnabled },
          },
        });
      } catch (err) {
        // Non-destructive audit logging
      }

      return updated;
    });
  }
}
