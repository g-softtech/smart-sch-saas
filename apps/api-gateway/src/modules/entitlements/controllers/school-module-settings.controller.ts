import { Controller, Get, Patch, Param, Body, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { PoliciesGuard } from "../../identity/security/policies.guard";
import { RequirePermission } from "../../identity/security/require-permission.decorator";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { EntitlementsService } from "../services/entitlements.service";
import { UpdateSchoolModuleSettingDto } from "../dto/entitlements.dto";
import { ModuleKey } from "@saas/core-platform";

@ApiTags("School Module Settings")
@ApiBearerAuth()
@ApiHeader({ name: "x-tenant-id", required: true })
@ApiHeader({ name: "x-school-id", required: true })
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UseInterceptors(WorkspaceContextInterceptor)
@Controller("api/v1/schools/module-settings")
export class SchoolModuleSettingsController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  @Get(":moduleKey")
  @ApiOperation({ summary: "Get school module setting for a specific module" })
  @ApiResponse({ status: 200, description: "School module setting returned" })
  @RequirePermission("school:manage_module_settings")
  async getSchoolModuleSetting(@Req() req: any, @Param("moduleKey") moduleKey: ModuleKey) {
    const tenantId = req.workspace.tenantId;
    const schoolId = req.workspace.schoolId;
    return this.entitlementsService.getSchoolModuleSetting(tenantId, schoolId, moduleKey);
  }

  @Patch(":moduleKey")
  @ApiOperation({ summary: "Update school module enablement and config" })
  @ApiResponse({ status: 200, description: "School module setting updated" })
  @RequirePermission("school:manage_module_settings")
  async updateSchoolModuleSetting(
    @Req() req: any,
    @Param("moduleKey") moduleKey: ModuleKey,
    @Body() dto: UpdateSchoolModuleSettingDto,
  ) {
    const tenantId = req.workspace.tenantId;
    const schoolId = req.workspace.schoolId;
    const actorUserId = req.user.sub;
    return this.entitlementsService.updateSchoolModuleSetting(tenantId, schoolId, moduleKey, dto, actorUserId);
  }
}
