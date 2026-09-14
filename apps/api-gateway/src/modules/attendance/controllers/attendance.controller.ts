import { Controller, Post, Get, Patch, Body, Param, UseGuards, UseInterceptors, Req, BadRequestException, HttpCode } from '@nestjs/common';
import { AttendanceService } from '../services/attendance.service';
import { BulkCreateAttendanceRegisterDto } from '../dto/attendance.dto';
import { JwtAuthGuard } from '../../identity/security/jwt-auth.guard';
import { WorkspaceContextInterceptor } from '../../identity/interceptors/workspace-context.interceptor';
import { randomUUID } from 'crypto';

@Controller('v1/attendance')
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('registers/bulk')
  async bulkCreateRegister(@Req() req: any, @Body() dto: BulkCreateAttendanceRegisterDto) {
    const { tenantId, schoolId } = req.workspace;
    const userId = req.user.sub;
    if (!schoolId) throw new BadRequestException('School context is required');
    return this.attendanceService.bulkCreateRegister(tenantId, schoolId, userId, dto);
  }

  @Get('registers')
  async getRegisters(@Req() req: any) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException('School context is required');
    return this.attendanceService.getRegisters(tenantId, schoolId);
  }

  @Get('registers/:id')
  async getRegister(@Req() req: any, @Param('id') id: string) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException('School context is required');
    return this.attendanceService.getRegisterById(tenantId, schoolId, id);
  }

  @Patch('registers/:id/finalize')
  @HttpCode(200)
  async finalizeRegister(@Req() req: any, @Param('id') id: string) {
    const { tenantId, schoolId } = req.workspace;
    const userId = req.user.sub;
    const correlationId = randomUUID(); // or get from headers
    if (!schoolId) throw new BadRequestException('School context is required');
    return this.attendanceService.finalizeRegister(tenantId, schoolId, id, userId, correlationId);
  }

  @Get('students/:studentId')
  async getStudentAttendance(@Req() req: any, @Param('studentId') studentId: string) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException('School context is required');
    return this.attendanceService.getStudentAttendance(tenantId, schoolId, studentId);
  }
}
