import { Controller, Post, Body, Param, Put, Get, UseGuards, Req } from "@nestjs/common";
import { AssignmentsService } from "../services/assignments.service";
import { CreateAssignmentDto, SubmitAssignmentDto, GradeSubmissionDto } from "../dto/assignments.dto";
// Assuming auth guards exist in core-platform or similar structure in this repo
// We will use standard decorators where tenantId and schoolId are expected from the request/auth

@Controller("assignments")
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  async createAssignment(@Req() req: any, @Body() dto: CreateAssignmentDto) {
    const tenantId = req.user?.tenantId || "default_tenant";
    const schoolId = req.user?.schoolId || "default_school";
    const teacherId = req.user?.staffId || "mock_teacher_id"; // Mocking for MVP if auth isn't fully integrated
    
    return this.assignmentsService.createAssignment(tenantId, schoolId, teacherId, dto);
  }

  @Put(":id/publish")
  async publishAssignment(@Req() req: any, @Param("id") id: string) {
    const tenantId = req.user?.tenantId || "default_tenant";
    const schoolId = req.user?.schoolId || "default_school";

    return this.assignmentsService.publishAssignment(tenantId, schoolId, id);
  }

  @Put(":id/close")
  async closeAssignment(@Req() req: any, @Param("id") id: string) {
    const tenantId = req.user?.tenantId || "default_tenant";
    const schoolId = req.user?.schoolId || "default_school";

    return this.assignmentsService.closeAssignment(tenantId, schoolId, id);
  }

  @Get("class/:classId")
  async getAssignmentsForClass(@Req() req: any, @Param("classId") classId: string) {
    const tenantId = req.user?.tenantId || "default_tenant";
    return this.assignmentsService.getAssignmentsForClass(tenantId, classId);
  }

  @Post(":id/submit")
  async submitAssignment(@Req() req: any, @Param("id") id: string, @Body() dto: SubmitAssignmentDto) {
    const tenantId = req.user?.tenantId || "default_tenant";
    const schoolId = req.user?.schoolId || "default_school";
    const studentId = req.user?.studentId || "mock_student_id"; 

    return this.assignmentsService.submitAssignment(tenantId, schoolId, studentId, id, dto);
  }

  @Get(":id/submissions")
  async getSubmissions(@Req() req: any, @Param("id") id: string) {
    const tenantId = req.user?.tenantId || "default_tenant";
    return this.assignmentsService.getSubmissions(tenantId, id);
  }

  @Put(":id/submissions/:studentId/grade")
  async gradeSubmission(
    @Req() req: any, 
    @Param("id") id: string, 
    @Param("studentId") studentId: string, 
    @Body() dto: GradeSubmissionDto
  ) {
    const tenantId = req.user?.tenantId || "default_tenant";
    const schoolId = req.user?.schoolId || "default_school";
    const teacherId = req.user?.staffId || "mock_teacher_id";

    return this.assignmentsService.gradeSubmission(tenantId, schoolId, teacherId, id, studentId, dto);
  }
}
