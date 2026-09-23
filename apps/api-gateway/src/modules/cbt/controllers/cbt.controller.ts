import { Controller, Post, Body, Param, Put, Get, UseGuards, Req } from "@nestjs/common";
import { CBTService } from "../services/cbt.service";
import { CreateCBTExamDto, CreateCBTQuestionDto, SubmitCBTAttemptDto } from "../dto/cbt.dto";

@Controller("cbt")
export class CBTController {
  constructor(private readonly cbtService: CBTService) {}

  @Post()
  async createExam(@Req() req: any, @Body() dto: CreateCBTExamDto) {
    const tenantId = req.user?.tenantId || "default_tenant";
    const schoolId = req.user?.schoolId || "default_school";
    const teacherId = req.user?.staffId || "mock_teacher_id";
    
    return this.cbtService.createExam(tenantId, schoolId, teacherId, dto);
  }

  @Post(":id/questions")
  async addQuestion(@Req() req: any, @Param("id") id: string, @Body() dto: CreateCBTQuestionDto) {
    const tenantId = req.user?.tenantId || "default_tenant";
    const schoolId = req.user?.schoolId || "default_school";

    return this.cbtService.addQuestion(tenantId, schoolId, id, dto);
  }

  @Put(":id/status")
  async updateStatus(@Req() req: any, @Param("id") id: string, @Body("status") status: "DRAFT" | "PUBLISHED" | "ACTIVE" | "CLOSED") {
    const tenantId = req.user?.tenantId || "default_tenant";
    const schoolId = req.user?.schoolId || "default_school";

    return this.cbtService.updateExamStatus(tenantId, schoolId, id, status);
  }

  @Post(":id/attempts/start")
  async startAttempt(@Req() req: any, @Param("id") id: string) {
    const tenantId = req.user?.tenantId || "default_tenant";
    const schoolId = req.user?.schoolId || "default_school";
    const studentId = req.user?.studentId || "mock_student_id"; 

    return this.cbtService.startAttempt(tenantId, schoolId, studentId, id);
  }

  @Get(":id/attempts/questions")
  async getAttemptQuestions(@Req() req: any, @Param("id") id: string) {
    const tenantId = req.user?.tenantId || "default_tenant";
    const studentId = req.user?.studentId || "mock_student_id";

    return this.cbtService.getAttemptQuestions(tenantId, studentId, id);
  }

  @Post(":id/attempts/submit")
  async submitAttempt(@Req() req: any, @Param("id") id: string, @Body() dto: SubmitCBTAttemptDto) {
    const tenantId = req.user?.tenantId || "default_tenant";
    const schoolId = req.user?.schoolId || "default_school";
    const studentId = req.user?.studentId || "mock_student_id";

    return this.cbtService.submitAttempt(tenantId, schoolId, studentId, id, dto);
  }

  @Get("class/:classId")
  async getExamsForClass(@Req() req: any, @Param("classId") classId: string) {
    const tenantId = req.user?.tenantId || "default_tenant";
    return this.cbtService.getExamsForClass(tenantId, classId);
  }
}
