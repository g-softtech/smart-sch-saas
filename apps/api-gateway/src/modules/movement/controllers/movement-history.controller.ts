import { Controller, Get, Query, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { MovementHistoryService } from "../services/movement-history.service";
import { MovementHistoryQueryDto } from "../dto/movement.dto";
import { RequirePermission } from "../../identity/security/require-permission.decorator";

@ApiTags("Movement History")
@ApiBearerAuth()
@ApiHeader({ name: "x-tenant-id", required: true })
@ApiHeader({ name: "x-school-id", required: true })
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
@Controller("api/v1/movement")
export class MovementHistoryController {
  constructor(private readonly historyService: MovementHistoryService) {}

  @Get("arrivals")
  @ApiOperation({ summary: "Get student arrival history" })
  @ApiResponse({ status: 200, description: "Arrival history returned" })
  @RequirePermission("movement:read")
  async getArrivals(@Req() req: any, @Query() query: MovementHistoryQueryDto) {
    const { tenantId, schoolId, campusId } = req.workspace;
    return this.historyService.getArrivals(tenantId, schoolId, campusId, query);
  }

  @Get("departures")
  @ApiOperation({ summary: "Get student departure history" })
  @ApiResponse({ status: 200, description: "Departure history returned" })
  @RequirePermission("movement:read")
  async getDepartures(@Req() req: any, @Query() query: MovementHistoryQueryDto) {
    const { tenantId, schoolId, campusId } = req.workspace;
    return this.historyService.getDepartures(tenantId, schoolId, campusId, query);
  }
}
