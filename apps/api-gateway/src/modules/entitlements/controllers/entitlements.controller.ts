import { Controller, Get, Patch, Param, Body, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { PoliciesGuard } from "../../identity/security/policies.guard";
import { RequirePermission } from "../../identity/security/require-permission.decorator";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { EntitlementsService } from "../services/entitlements.service";
import { UpdateTenantEntitlementDto } from "../dto/entitlements.dto";
import { ModuleKey } from "@saas/core-platform";

@ApiTags("Entitlements")
@ApiBearerAuth()
@ApiHeader({ name: "x-tenant-id", required: true })
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UseInterceptors(WorkspaceContextInterceptor)
@Controller("api/v1/entitlements")
export class EntitlementsController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  @Get()
  @ApiOperation({ summary: "Get tenant entitlements summary for current workspace" })
  @ApiResponse({ status: 200, description: "Entitlements summary returned" })
  async getEntitlementsSummary(@Req() req: any) {
    const tenantId = req.workspace.tenantId;
    const schoolId = req.workspace.schoolId;
    return this.entitlementsService.getTenantEntitlementsSummary(tenantId, schoolId);
  }

  @Patch(":moduleKey")
  @ApiOperation({ summary: "Update tenant module entitlement status (SUPER_ADMIN only)" })
  @ApiResponse({ status: 200, description: "Tenant entitlement updated" })
  @RequirePermission("tenant:manage_entitlements")
  async updateTenantEntitlement(
    @Req() req: any,
    @Param("moduleKey") moduleKey: ModuleKey,
    @Body() dto: UpdateTenantEntitlementDto,
  ) {
    const tenantId = req.workspace.tenantId;
    const actorUserId = req.user.sub;
    return this.entitlementsService.updateTenantEntitlement(tenantId, moduleKey, dto, actorUserId);
  }
}
