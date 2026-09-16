import { Injectable } from '@nestjs/common';
import { kernel } from '@saas/core-platform';

@Injectable()
export class AcademicsRepository {
  async findSchool(id: string) {
    return kernel.db.school.findUnique({ where: { id } });
  }

  async findAcademicYear(id: string) {
    return kernel.db.academicYear.findUnique({ where: { id } });
  }

  async findClass(id: string) {
    return kernel.db.class.findUnique({ where: { id } });
  }

  async findCampus(id: string) {
    return kernel.db.campus.findUnique({ where: { id } });
  }

  async findSubjectGroup(id: string) {
    return kernel.db.subjectGroup.findUnique({ where: { id } });
  }

  async createCampus(data: any) {
    return kernel.db.campus.create({ data });
  }

  async createAcademicYear(data: any) {
    return kernel.db.academicYear.create({ data });
  }

  async createTerm(data: any) {
    return kernel.db.term.create({ data });
  }

  async createDepartment(data: any) {
    return kernel.db.department.create({ data });
  }

  async createClass(data: any) {
    return kernel.db.class.create({ data });
  }

  async createArm(data: any) {
    return kernel.db.arm.create({ data });
  }

  async createSubjectGroup(data: any) {
    return kernel.db.subjectGroup.create({ data });
  }

  async createSubject(data: any) {
    return kernel.db.subject.create({ data });
  }

  async listAcademicYears(tenantId: string, schoolId: string, skip: number, take: number) {
    return kernel.db.academicYear.findMany({
      where: { tenantId, schoolId },
      skip,
      take,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async listTerms(tenantId: string, schoolId: string, skip: number, take: number) {
    return kernel.db.term.findMany({
      where: { 
        tenantId, 
        academicYear: { schoolId } 
      },
      skip,
      take,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async listClasses(tenantId: string, schoolId: string, skip: number, take: number) {
    return kernel.db.class.findMany({
      where: { tenantId, schoolId },
      skip,
      take,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async listArms(tenantId: string, schoolId: string, skip: number, take: number) {
    return kernel.db.arm.findMany({
      where: { 
        tenantId,
        class: { schoolId }
      },
      skip,
      take,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async listSubjects(tenantId: string, schoolId: string, skip: number, take: number) {
    return kernel.db.subject.findMany({
      where: { tenantId, schoolId },
      skip,
      take,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async listCampuses(tenantId: string, schoolId: string, skip: number, take: number) {
    return kernel.db.campus.findMany({
      where: { tenantId, schoolId },
      skip,
      take,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async listSubjectGroups(tenantId: string, schoolId: string, skip: number, take: number) {
    return kernel.db.subjectGroup.findMany({
      where: { tenantId, schoolId },
      skip,
      take,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }
}
