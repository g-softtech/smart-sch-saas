import { Injectable } from "@nestjs/common";
import { kernel, TermStatus } from "@saas/core-platform";

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

  async findArm(id: string) {
    return kernel.db.arm.findUnique({ where: { id } });
  }

  async findTerm(id: string) {
    return kernel.db.term.findUnique({ where: { id } });
  }

  async findSubject(id: string) {
    return kernel.db.subject.findUnique({ where: { id } });
  }

  async findOverlappingAcademicYears(tenantId: string, schoolId: string, startDate: Date, endDate: Date, excludeId?: string) {
    return kernel.db.academicYear.findMany({
      where: {
        tenantId,
        schoolId,
        id: excludeId ? { not: excludeId } : undefined,
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    });
  }

  async findOverlappingTerms(tenantId: string, academicYearId: string, startDate: Date, endDate: Date, excludeId?: string) {
    return kernel.db.term.findMany({
      where: {
        tenantId,
        academicYearId,
        id: excludeId ? { not: excludeId } : undefined,
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    });
  }

  async createCampus(data: { tenantId: string; schoolId: string; name: string; code?: string }) {
    const code = data.code || 'CMP-' + Math.floor(1000 + Math.random() * 9000);
    return kernel.db.campus.create({
      data: {
        tenantId: data.tenantId,
        schoolId: data.schoolId,
        name: data.name,
        code,
      },
    });
  }

  async createAcademicYear(data: { tenantId: string; schoolId: string; name: string; startDate: Date; endDate: Date }) {
    return kernel.db.academicYear.create({
      data,
    });
  }

  async createTerm(data: { tenantId: string; academicYearId: string; name: string; startDate: Date; endDate: Date }) {
    return kernel.db.term.create({
      data,
    });
  }

  async createClass(data: { tenantId: string; schoolId: string; name: string; campusId?: string }) {
    return kernel.db.class.create({
      data,
    });
  }

  async createArm(data: { tenantId: string; classId: string; name: string }) {
    return kernel.db.arm.create({
      data,
    });
  }

  async createSubject(data: { tenantId: string; schoolId: string; name: string; code?: string }) {
    const code = data.code || data.name.substring(0, 4).toUpperCase();
    return kernel.db.subject.create({
      data: {
        tenantId: data.tenantId,
        schoolId: data.schoolId,
        name: data.name,
        code,
      },
    });
  }

  async listAcademicYears(tenantId: string, schoolId?: string, skip = 0, take = 50) {
    return kernel.db.academicYear.findMany({
      where: schoolId ? { tenantId, schoolId } : { tenantId },
      skip,
      take,
      orderBy: [{ startDate: "desc" }, { name: "asc" }],
      include: {
        terms: {
          orderBy: { startDate: "asc" },
        },
      },
    });
  }

  async listTerms(tenantId: string, schoolId?: string, skip = 0, take = 50) {
    return kernel.db.term.findMany({
      where: schoolId ? { tenantId, academicYear: { schoolId } } : { tenantId },
      skip,
      take,
      orderBy: [{ startDate: "desc" }, { name: "asc" }],
      include: {
        academicYear: {
          select: { id: true, name: true, schoolId: true },
        },
      },
    });
  }

  async listClasses(tenantId: string, schoolId?: string, skip = 0, take = 50) {
    return kernel.db.class.findMany({
      where: schoolId ? { tenantId, schoolId } : { tenantId },
      skip,
      take,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      include: {
        arms: true,
        campus: true,
      },
    });
  }

  async listArms(tenantId: string, schoolId?: string, skip = 0, take = 50, campusId?: string) {
    const where: any = { tenantId };
    if (schoolId) {
      where.class = { schoolId };
    }
    if (campusId) {
      where.class = { ...where.class, campusId };
    }

    return kernel.db.arm.findMany({
      where,
      skip,
      take,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      include: {
        class: true,
      },
    });
  }

  async listSubjects(tenantId: string, schoolId?: string, skip = 0, take = 50) {
    return kernel.db.subject.findMany({
      where: schoolId ? { tenantId, schoolId } : { tenantId },
      skip,
      take,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
  }

  async listCampuses(tenantId: string, schoolId?: string, skip = 0, take = 50) {
    return kernel.db.campus.findMany({
      where: schoolId ? { tenantId, schoolId } : { tenantId },
      skip,
      take,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
  }

  async updateAcademicYear(id: string, data: { name?: string; isCurrent?: boolean }) {
    return kernel.db.academicYear.update({ where: { id }, data });
  }

  async deleteAcademicYear(id: string) {
    return kernel.db.academicYear.delete({ where: { id } });
  }

  async countArmsByClass(classId: string) {
    return kernel.db.arm.count({ where: { classId } });
  }

  async updateClass(id: string, data: { name?: string; campusId?: string }) {
    return kernel.db.class.update({ where: { id }, data });
  }

  async deleteClass(id: string) {
    return kernel.db.class.delete({ where: { id } });
  }

  async updateArm(id: string, data: { name?: string }) {
    return kernel.db.arm.update({ where: { id }, data });
  }

  async deleteArm(id: string) {
    return kernel.db.arm.delete({ where: { id } });
  }

  async countArmsByCampus(campusId: string) {
    return kernel.db.arm.count({
      where: {
        class: { campusId },
      },
    });
  }

  async updateTerm(tenantId: string, id: string, data: { name?: string; status?: TermStatus; isCurrent?: boolean }) {
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

  async setActiveTerm(tenantId: string, academicYearId: string, termId: string) {
    // Atomically reset other terms in the academic year to isCurrent = false, and set target term to isCurrent = true
    return await kernel.rawDb.$transaction([
      kernel.rawDb.term.updateMany({
        where: { tenantId, academicYearId },
        data: { isCurrent: false, status: TermStatus.COMPLETED },
      }),
      kernel.rawDb.term.updateMany({
        where: { tenantId, id: termId },
        data: { isCurrent: true, status: TermStatus.ACTIVE },
      }),
    ]);
  }

  async updateCampus(tenantId: string, id: string, data: { name?: string; address?: string }) {
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

  async updateSubject(tenantId: string, id: string, data: { name?: string; code?: string; isElective?: boolean }) {
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
