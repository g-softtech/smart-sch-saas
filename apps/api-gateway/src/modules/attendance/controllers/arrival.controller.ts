import { Controller, Post, Body, Req, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ArrivalService } from "../services/arrival.service";
import { ScanCredentialDto } from "../../id-cards/dto/id-cards.dto";

@ApiTags("Attendance Arrival")
@Controller("api/v1/attendance/arrival")
export class ArrivalController {
  constructor(private readonly arrivalService: ArrivalService) {}

  @Post()
  @ApiOperation({ summary: "Record student arrival via QR scan" })
  @ApiResponse({ status: 200, description: "Arrival recorded" })
  async recordArrival(@Req() req: any, @Body() dto: ScanCredentialDto) {
    const { tenantId, schoolId } = req.workspace;
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
      operatorId,
      normalizedToken,
      dto.source
    );
  }

  @Post("manual")
  @ApiOperation({ summary: "Record student arrival manually (Fallback)" })
  @ApiResponse({ status: 200, description: "Arrival recorded manually" })
  async recordManualArrival(@Req() req: any, @Body() dto: { studentId: string; operationId: string; occurredAt?: string }) {
    const { tenantId, schoolId } = req.workspace;
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
      operatorId,
      dto.studentId,
      dto.operationId,
      dto.occurredAt
    );
  }
}
