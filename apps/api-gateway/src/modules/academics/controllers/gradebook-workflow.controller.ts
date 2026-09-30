import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { PoliciesGuard } from "../../identity/security/policies.guard";
import { RequirePermission } from "../../identity/security/require-permission.decorator";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { GradebookWorkflowService } from "../services/gradebook-workflow.service";
import {
  ListSubmissionsDto,
  ApproveGradebookDto,
  RejectGradebookDto,
  PublishGradebookDto,
  ReopenGradebookDto,
} from "../dto/gradebook-workflow.dto";

@Controller(["api/v1/academics/gradebook/workflow", "v1/academics/gradebook/workflow"])
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class GradebookWorkflowController {
  constructor(
    private readonly workflowService: GradebookWorkflowService,
  ) {}

  @Get("submissions")
  @RequirePermission("academics:review_gradebook")
  async listSubmissions(@Req() req: any, @Query() query: ListSubmissionsDto) {
    const tenantId = req.workspace?.tenantId;
    const schoolId = req.workspace?.schoolId;
    return this.workflowService.listSubmissions(tenantId, schoolId, query);
  }

  @Get("submissions/:id")
  @RequirePermission("academics:review_gradebook")
  async getSubmissionDetails(@Req() req: any, @Param("id") id: string) {
    const tenantId = req.workspace?.tenantId;
    const schoolId = req.workspace?.schoolId;
    return this.workflowService.getSubmissionDetails(tenantId, schoolId, id);
  }

  @Post("approve")
  @RequirePermission("academics:approve_gradebook")
  async approveGradebook(@Req() req: any, @Body() dto: ApproveGradebookDto) {
    const tenantId = req.workspace?.tenantId;
    const schoolId = req.workspace?.schoolId;
    const actorUserId = req.user?.sub;
    const actorRole = req.user?.role || "UNKNOWN";
    return this.workflowService.approveGradebook(
      tenantId,
      schoolId,
      dto,
      actorUserId,
      actorRole,
    );
  }

  @Post("reject")
  @RequirePermission("academics:reject_gradebook")
  async rejectGradebook(@Req() req: any, @Body() dto: RejectGradebookDto) {
    const tenantId = req.workspace?.tenantId;
    const schoolId = req.workspace?.schoolId;
    const actorUserId = req.user?.sub;
    const actorRole = req.user?.role || "UNKNOWN";
    return this.workflowService.rejectGradebook(
      tenantId,
      schoolId,
      dto,
      actorUserId,
      actorRole,
    );
  }

  @Post("publish")
  @RequirePermission("academics:publish_results")
  async publishGradebook(@Req() req: any, @Body() dto: PublishGradebookDto) {
    const tenantId = req.workspace?.tenantId;
    const schoolId = req.workspace?.schoolId;
    const actorUserId = req.user?.sub;
    const actorRole = req.user?.role || "UNKNOWN";
    return this.workflowService.publishGradebook(
      tenantId,
      schoolId,
      dto,
      actorUserId,
      actorRole,
    );
  }

  @Post("reopen")
  @RequirePermission("academics:reopen_results")
  async reopenGradebook(@Req() req: any, @Body() dto: ReopenGradebookDto) {
    const tenantId = req.workspace?.tenantId;
    const schoolId = req.workspace?.schoolId;
    const actorUserId = req.user?.sub;
    const actorRole = req.user?.role || "UNKNOWN";
    return this.workflowService.reopenGradebook(
      tenantId,
      schoolId,
      dto,
      actorUserId,
      actorRole,
    );
  }
}
