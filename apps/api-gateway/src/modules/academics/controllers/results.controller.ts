import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UseFilters,
} from "@nestjs/common";
import { ResultsService } from "../services/results.service";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { AcademicsPrismaExceptionFilter } from "../filters/prisma-exception.filter";
import { CreateGradingScaleDto, CreateGradeBoundaryDto, RecordScoreDto } from "../dto/results.dto";

@Controller("api/v1/academics/results")
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
@UseFilters(AcademicsPrismaExceptionFilter)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post("scales")
  async createGradingScale(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateGradingScaleDto,
  ) {
    return this.resultsService.createGradingScale(req.workspace.tenantId, req.workspace.schoolId, dto);
  }

  @Post("boundaries")
  async addGradeBoundary(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateGradeBoundaryDto,
  ) {
    return this.resultsService.addGradeBoundary(req.workspace.tenantId, req.workspace.schoolId, dto);
  }

  @Get("scales")
  async listGradingScales(@Req() req: Request & { workspace: any }) {
    const { tenantId, schoolId } = req.workspace;
    const items = await this.resultsService.listGradingScales(tenantId, schoolId);
    return { success: true, data: items };
  }

  @Post("record-score")
  async recordScore(
    @Req() req: Request & { workspace: any },
    @Body() dto: RecordScoreDto,
  ) {
    return this.resultsService.recordScore(req.workspace.tenantId, req.workspace.schoolId, dto);
  }

  @Patch(":resultId/scale/:scaleId")
  async attachGradingScale(
    @Req() req: Request & { workspace: any },
    @Param("resultId") resultId: string,
    @Param("scaleId") scaleId: string,
  ) {
    return this.resultsService.attachGradingScale(req.workspace.tenantId, req.workspace.schoolId, resultId, scaleId);
  }

  @Patch("publish/term/:termId/class/:classId")
  async publishResults(
    @Req() req: Request & { workspace: any },
    @Param("termId") termId: string,
    @Param("classId") classId: string,
  ) {
    // Note: Specific permission required to publish results
    // Example: @RequirePermission("academics:publish_results") could be added here
    return this.resultsService.publishResults(req.workspace.tenantId, req.workspace.schoolId, termId, classId);
  }
}
