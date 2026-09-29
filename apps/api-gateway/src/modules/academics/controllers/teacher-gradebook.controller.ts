import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { PoliciesGuard } from "../../identity/security/policies.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { RequirePermission } from "../../identity/security/require-permission.decorator";
import { TeacherGradebookService } from "../services/teacher-gradebook.service";
import {
  GetTeacherScopeQueryDto,
  GetGradebookQueryDto,
  SaveGradebookDraftDto,
  SubmitGradebookDto,
} from "../dto/teacher-gradebook.dto";

@Controller("api/v1/academics/teacher-portal/gradebooks")
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class TeacherGradebookController {
  constructor(private readonly gradebookService: TeacherGradebookService) {}

  /**
   * Fetches the assigned gradebook scope for the calling teacher in an academic year and term.
   */
  @Get("scope")
  @RequirePermission("academics:read_assignments")
  async getTeacherScope(
    @Req() req: any,
    @Query() query: GetTeacherScopeQueryDto,
  ) {
    const tenantId = req.workspace.tenantId;
    const schoolId = req.workspace.schoolId;
    const userId = req.user.sub;

    const scopes = await this.gradebookService.getTeacherScope(
      tenantId,
      schoolId,
      userId,
      query,
    );
    return { success: true, data: scopes };
  }

  /**
   * Fetches gradebook details, student roster, existing assessment scores, and submission workflow status.
   */
  @Get()
  @RequirePermission("academics:read_assignments")
  async getGradebook(
    @Req() req: any,
    @Query() query: GetGradebookQueryDto,
  ) {
    const tenantId = req.workspace.tenantId;
    const schoolId = req.workspace.schoolId;
    const userId = req.user.sub;

    const gradebook = await this.gradebookService.getGradebook(
      tenantId,
      schoolId,
      userId,
      query,
    );
    return { success: true, data: gradebook };
  }

  /**
   * Saves gradebook scores as DRAFT transactionally.
   */
  @Post("draft")
  @RequirePermission("academics:read_assignments")
  async saveGradebookDraft(
    @Req() req: any,
    @Body() dto: SaveGradebookDraftDto,
  ) {
    const tenantId = req.workspace.tenantId;
    const schoolId = req.workspace.schoolId;
    const userId = req.user.sub;

    const result = await this.gradebookService.saveGradebookDraft(
      tenantId,
      schoolId,
      userId,
      dto,
    );
    return { success: true, data: result };
  }

  /**
   * Submits a gradebook for administrative review.
   * STRICT SAFEGUARD: Only primary teachers (isPrimary = true) can submit.
   */
  @Post("submit")
  @RequirePermission("academics:read_assignments")
  async submitGradebook(
    @Req() req: any,
    @Body() dto: SubmitGradebookDto,
  ) {
    const tenantId = req.workspace.tenantId;
    const schoolId = req.workspace.schoolId;
    const userId = req.user.sub;

    const result = await this.gradebookService.submitGradebook(
      tenantId,
      schoolId,
      userId,
      dto,
    );
    return { success: true, data: result };
  }
}
