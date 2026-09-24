import { Controller, Post, Body, Req, BadRequestException, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from "@nestjs/swagger";
import { ArrivalService } from "../services/arrival.service";
import { ScanCredentialDto } from "../../id-cards/dto/id-cards.dto";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";

@ApiTags("Attendance Arrival")
@ApiBearerAuth()
@ApiHeader({ name: "x-tenant-id", required: true })
@ApiHeader({ name: "x-school-id", required: true })
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
@Controller("api/v1/attendance/arrival")
export class ArrivalController {
  constructor(private readonly arrivalService: ArrivalService) {}

  @Post()
  @ApiOperation({ summary: "Record student arrival via QR scan" })
  @ApiResponse({ status: 200, description: "Arrival recorded" })
  async recordArrival(@Req() req: any, @Body() dto: ScanCredentialDto) {
    const { tenantId, schoolId, campusId } = req.workspace;
    const operatorId = req.user.sub;
    
    if (!schoolId) {
      throw new BadRequestException("School context is required");
    }

    const normalizedToken = dto.token.trim();
    if (normalizedToken.length === 0) {
      throw new BadRequestException("Credential could not be verified");
    }

    return this.arrivalService.recordArrival(
      tenantId,
      schoolId,
      campusId,
      operatorId,
      normalizedToken,
      dto.source
    );
  }

  @Post("manual")
  @ApiOperation({ summary: "Record student arrival manually (Fallback)" })
  @ApiResponse({ status: 200, description: "Arrival recorded manually" })
  async recordManualArrival(@Req() req: any, @Body() dto: { studentId: string; operationId: string; occurredAt?: string }) {
    const { tenantId, schoolId, campusId } = req.workspace;
    const operatorId = req.user.sub;
    
    if (!schoolId) {
      throw new BadRequestException("School context is required");
    }

    if (!dto.studentId) {
      throw new BadRequestException("studentId is required for manual arrival");
    }

    if (!dto.operationId) {
      throw new BadRequestException("operationId is required for manual arrival");
    }

    return this.arrivalService.recordManualArrival(
      tenantId,
      schoolId,
      campusId,
      operatorId,
      dto.studentId,
      dto.operationId,
      dto.occurredAt
    );
  }
}
