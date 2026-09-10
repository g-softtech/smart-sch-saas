import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AcademicsService } from '../services/academics.service';
import { JwtAuthGuard } from '../../identity/security/jwt-auth.guard';
import { 
  CreateCampusDto, CreateAcademicYearDto, CreateTermDto, 
  CreateDepartmentDto, CreateClassDto, CreateArmDto, 
  CreateSubjectGroupDto, CreateSubjectDto 
} from '../dto/academics.dto';

@Controller('api/v1/academics')
@UseGuards(JwtAuthGuard)
export class AcademicsController {
  constructor(private readonly academicsService: AcademicsService) {}

  @Post('campuses')
  async createCampus(@Body() dto: CreateCampusDto) {
    return this.academicsService.createCampus(dto);
  }

  @Post('academic-years')
  async createAcademicYear(@Body() dto: CreateAcademicYearDto) {
    return this.academicsService.createAcademicYear(dto);
  }

  @Post('terms')
  async createTerm(@Body() dto: CreateTermDto) {
    return this.academicsService.createTerm(dto);
  }

  @Post('departments')
  async createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.academicsService.createDepartment(dto);
  }

  @Post('classes')
  async createClass(@Body() dto: CreateClassDto) {
    return this.academicsService.createClass(dto);
  }

  @Post('arms')
  async createArm(@Body() dto: CreateArmDto) {
    return this.academicsService.createArm(dto);
  }

  @Post('subject-groups')
  async createSubjectGroup(@Body() dto: CreateSubjectGroupDto) {
    return this.academicsService.createSubjectGroup(dto);
  }

  @Post('subjects')
  async createSubject(@Body() dto: CreateSubjectDto) {
    return this.academicsService.createSubject(dto);
  }
}
