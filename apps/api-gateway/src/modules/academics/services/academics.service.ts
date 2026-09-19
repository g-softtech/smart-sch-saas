import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { AcademicsRepository } from '../repositories/academics.repository';

@Injectable()
export class AcademicsService {
  constructor(private readonly repo: AcademicsRepository) {}

  async createCampus(tenantId: string, data: { schoolId: string; name: string }) {
    const school = await this.repo.findSchool(data.schoolId);
    if (!school || school.tenantId !== tenantId) {
      throw new BadRequestException('School not found or belongs to another tenant');
    }
    return this.repo.createCampus({ ...data, tenantId });
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

  async createDepartment(tenantId: string, data: { schoolId: string; name: string }) {
    const school = await this.repo.findSchool(data.schoolId);
    if (!school || school.tenantId !== tenantId) {
      throw new BadRequestException('School not found or belongs to another tenant');
    }
    return this.repo.createDepartment({ ...data, tenantId });
  }

  async createClass(tenantId: string, data: { schoolId: string; name: string }) {
    const school = await this.repo.findSchool(data.schoolId);
    if (!school || school.tenantId !== tenantId) {
      throw new BadRequestException('School not found or belongs to another tenant');
    }
    return this.repo.createClass({ ...data, tenantId });
  }

  async createArm(tenantId: string, data: { classId: string; campusId: string; name: string }) {
    const classEntity = await this.repo.findClass(data.classId);
    if (!classEntity || classEntity.tenantId !== tenantId) {
      throw new BadRequestException('Class not found or belongs to another tenant');
    }

    const campusEntity = await this.repo.findCampus(data.campusId);
    if (!campusEntity || campusEntity.tenantId !== tenantId) {
      throw new BadRequestException('Campus not found or belongs to another tenant');
    }

    if (classEntity.schoolId !== campusEntity.schoolId) {
      throw new BadRequestException('Class and Campus must belong to the same school');
    }

    return this.repo.createArm({ ...data, tenantId });
  }

  async createSubjectGroup(tenantId: string, data: { schoolId: string; name: string }) {
    const school = await this.repo.findSchool(data.schoolId);
    if (!school || school.tenantId !== tenantId) {
      throw new BadRequestException('School not found or belongs to another tenant');
    }
    return this.repo.createSubjectGroup({ ...data, tenantId });
  }

  async createSubject(tenantId: string, data: { schoolId: string; name: string; subjectGroupId?: string }) {
    const school = await this.repo.findSchool(data.schoolId);
    if (!school || school.tenantId !== tenantId) {
      throw new BadRequestException('School not found or belongs to another tenant');
    }

    if (data.subjectGroupId) {
      const subjectGroup = await this.repo.findSubjectGroup(data.subjectGroupId);
      if (!subjectGroup || subjectGroup.tenantId !== tenantId) {
        throw new BadRequestException('Subject Group not found or belongs to another tenant');
      }
      
      if (subjectGroup.schoolId !== data.schoolId) {
        throw new BadRequestException('Subject Group must belong to the same school as the Subject');
      }
    }

    return this.repo.createSubject({ ...data, tenantId });
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

  async listArms(tenantId: string, schoolId: string, skip: number, take: number, campusId?: string) {
    return this.repo.listArms(tenantId, schoolId, skip, take, campusId);
  }

  async listSubjects(tenantId: string, schoolId: string, skip: number, take: number) {
    return this.repo.listSubjects(tenantId, schoolId, skip, take);
  }

  async listCampuses(tenantId: string, schoolId: string, skip: number, take: number) {
    return this.repo.listCampuses(tenantId, schoolId, skip, take);
  }

  async listDepartments(tenantId: string, schoolId: string, skip: number, take: number) {
    return this.repo.listDepartments(tenantId, schoolId, skip, take);
  }

  async listSubjectGroups(tenantId: string, schoolId: string, skip: number, take: number) {
    return this.repo.listSubjectGroups(tenantId, schoolId, skip, take);
  }

  async updateAcademicYear(tenantId: string, id: string, data: { name: string }) {
    const existing = await this.repo.findAcademicYear(id);
    if (!existing) throw new NotFoundException('Academic Year not found');
    if (existing.tenantId !== tenantId) throw new BadRequestException('Academic Year belongs to another tenant');
    return this.repo.updateAcademicYear(id, data);
  }

  async deleteAcademicYear(tenantId: string, id: string) {
    const existing = await this.repo.findAcademicYear(id);
    if (!existing) throw new NotFoundException('Academic Year not found');
    if (existing.tenantId !== tenantId) throw new BadRequestException('Academic Year belongs to another tenant');
    return this.repo.deleteAcademicYear(id);
  }

  async updateClass(tenantId: string, id: string, data: { name: string }) {
    const existing = await this.repo.findClass(id);
    if (!existing) throw new NotFoundException('Class not found');
    if (existing.tenantId !== tenantId) throw new BadRequestException('Class belongs to another tenant');
    return this.repo.updateClass(id, data);
  }

  async deleteClass(tenantId: string, id: string) {
    const existing = await this.repo.findClass(id);
    if (!existing) throw new NotFoundException('Class not found');
    if (existing.tenantId !== tenantId) throw new BadRequestException('Class belongs to another tenant');
    
    const armCount = await this.repo.countArmsByClass(id);
    if (armCount > 0) {
      throw new ConflictException(
        `Cannot delete this class because it has ${armCount} arm(s) linked to it. Remove or reassign the arms first.`
      );
    }
    
    return this.repo.deleteClass(id);
  }

  async updateArm(tenantId: string, id: string, data: { name: string }) {
    const existing = await this.repo.findArm(id);
    if (!existing) throw new NotFoundException('Arm not found');
    if (existing.tenantId !== tenantId) throw new BadRequestException('Arm belongs to another tenant');
    return this.repo.updateArm(id, data);
  }

  async deleteArm(tenantId: string, id: string) {
    const existing = await this.repo.findArm(id);
    if (!existing) throw new NotFoundException('Arm not found');
    if (existing.tenantId !== tenantId) throw new BadRequestException('Arm belongs to another tenant');
    return this.repo.deleteArm(id);
  }

  async updateTerm(tenantId: string, id: string, data: { name: string }) {
    const result = await this.repo.updateTerm(tenantId, id, data);
    if (result.count === 0) throw new NotFoundException('Term not found');
    return { success: true };
  }

  async deleteTerm(tenantId: string, id: string) {
    const result = await this.repo.deleteTerm(tenantId, id);
    if (result.count === 0) throw new NotFoundException('Term not found');
    return { success: true };
  }

  async updateCampus(tenantId: string, id: string, data: { name: string }) {
    const result = await this.repo.updateCampus(tenantId, id, data);
    if (result.count === 0) throw new NotFoundException('Campus not found');
    return { success: true };
  }

  async deleteCampus(tenantId: string, id: string) {
    const armCount = await this.repo.countArmsByCampus(id);
    if (armCount > 0) {
      throw new ConflictException(
        `Cannot delete this campus because it has ${armCount} arm(s) linked to it. Remove or reassign the arms first.`
      );
    }
    const result = await this.repo.deleteCampus(tenantId, id);
    if (result.count === 0) throw new NotFoundException('Campus not found');
    return { success: true };
  }

  async updateDepartment(tenantId: string, id: string, data: { name: string }) {
    const result = await this.repo.updateDepartment(tenantId, id, data);
    if (result.count === 0) throw new NotFoundException('Department not found');
    return { success: true };
  }

  async deleteDepartment(tenantId: string, id: string) {
    const result = await this.repo.deleteDepartment(tenantId, id);
    if (result.count === 0) throw new NotFoundException('Department not found');
    return { success: true };
  }

  async updateSubjectGroup(tenantId: string, id: string, data: { name: string }) {
    const result = await this.repo.updateSubjectGroup(tenantId, id, data);
    if (result.count === 0) throw new NotFoundException('Subject Group not found');
    return { success: true };
  }

  async deleteSubjectGroup(tenantId: string, id: string) {
    const result = await this.repo.deleteSubjectGroup(tenantId, id);
    if (result.count === 0) throw new NotFoundException('Subject Group not found');
    return { success: true };
  }

  async updateSubject(tenantId: string, schoolId: string, id: string, data: { name: string; subjectGroupId?: string | null }) {
    if (data.subjectGroupId) {
      const subjectGroup = await this.repo.findSubjectGroup(data.subjectGroupId);
      if (!subjectGroup || subjectGroup.tenantId !== tenantId) {
        throw new BadRequestException('Subject Group not found or belongs to another tenant');
      }
      if (subjectGroup.schoolId !== schoolId) {
        throw new BadRequestException('Subject Group must belong to the same school as the Subject');
      }
    }
    const result = await this.repo.updateSubject(tenantId, id, data);
    if (result.count === 0) throw new NotFoundException('Subject not found');
    return { success: true };
  }

  async deleteSubject(tenantId: string, id: string) {
    const result = await this.repo.deleteSubject(tenantId, id);
    if (result.count === 0) throw new NotFoundException('Subject not found');
    return { success: true };
  }
}
