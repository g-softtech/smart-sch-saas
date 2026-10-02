import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { PoliciesGuard } from "../../identity/security/policies.guard";
import { RequirePermission } from "../../identity/security/require-permission.decorator";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { LessonNotesService } from "../services/lesson-notes.service";
import {
  CreateLessonNoteDto,
  UpdateLessonNoteDto,
  RejectLessonNoteDto,
  QueryLessonNotesDto,
} from "../dto/lesson-notes.dto";

@ApiTags("Academic Lesson Planning & Notes")
@Controller(["api/v1/academics/lesson-notes", "v1/academics/lesson-notes"])
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class LessonNotesController {
  constructor(private readonly lessonNotesService: LessonNotesService) {}

  private extractContext(req: any) {
    const tenantId = req.workspace?.tenantId;
    const schoolId = req.workspace?.schoolId;
    const userId = req.user?.sub;
    const userRole = req.user?.role || "TEACHER";

    return { tenantId, schoolId, userId, userRole };
  }

  @Post()
  @RequirePermission("academics:manage_lesson_notes")
  @ApiOperation({ summary: "Create a new Lesson Note in DRAFT state" })
  async createLessonNote(@Req() req: any, @Body() dto: CreateLessonNoteDto) {
    const { tenantId, schoolId, userId, userRole } = this.extractContext(req);
    const data = await this.lessonNotesService.createLessonNote(
      tenantId,
      schoolId,
      userId,
      userRole,
      dto
    );
    return { success: true, data };
  }

  @Get()
  @RequirePermission("academics:read_lesson_notes")
  @ApiOperation({ summary: "Query Lesson Notes with multi-tenant filtering" })
  async getLessonNotes(@Req() req: any, @Query() query: QueryLessonNotesDto) {
    const { tenantId, schoolId } = this.extractContext(req);
    const data = await this.lessonNotesService.getLessonNotes(tenantId, schoolId, query);
    return { success: true, data };
  }

  @Get(":id")
  @RequirePermission("academics:read_lesson_notes")
  @ApiOperation({ summary: "Get Lesson Note details and workflow audit history by ID" })
  async getLessonNoteById(@Req() req: any, @Param("id") id: string) {
    const { tenantId, schoolId } = this.extractContext(req);
    const data = await this.lessonNotesService.getLessonNoteById(tenantId, schoolId, id);
    return { success: true, data };
  }

  @Put(":id")
  @RequirePermission("academics:manage_lesson_notes")
  @ApiOperation({ summary: "Update DRAFT or REJECTED Lesson Note content" })
  async updateLessonNote(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateLessonNoteDto
  ) {
    const { tenantId, schoolId, userId, userRole } = this.extractContext(req);
    const data = await this.lessonNotesService.updateLessonNote(
      tenantId,
      schoolId,
      userId,
      userRole,
      id,
      dto
    );
    return { success: true, data };
  }

  @Post(":id/submit")
  @RequirePermission("academics:manage_lesson_notes")
  @ApiOperation({ summary: "Submit Lesson Note for administrative review" })
  async submitLessonNote(@Req() req: any, @Param("id") id: string) {
    const { tenantId, schoolId, userId, userRole } = this.extractContext(req);
    const data = await this.lessonNotesService.submitLessonNote(
      tenantId,
      schoolId,
      userId,
      userRole,
      id
    );
    return { success: true, data };
  }

  @Post(":id/approve")
  @RequirePermission("academics:review_lesson_notes")
  @ApiOperation({ summary: "Approve submitted Lesson Note (Admin/HOD)" })
  async approveLessonNote(@Req() req: any, @Param("id") id: string) {
    const { tenantId, schoolId, userId, userRole } = this.extractContext(req);
    const data = await this.lessonNotesService.approveLessonNote(
      tenantId,
      schoolId,
      userId,
      userRole,
      id
    );
    return { success: true, data };
  }

  @Post(":id/reject")
  @RequirePermission("academics:review_lesson_notes")
  @ApiOperation({ summary: "Reject submitted Lesson Note with mandatory feedback" })
  async rejectLessonNote(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: RejectLessonNoteDto
  ) {
    const { tenantId, schoolId, userId, userRole } = this.extractContext(req);
    const data = await this.lessonNotesService.rejectLessonNote(
      tenantId,
      schoolId,
      userId,
      userRole,
      id,
      dto
    );
    return { success: true, data };
  }
}
