import { Controller, Post, Body, Req, UseGuards, Param } from "@nestjs/common";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { RouteService } from "../services/route.service";
import { CreateRouteDto, SyncRouteStopsDto, CreateAllocationDto } from "../dto/route.dto";
import { tenantContext } from "@saas/core-platform";

@Controller("api/v1/academics/transport/routes")
@UseGuards(JwtAuthGuard)
export class AdminRouteController {
  constructor(private routeService: RouteService) {}

  @Post()
  
  async createRoute(@Req() req: any, @Body() dto: CreateRouteDto) {
    const ctx = tenantContext.getStore();
    return this.routeService.createRoute(ctx!.tenantId, req.headers["x-school-id"], req.user.sub, dto);
  }

  @Post(":id/stops/sync")
  
  async syncStops(@Req() req: any, @Param("id") id: string, @Body() dto: SyncRouteStopsDto) {
    const ctx = tenantContext.getStore();
    return this.routeService.syncStops(ctx!.tenantId, req.headers["x-school-id"], id, req.user.sub, dto);
  }

  @Post(":id/allocations")
  
  async createAllocation(@Req() req: any, @Param("id") id: string, @Body() dto: CreateAllocationDto) {
    const ctx = tenantContext.getStore();
    return this.routeService.createAllocation(ctx!.tenantId, req.headers["x-school-id"], id, req.user.sub, dto);
  }
}


