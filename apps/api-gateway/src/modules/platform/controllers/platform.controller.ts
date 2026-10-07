import { Controller, Get, UseGuards, Query, Param, ParseIntPipe, DefaultValuePipe } from "@nestjs/common";
import { PlatformAuthGuard } from "../../identity/security/platform-auth.guard";
import { PlatformReadService } from "../services/platform-read.service";

@Controller("api/v1/platform")
@UseGuards(PlatformAuthGuard)
export class PlatformController {
  constructor(private readonly platformReadService: PlatformReadService) {}
  
  @Get("health")
  getHealth() {
    return { status: "ok", boundary: "platform-super-admin" };
  }

  @Get("metrics")
  getMetrics() {
    return this.platformReadService.getDashboardMetrics();
  }

  @Get("tenants")
  getTenants(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('search') search?: string,
  ) {
    return this.platformReadService.getTenants(skip, take, search);
  }

  @Get("tenants/:id")
  getTenantDetails(@Param('id') tenantId: string) {
    return this.platformReadService.getTenantDetails(tenantId);
  }
}
