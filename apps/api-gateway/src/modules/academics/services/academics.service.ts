import { Injectable, BadRequestException } from '@nestjs/common';
import { AcademicsRepository } from '../repositories/academics.repository';

@Injectable()
export class AcademicsService {
  constructor(private readonly repo: AcademicsRepository) {}

  async createCampus(data: { schoolId: string; name: string }) {
    const school = await this.repo.findSchool(data.schoolId);
    if (!school) {
      throw new BadRequestException('School not found or belongs to another tenant');
    }
    return this.repo.createCampus(data);
  }

  async createAcademicYear(tenantId: string, data: { schoolId: string; name: string }) {
    const school = await this.repo.findSchool(data.schoolId);
    if (!school || school.tenantId !== tenantId) {
      throw new BadRequestException('School not found or belongs to another tenant');
    }
    return this.repo.createAcademicYear({ ...data, tenantId });
  }

  async createTerm(tenantId: string, data: { academicYearId: string; name: string }) {
    const academicYear = await this.repo.findAcademicYear(data.academicYearId);
    if (!academicYear || academicYear.tenantId !== tenantId) {
      throw new BadRequestException('Academic Year not found or belongs to another tenant');
    }
    return this.repo.createTerm({ ...data, tenantId });
  }

  async createDepartment(data: { schoolId: string; name: string }) {
    const school = await this.repo.findSchool(data.schoolId);
    if (!school) {
      throw new BadRequestException('School not found or belongs to another tenant');
    }
    return this.repo.createDepartment(data);
  }

  async createClass(tenantId: string, data: { schoolId: string; name: string }) {
    const school = await this.repo.findSchool(data.schoolId);
    if (!school || school.tenantId !== tenantId) {
      throw new BadRequestException('School not found or belongs to another tenant');
    }
    return this.repo.createClass({ ...data, tenantId });
  }

  async createArm(data: { classId: string; campusId: string; name: string }) {
    const classEntity = await this.repo.findClass(data.classId);
    if (!classEntity) {
      throw new BadRequestException('Class not found or belongs to another tenant');
    }

    const campusEntity = await this.repo.findCampus(data.campusId);
    if (!campusEntity) {
      throw new BadRequestException('Campus not found or belongs to another tenant');
    }

    if (classEntity.schoolId !== campusEntity.schoolId) {
      throw new BadRequestException('Class and Campus must belong to the same school');
    }

    return this.repo.createArm(data);
  }

  async createSubjectGroup(data: { schoolId: string; name: string }) {
    const school = await this.repo.findSchool(data.schoolId);
    if (!school) {
      throw new BadRequestException('School not found or belongs to another tenant');
    }
    return this.repo.createSubjectGroup(data);
  }

  async createSubject(data: { schoolId: string; name: string; subjectGroupId?: string }) {
    const school = await this.repo.findSchool(data.schoolId);
    if (!school) {
      throw new BadRequestException('School not found or belongs to another tenant');
    }

    if (data.subjectGroupId) {
      const subjectGroup = await this.repo.findSubjectGroup(data.subjectGroupId);
      if (!subjectGroup) {
        throw new BadRequestException('Subject Group not found or belongs to another tenant');
      }
      
      if (subjectGroup.schoolId !== data.schoolId) {
        throw new BadRequestException('Subject Group must belong to the same school as the Subject');
      }
    }

    return this.repo.createSubject(data);
  }

  async listAcademicYears(tenantId: string, schoolId: string, skip: number, take: number) {
    return this.repo.listAcademicYears(tenantId, schoolId, skip, take);
  }

  async listTerms(tenantId: string, schoolId: string, skip: number, take: number) {
    return this.repo.listTerms(tenantId, schoolId, skip, take);
  }

  async listClasses(tenantId: string, schoolId: string, skip: number, take: number) {
    return this.repo.listClasses(tenantId, schoolId, skip, take);
  }

  async listArms(tenantId: string, schoolId: string, skip: number, take: number) {
    return this.repo.listArms(tenantId, schoolId, skip, take);
  }

  async listSubjects(tenantId: string, schoolId: string, skip: number, take: number) {
    return this.repo.listSubjects(tenantId, schoolId, skip, take);
  }
}
