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

  async listDepartments(tenantId: string, schoolId: string, skip: number, take: number) {
    return kernel.db.department.findMany({
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

  async updateAcademicYear(id: string, data: { name: string }) {
    return kernel.db.academicYear.update({ where: { id }, data });
  }

  async deleteAcademicYear(id: string) {
    return kernel.db.academicYear.delete({ where: { id } });
  }

  async updateClass(id: string, data: { name: string }) {
    return kernel.db.class.update({ where: { id }, data });
  }

  async deleteClass(id: string) {
    return kernel.db.class.delete({ where: { id } });
  }

  async updateArm(id: string, data: { name: string }) {
    return kernel.db.arm.update({ where: { id }, data });
  }

  async deleteArm(id: string) {
    return kernel.db.arm.delete({ where: { id } });
  }

  async findArm(id: string) {
    return kernel.db.arm.findUnique({ where: { id } });
  }

  async countArmsByCampus(campusId: string) {
    return kernel.db.arm.count({ where: { campusId } });
  }

  async updateTerm(tenantId: string, id: string, data: { name: string }) {
    return kernel.db.term.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async deleteTerm(tenantId: string, id: string) {
    return kernel.db.term.deleteMany({
      where: { id, tenantId },
    });
  }

  async updateCampus(tenantId: string, id: string, data: { name: string }) {
    return kernel.db.campus.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async deleteCampus(tenantId: string, id: string) {
    return kernel.db.campus.deleteMany({
      where: { id, tenantId },
    });
  }

  async updateDepartment(tenantId: string, id: string, data: { name: string }) {
    return kernel.db.department.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async deleteDepartment(tenantId: string, id: string) {
    return kernel.db.department.deleteMany({
      where: { id, tenantId },
    });
  }

  async updateSubjectGroup(tenantId: string, id: string, data: { name: string }) {
    return kernel.db.subjectGroup.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async deleteSubjectGroup(tenantId: string, id: string) {
    return kernel.db.subjectGroup.deleteMany({
      where: { id, tenantId },
    });
  }

  async updateSubject(tenantId: string, id: string, data: { name: string; subjectGroupId?: string | null }) {
    return kernel.db.subject.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async deleteSubject(tenantId: string, id: string) {
    return kernel.db.subject.deleteMany({
      where: { id, tenantId },
    });
  }
}
