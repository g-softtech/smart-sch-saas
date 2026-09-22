import { Controller, Post, Body, Req, BadRequestException } from "@nestjs/common";
import { DepartureService } from "../services/departure.service";

interface RecordDepartureDto {
  studentToken: string;
  guardianToken: string;
  source: "EXTERNAL" | "CAMERA";
}

@Controller("api/v1/movement/departure")
export class DepartureController {
  constructor(private readonly departureService: DepartureService) {}

  @Post()
  async recordDeparture(@Req() req: any, @Body() dto: RecordDepartureDto) {
    const { tenantId, schoolId } = req.workspace;
    const operatorId = req.user.sub;

    if (!schoolId) {
      throw new BadRequestException("School context is required");
    }

    const studentToken = dto.studentToken?.trim();
    const guardianToken = dto.guardianToken?.trim();

    if (!studentToken || !guardianToken) {
      throw new BadRequestException("Both student and guardian tokens are required");
    }

    const operationalDate = new Date().toISOString().split("T")[0];

    return this.departureService.processDeparture(
      tenantId,
      schoolId,
      operatorId,
      studentToken,
      guardianToken,
      dto.source,
      operationalDate
    );
  }
}
