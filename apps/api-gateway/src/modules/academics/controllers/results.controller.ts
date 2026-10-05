import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Put,
  Query,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UseFilters,
} from "@nestjs/common";
import { ResultsService } from "../services/results.service";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { PoliciesGuard } from "../../identity/security/policies.guard";
import { RequirePermission } from "../../identity/security/require-permission.decorator";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { AcademicsPrismaExceptionFilter } from "../filters/prisma-exception.filter";
import { CreateGradingScaleDto, CreateGradeBoundaryDto, RecordScoreDto, SetAcademicGradingConfigDto, CreateAssessmentComponentDto, CreateAssessmentTypeDto } from "../dto/results.dto";

@Controller("api/v1/academics/results")
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UseInterceptors(WorkspaceContextInterceptor)
@UseFilters(AcademicsPrismaExceptionFilter)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get("assessment-types")
  @RequirePermission("academics:read_gradebook")
  async listAssessmentTypes(@Req() req: Request & { workspace: any }) {
    const types = await this.resultsService.listAssessmentTypes(
      req.workspace.tenantId,
      req.workspace.schoolId,
    );
    return { success: true, data: types };
  }

  @Post("assessment-types")
  @RequirePermission("academics:manage_assignments")
  async createAssessmentType(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateAssessmentTypeDto,
  ) {
    const type = await this.resultsService.createAssessmentType(
      req.workspace.tenantId,
      req.workspace.schoolId,
      dto,
    );
    return { success: true, data: type };
  }

  @Put("assessment-types/:id/toggle-active")
  @RequirePermission("academics:manage_assignments")
  async toggleAssessmentTypeActive(
    @Req() req: Request & { workspace: any },
    @Param("id") id: string,
  ) {
    const type = await this.resultsService.toggleAssessmentTypeActive(
      req.workspace.tenantId,
      req.workspace.schoolId,
      id,
    );
    return { success: true, data: type };
  }

  @Get("grading-config")
  @RequirePermission("academics:read_gradebook")
  async getGradingConfig(
    @Req() req: Request & { workspace: any },
    @Query("academicYearId") academicYearId: string,
    @Query("termId") termId: string,
  ) {
    const config = await this.resultsService.getAcademicGradingConfig(
      req.workspace.tenantId,
      req.workspace.schoolId,
      academicYearId,
      termId,
    );
    return { success: true, data: config };
  }

  @Post("grading-config")
  @RequirePermission("academics:manage_assignments")
  async setGradingConfig(
    @Req() req: Request & { workspace: any },
    @Body() dto: SetAcademicGradingConfigDto,
  ) {
    const config = await this.resultsService.setAcademicGradingConfig(
      req.workspace.tenantId,
      req.workspace.schoolId,
      dto.academicYearId,
      dto.termId,
      dto.gradingScaleId,
    );
    return { success: true, data: config };
  }

  @Get("components")
  @RequirePermission("academics:read_gradebook")
  async listAssessmentComponents(
    @Req() req: Request & { workspace: any },
    @Query("academicYearId") academicYearId: string,
    @Query("termId") termId: string,
    @Query("classId") classId?: string,
    @Query("subjectId") subjectId?: string,
  ) {
    const components = await this.resultsService.listAssessmentComponents(
      req.workspace.tenantId,
      req.workspace.schoolId,
      academicYearId,
      termId,
      classId,
      subjectId,
    );
    return { success: true, data: components };
  }

  @Post("components")
  @RequirePermission("academics:manage_assignments")
  async createAssessmentComponent(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateAssessmentComponentDto,
  ) {
    const comp = await this.resultsService.createAssessmentComponent(
      req.workspace.tenantId,
      req.workspace.schoolId,
      dto,
    );
    return { success: true, data: comp };
  }

  @Delete("components/:id")
  @RequirePermission("academics:manage_assignments")
  async deleteAssessmentComponent(
    @Req() req: Request & { workspace: any },
    @Param("id") id: string,
  ) {
    await this.resultsService.deleteAssessmentComponent(
      req.workspace.tenantId,
      req.workspace.schoolId,
      id,
    );
    return { success: true };
  }

  @Post("scales")
  @RequirePermission("academics:manage_assignments")
  async createGradingScale(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateGradingScaleDto,
  ) {
    return this.resultsService.createGradingScale(req.workspace.tenantId, req.workspace.schoolId, dto);
  }

  @Post("boundaries")
  @RequirePermission("academics:manage_assignments")
  async addGradeBoundary(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateGradeBoundaryDto,
  ) {
    return this.resultsService.addGradeBoundary(req.workspace.tenantId, req.workspace.schoolId, dto);
  }

  @Get("scales")
  @RequirePermission("academics:read_gradebook")
  async listGradingScales(@Req() req: Request & { workspace: any }) {
    const { tenantId, schoolId } = req.workspace;
    const items = await this.resultsService.listGradingScales(tenantId, schoolId);
    return { success: true, data: items };
  }

  @Post("record-score")
  @RequirePermission("academics:enter_scores")
  async recordScore(
    @Req() req: Request & { workspace: any },
    @Body() dto: RecordScoreDto,
  ) {
    return this.resultsService.recordScore(req.workspace.tenantId, req.workspace.schoolId, dto);
  }

  @Patch(":resultId/scale/:scaleId")
  @RequirePermission("academics:manage_assignments")
  async attachGradingScale(
    @Req() req: Request & { workspace: any },
    @Param("resultId") resultId: string,
    @Param("scaleId") scaleId: string,
  ) {
    return this.resultsService.attachGradingScale(req.workspace.tenantId, req.workspace.schoolId, resultId, scaleId);
  }

  @Patch("publish/term/:termId/class/:classId")
  @RequirePermission("academics:publish_results")
  async publishResults(
    @Req() req: Request & { workspace: any },
    @Param("termId") termId: string,
    @Param("classId") classId: string,
  ) {
    return this.resultsService.publishResults(req.workspace.tenantId, req.workspace.schoolId, termId, classId);
  }
}
