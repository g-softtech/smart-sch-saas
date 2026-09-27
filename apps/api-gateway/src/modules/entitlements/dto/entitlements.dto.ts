import { IsEnum, IsBoolean, IsOptional, IsDateString, IsObject } from "class-validator";
import { ModuleKey, EntitlementStatus } from "@saas/core-platform";

export class UpdateTenantEntitlementDto {
  @IsEnum(EntitlementStatus)
  status!: EntitlementStatus;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class UpdateSchoolModuleSettingDto {
  @IsBoolean()
  isEnabled!: boolean;

  @IsOptional()
  @IsObject()
  configJson?: Record<string, any>;
}
