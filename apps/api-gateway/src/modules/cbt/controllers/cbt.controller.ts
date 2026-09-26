import {
  Controller,
  Post,
  Body,
  Param,
  Put,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { CBTService } from "../services/cbt.service";
import {
  CreateCBTExamDto,
  CreateCBTQuestionDto,
  SubmitCBTAttemptDto,
} from "../dto/cbt.dto";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { kernel } from "@saas/core-platform";

@Controller(["api/v1/cbt", "v1/cbt"])
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class CBTController {
  constructor(private readonly cbtService: CBTService) {}

  private async resolveTeacherId(
    tenantId: string,
    schoolId: string,
    userId: string,
  ): Promise<string> {
    let staff = await kernel.db.staffProfile.findFirst({
      where: { tenantId, schoolId, userId },
    });
    if (!staff) {
      staff = await kernel.db.staffProfile.findFirst({
        where: { tenantId, schoolId, status: "ACTIVE" },
      });
    }
    if (!staff) {
      throw new BadRequestException("No staff profile found for this school context.");
    }
    return staff.id;
  }

  private async resolveStudentId(
    tenantId: string,
    userId: string,
    providedStudentId?: string,
  ): Promise<string> {
    if (providedStudentId) return providedStudentId;
    const student = await kernel.db.student.findFirst({
      where: { tenantId },
    });
    if (!student) {
      throw new BadRequestException("No student found for CBT operation.");
    }
    return student.id;
  }

  @Post()
  async createExam(@Req() req: any, @Body() dto: CreateCBTExamDto) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");
    const teacherId = await this.resolveTeacherId(tenantId, schoolId, req.user.sub);

    return this.cbtService.createExam(tenantId, schoolId, teacherId, dto);
  }

  @Post(":id/questions")
  async addQuestion(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: CreateCBTQuestionDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");

    return this.cbtService.addQuestion(tenantId, schoolId, id, dto);
  }

  @Put(":id/status")
  async updateStatus(
    @Req() req: any,
    @Param("id") id: string,
    @Body("status") status: "DRAFT" | "PUBLISHED" | "ACTIVE" | "CLOSED",
  ) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");

    return this.cbtService.updateExamStatus(tenantId, schoolId, id, status);
  }

  @Post(":id/attempts/start")
  async startAttempt(
    @Req() req: any,
    @Param("id") id: string,
    @Body("studentId") bodyStudentId?: string,
    @Query("studentId") queryStudentId?: string,
  ) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");
    const studentId = await this.resolveStudentId(
      tenantId,
      req.user.sub,
      bodyStudentId || queryStudentId,
    );

    return this.cbtService.startAttempt(tenantId, schoolId, studentId, id);
  }

  @Get(":id/attempts/questions")
  async getAttemptQuestions(
    @Req() req: any,
    @Param("id") id: string,
    @Query("studentId") queryStudentId?: string,
  ) {
    const { tenantId } = req.workspace;
    const studentId = await this.resolveStudentId(
      tenantId,
      req.user.sub,
      queryStudentId,
    );

    return this.cbtService.getAttemptQuestions(tenantId, studentId, id);
  }

  @Post(":id/attempts/submit")
  async submitAttempt(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: SubmitCBTAttemptDto & { studentId?: string },
    @Query("studentId") queryStudentId?: string,
  ) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");
    const studentId = await this.resolveStudentId(
      tenantId,
      req.user.sub,
      dto.studentId || queryStudentId,
    );

    return this.cbtService.submitAttempt(tenantId, schoolId, studentId, id, dto);
  }

  @Get("class/:classId")
  async getExamsForClass(
    @Req() req: any,
    @Param("classId") classId: string,
    @Query("armId") armId?: string,
  ) {
    const { tenantId } = req.workspace;
    return this.cbtService.getExamsForClass(tenantId, classId, armId);
  }
}
