import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { AcademicsRepository } from "../repositories/academics.repository";
import { TermStatus } from "@saas/core-platform";

@Injectable()
export class AcademicsService {
  constructor(private readonly repo: AcademicsRepository) {}

  async createCampus(
    tenantId: string,
    data: { schoolId: string; name: string; code?: string },
  ) {
    const school = await this.repo.findSchool(data.schoolId);
    if (!school || school.tenantId !== tenantId) {
      throw new BadRequestException("School not found or belongs to another tenant");
    }
    return this.repo.createCampus({ ...data, tenantId });
  }

  async createAcademicYear(
    tenantId: string,
    data: { schoolId: string; name: string; startDate: string; endDate: string },
  ) {
    const school = await this.repo.findSchool(data.schoolId);
    if (!school || school.tenantId !== tenantId) {
      throw new BadRequestException("School not found or belongs to another tenant");
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (start >= end) {
      throw new BadRequestException("startDate must be strictly before endDate");
    }

    const overlaps = await this.repo.findOverlappingAcademicYears(tenantId, data.schoolId, start, end);
    if (overlaps.length > 0) {
      throw new ConflictException("Academic year date range overlaps with an existing academic year");
    }

    return this.repo.createAcademicYear({ ...data, tenantId, startDate: start, endDate: end });
  }

  async createTerm(
    tenantId: string,
    data: { academicYearId: string; name: string; startDate: string; endDate: string },
  ) {
    const academicYear = await this.repo.findAcademicYear(data.academicYearId);
    if (!academicYear || academicYear.tenantId !== tenantId) {
      throw new BadRequestException("Academic Year not found or belongs to another tenant");
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (start >= end) {
      throw new BadRequestException("startDate must be strictly before endDate");
    }

    if (start < academicYear.startDate || end > academicYear.endDate) {
      throw new BadRequestException("Term dates must be strictly within the boundaries of the parent Academic Year");
    }

    const overlaps = await this.repo.findOverlappingTerms(tenantId, data.academicYearId, start, end);
    if (overlaps.length > 0) {
      throw new ConflictException("Term date range overlaps with an existing term in this academic year");
    }

    return this.repo.createTerm({ ...data, tenantId, startDate: start, endDate: end });
  }

  async createClass(
    tenantId: string,
    data: { schoolId: string; name: string; campusId?: string },
  ) {
    const school = await this.repo.findSchool(data.schoolId);
    if (!school || school.tenantId !== tenantId) {
      throw new BadRequestException("School not found or belongs to another tenant");
    }

    if (data.campusId) {
      const campus = await this.repo.findCampus(data.campusId);
      if (!campus || campus.tenantId !== tenantId || campus.schoolId !== data.schoolId) {
        throw new BadRequestException("Campus not found or belongs to another school/tenant");
      }
    }

    return this.repo.createClass({ ...data, tenantId });
  }

  async createArm(
    tenantId: string,
    data: { classId: string; name: string; campusId?: string },
  ) {
    const cls = await this.repo.findClass(data.classId);
    if (!cls || cls.tenantId !== tenantId) {
      throw new BadRequestException("Class not found or belongs to another tenant");
    }

    return this.repo.createArm({
      tenantId,
      classId: data.classId,
      name: data.name,
    });
  }

  async createSubject(
    tenantId: string,
    data: { schoolId: string; name: string; code?: string },
  ) {
    const school = await this.repo.findSchool(data.schoolId);
    if (!school || school.tenantId !== tenantId) {
      throw new BadRequestException("School not found or belongs to another tenant");
    }

    return this.repo.createSubject({ ...data, tenantId });
  }

  async listAcademicYears(tenantId: string, schoolId?: string, skip = 0, take = 50) {
    return this.repo.listAcademicYears(tenantId, schoolId, skip, take);
  }

  async listTerms(tenantId: string, schoolId?: string, skip = 0, take = 50) {
    return this.repo.listTerms(tenantId, schoolId, skip, take);
  }

  async listClasses(tenantId: string, schoolId?: string, skip = 0, take = 50) {
    return this.repo.listClasses(tenantId, schoolId, skip, take);
  }

  async listArms(tenantId: string, schoolId?: string, skip = 0, take = 50, campusId?: string) {
    return this.repo.listArms(tenantId, schoolId, skip, take, campusId);
  }

  async listSubjects(tenantId: string, schoolId?: string, skip = 0, take = 50) {
    return this.repo.listSubjects(tenantId, schoolId, skip, take);
  }

  async listCampuses(tenantId: string, schoolId?: string, skip = 0, take = 50) {
    return this.repo.listCampuses(tenantId, schoolId, skip, take);
  }

  async updateAcademicYear(tenantId: string, id: string, data: { name?: string; isCurrent?: boolean }) {
    const existing = await this.repo.findAcademicYear(id);
    if (!existing) throw new NotFoundException("Academic Year not found");
    if (existing.tenantId !== tenantId) throw new BadRequestException("Academic Year belongs to another tenant");
    return this.repo.updateAcademicYear(id, data);
  }

  async deleteAcademicYear(tenantId: string, id: string) {
    const existing = await this.repo.findAcademicYear(id);
    if (!existing) throw new NotFoundException("Academic Year not found");
    if (existing.tenantId !== tenantId) throw new BadRequestException("Academic Year belongs to another tenant");
    return this.repo.deleteAcademicYear(id);
  }

  async updateClass(tenantId: string, id: string, data: { name?: string; campusId?: string }) {
    const existing = await this.repo.findClass(id);
    if (!existing) throw new NotFoundException("Class not found");
    if (existing.tenantId !== tenantId) throw new BadRequestException("Class belongs to another tenant");
    return this.repo.updateClass(id, data);
  }

  async deleteClass(tenantId: string, id: string) {
    const existing = await this.repo.findClass(id);
    if (!existing) throw new NotFoundException("Class not found");
    if (existing.tenantId !== tenantId) throw new BadRequestException("Class belongs to another tenant");

    const armCount = await this.repo.countArmsByClass(id);
    if (armCount > 0) {
      throw new ConflictException(
        `Cannot delete this class because it has ${armCount} arm(s) linked to it. Remove or reassign the arms first.`,
      );
    }

    return this.repo.deleteClass(id);
  }

  async updateArm(tenantId: string, id: string, data: { name?: string }) {
    const existing = await this.repo.findArm(id);
    if (!existing) throw new NotFoundException("Arm not found");
    if (existing.tenantId !== tenantId) throw new BadRequestException("Arm belongs to another tenant");
    return this.repo.updateArm(id, data);
  }

  async deleteArm(tenantId: string, id: string) {
    const existing = await this.repo.findArm(id);
    if (!existing) throw new NotFoundException("Arm not found");
    if (existing.tenantId !== tenantId) throw new BadRequestException("Arm belongs to another tenant");
    return this.repo.deleteArm(id);
  }

  async updateTerm(tenantId: string, id: string, data: { name?: string; status?: TermStatus; isCurrent?: boolean }) {
    const result = await this.repo.updateTerm(tenantId, id, data);
    if (result.count === 0) throw new NotFoundException("Term not found");
    return { success: true };
  }

  async deleteTerm(tenantId: string, id: string) {
    const result = await this.repo.deleteTerm(tenantId, id);
    if (result.count === 0) throw new NotFoundException("Term not found");
    return { success: true };
  }

  async activateTerm(tenantId: string, termId: string) {
    const term = await this.repo.findTerm(termId);
    if (!term || term.tenantId !== tenantId) {
      throw new NotFoundException("Term not found");
    }
    await this.repo.setActiveTerm(tenantId, term.academicYearId, termId);
    return { success: true, activeTermId: termId };
  }

  async updateCampus(tenantId: string, id: string, data: { name?: string; address?: string }) {
    const result = await this.repo.updateCampus(tenantId, id, data);
    if (result.count === 0) throw new NotFoundException("Campus not found");
    return { success: true };
  }

  async deleteCampus(tenantId: string, id: string) {
    const armCount = await this.repo.countArmsByCampus(id);
    if (armCount > 0) {
      throw new ConflictException(
        `Cannot delete this campus because it has ${armCount} arm(s) linked to it. Remove or reassign the arms first.`,
      );
    }
    const result = await this.repo.deleteCampus(tenantId, id);
    if (result.count === 0) throw new NotFoundException("Campus not found");
    return { success: true };
  }

  async updateSubject(
    tenantId: string,
    id: string,
    data: { name?: string; code?: string; isElective?: boolean },
  ) {
    const result = await this.repo.updateSubject(tenantId, id, data);
    if (result.count === 0) throw new NotFoundException("Subject not found");
    return { success: true };
  }

  async deleteSubject(tenantId: string, id: string) {
    const result = await this.repo.deleteSubject(tenantId, id);
    if (result.count === 0) throw new NotFoundException("Subject not found");
    return { success: true };
  }
}
