import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { kernel, AssignmentScope, tenantContext } from "@saas/core-platform";
import { AcademicsRepository } from "../repositories/academics.repository";
import {
  CreateTeacherSubjectAssignmentDto,
  QueryTeacherSubjectAssignmentDto,
  CreateClassTeacherAssignmentDto,
  QueryClassTeacherAssignmentDto,
} from "../dto/teacher-assignments.dto";

@Injectable()
export class TeacherAssignmentsService {
  constructor(private readonly repo: AcademicsRepository) {}

  async createTeacherSubjectAssignment(
    tenantId: string,
    schoolId: string,
    dto: CreateTeacherSubjectAssignmentDto,
  ) {
    return tenantContext.run({ tenantId }, async () => {
      // 1. Scope validations
      if (dto.scope === AssignmentScope.ARM_SPECIFIC && !dto.armId) {
        throw new BadRequestException("ARM_SPECIFIC assignment requires armId");
      }
      if (dto.scope === AssignmentScope.CLASS_WIDE && dto.armId) {
        throw new BadRequestException("CLASS_WIDE assignment cannot have armId");
      }

      // 2. Validate entities and tenant/school isolation
      const staff = await this.repo.findStaffProfile(dto.teacherId);
      if (
        !staff ||
        staff.tenantId !== tenantId ||
        staff.schoolId !== schoolId ||
        staff.status !== "ACTIVE"
      ) {
        throw new BadRequestException("Invalid or inactive staff profile");
      }

      const year = await this.repo.findAcademicYear(dto.academicYearId);
      if (!year || year.tenantId !== tenantId || year.schoolId !== schoolId) {
        throw new BadRequestException("Invalid academic year reference");
      }

      const term = await this.repo.findTerm(dto.termId);
      if (!term || term.tenantId !== tenantId || term.academicYearId !== dto.academicYearId) {
        throw new BadRequestException("Invalid term reference or academic year mismatch");
      }

      const cls = await this.repo.findClass(dto.classId);
      if (!cls || cls.tenantId !== tenantId || cls.schoolId !== schoolId) {
        throw new BadRequestException("Invalid class reference");
      }

      const subject = await this.repo.findSubject(dto.subjectId);
      if (!subject || subject.tenantId !== tenantId || subject.schoolId !== schoolId) {
        throw new BadRequestException("Invalid subject reference");
      }

      if (dto.scope === AssignmentScope.ARM_SPECIFIC && dto.armId) {
        const arm = await this.repo.findArm(dto.armId);
        if (
          !arm ||
          arm.tenantId !== tenantId ||
          arm.classId !== dto.classId
        ) {
          throw new BadRequestException("Invalid arm reference or class mismatch");
        }
      }

      const isPrimary = dto.isPrimary ?? true;
      const armId = dto.scope === AssignmentScope.CLASS_WIDE ? null : dto.armId!;

      // 3. Application-level check for duplicate primary teacher in same scope
      if (isPrimary) {
        const existingPrimary = await kernel.db.teacherSubjectAssignment.findFirst({
          where: {
            tenantId,
            schoolId,
            academicYearId: dto.academicYearId,
            termId: dto.termId,
            classId: dto.classId,
            armId: armId,
            subjectId: dto.subjectId,
            isPrimary: true,
            status: "ACTIVE",
          },
        });
        if (existingPrimary) {
          throw new ConflictException(
            "Primary teacher assignment already exists for this scope",
          );
        }
      }

      // 4. Create assignment and catch Prisma unique constraint violations cleanly
      try {
        return await kernel.db.teacherSubjectAssignment.create({
          data: {
            tenantId,
            schoolId,
            academicYearId: dto.academicYearId,
            termId: dto.termId,
            classId: dto.classId,
            armId,
            subjectId: dto.subjectId,
            teacherId: dto.teacherId,
            scope: dto.scope,
            isPrimary,
            status: "ACTIVE",
          },
        });
      } catch (error: any) {
        if (error?.code === "P2002") {
          throw new ConflictException(
            "Duplicate or conflicting teacher subject assignment scope",
          );
        }
        throw error;
      }
    });
  }

  async listTeacherSubjectAssignments(
    tenantId: string,
    schoolId: string,
    query: QueryTeacherSubjectAssignmentDto,
  ) {
    return tenantContext.run({ tenantId }, async () => {
      const where: any = {
        tenantId,
        schoolId,
      };
      if (query.academicYearId) where.academicYearId = query.academicYearId;
      if (query.termId) where.termId = query.termId;
      if (query.classId) where.classId = query.classId;
      if (query.armId) where.armId = query.armId;
      if (query.subjectId) where.subjectId = query.subjectId;
      if (query.teacherId) where.teacherId = query.teacherId;
      if (query.scope) where.scope = query.scope;
      if (query.status) where.status = query.status;

      return kernel.db.teacherSubjectAssignment.findMany({
        where,
        include: {
          teacher: true,
          class: true,
          arm: true,
          subject: true,
          academicYear: true,
          term: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });
  }

  async getTeacherSubjectAssignment(
    tenantId: string,
    schoolId: string,
    id: string,
  ) {
    return tenantContext.run({ tenantId }, async () => {
      const assignment = await kernel.db.teacherSubjectAssignment.findFirst({
        where: { id, tenantId, schoolId },
        include: {
          teacher: true,
          class: true,
          arm: true,
          subject: true,
          academicYear: true,
          term: true,
        },
      });
      if (!assignment) {
        throw new NotFoundException("Teacher subject assignment not found");
      }
      return assignment;
    });
  }

  async deactivateTeacherSubjectAssignment(
    tenantId: string,
    schoolId: string,
    id: string,
  ) {
    return tenantContext.run({ tenantId }, async () => {
      const assignment = await kernel.db.teacherSubjectAssignment.findFirst({
        where: { id, tenantId, schoolId },
      });
      if (!assignment) {
        throw new NotFoundException("Teacher subject assignment not found");
      }
      return kernel.db.teacherSubjectAssignment.update({
        where: { id },
        data: { status: "INACTIVE" },
      });
    });
  }

  async createClassTeacherAssignment(
    tenantId: string,
    schoolId: string,
    dto: CreateClassTeacherAssignmentDto,
  ) {
    return tenantContext.run({ tenantId }, async () => {
      if (dto.scope === AssignmentScope.ARM_SPECIFIC && !dto.armId) {
        throw new BadRequestException("ARM_SPECIFIC assignment requires armId");
      }
      if (dto.scope === AssignmentScope.CLASS_WIDE && dto.armId) {
        throw new BadRequestException("CLASS_WIDE assignment cannot have armId");
      }

      const staff = await this.repo.findStaffProfile(dto.teacherId);
      if (
        !staff ||
        staff.tenantId !== tenantId ||
        staff.schoolId !== schoolId ||
        staff.status !== "ACTIVE"
      ) {
        throw new BadRequestException("Invalid or inactive staff profile");
      }

      const year = await this.repo.findAcademicYear(dto.academicYearId);
      if (!year || year.tenantId !== tenantId || year.schoolId !== schoolId) {
        throw new BadRequestException("Invalid academic year reference");
      }

      const term = await this.repo.findTerm(dto.termId);
      if (!term || term.tenantId !== tenantId || term.academicYearId !== dto.academicYearId) {
        throw new BadRequestException("Invalid term reference or academic year mismatch");
      }

      const cls = await this.repo.findClass(dto.classId);
      if (!cls || cls.tenantId !== tenantId || cls.schoolId !== schoolId) {
        throw new BadRequestException("Invalid class reference");
      }

      if (dto.scope === AssignmentScope.ARM_SPECIFIC && dto.armId) {
        const arm = await this.repo.findArm(dto.armId);
        if (
          !arm ||
          arm.tenantId !== tenantId ||
          arm.classId !== dto.classId
        ) {
          throw new BadRequestException("Invalid arm reference or class mismatch");
        }
      }

      const isPrimary = dto.isPrimary ?? true;
      const armId = dto.scope === AssignmentScope.CLASS_WIDE ? null : dto.armId!;

      if (isPrimary) {
        const existingPrimary = await kernel.db.classTeacherAssignment.findFirst({
          where: {
            tenantId,
            schoolId,
            academicYearId: dto.academicYearId,
            termId: dto.termId,
            classId: dto.classId,
            armId: armId,
            isPrimary: true,
          },
        });
        if (existingPrimary) {
          throw new ConflictException(
            "Primary class teacher assignment already exists for this scope",
          );
        }
      }

      try {
        return await kernel.db.classTeacherAssignment.create({
          data: {
            tenantId,
            schoolId,
            academicYearId: dto.academicYearId,
            termId: dto.termId,
            classId: dto.classId,
            armId,
            teacherId: dto.teacherId,
            scope: dto.scope,
            isPrimary,
          },
        });
      } catch (error: any) {
        if (error?.code === "P2002") {
          throw new ConflictException(
            "Duplicate or conflicting class teacher assignment scope",
          );
        }
        throw error;
      }
    });
  }

  async listClassTeacherAssignments(
    tenantId: string,
    schoolId: string,
    query: QueryClassTeacherAssignmentDto,
  ) {
    return tenantContext.run({ tenantId }, async () => {
      const where: any = {
        tenantId,
        schoolId,
      };
      if (query.academicYearId) where.academicYearId = query.academicYearId;
      if (query.termId) where.termId = query.termId;
      if (query.classId) where.classId = query.classId;
      if (query.armId) where.armId = query.armId;
      if (query.teacherId) where.teacherId = query.teacherId;
      if (query.scope) where.scope = query.scope;

      return kernel.db.classTeacherAssignment.findMany({
        where,
        include: {
          teacher: true,
          class: true,
          arm: true,
          academicYear: true,
          term: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });
  }

  async getClassTeacherAssignment(
    tenantId: string,
    schoolId: string,
    id: string,
  ) {
    return tenantContext.run({ tenantId }, async () => {
      const assignment = await kernel.db.classTeacherAssignment.findFirst({
        where: { id, tenantId, schoolId },
        include: {
          teacher: true,
          class: true,
          arm: true,
          academicYear: true,
          term: true,
        },
      });
      if (!assignment) {
        throw new NotFoundException("Class teacher assignment not found");
      }
      return assignment;
    });
  }

  async deleteClassTeacherAssignment(
    tenantId: string,
    schoolId: string,
    id: string,
  ) {
    return tenantContext.run({ tenantId }, async () => {
      const assignment = await kernel.db.classTeacherAssignment.findFirst({
        where: { id, tenantId, schoolId },
      });
      if (!assignment) {
        throw new NotFoundException("Class teacher assignment not found");
      }
      return kernel.db.classTeacherAssignment.delete({
        where: { id },
      });
    });
  }

  /**
   * Helper to verify teacher grading authority according to Phase 5G semantics.
   */
  async checkTeacherGradingAuthority(params: {
    tenantId: string;
    schoolId: string;
    teacherId: string; // StaffProfile ID
    academicYearId: string;
    termId: string;
    classId: string;
    armId?: string | null;
    subjectId: string;
  }) {
    return tenantContext.run({ tenantId: params.tenantId }, async () => {
      const assignments = await kernel.db.teacherSubjectAssignment.findMany({
        where: {
          tenantId: params.tenantId,
          schoolId: params.schoolId,
          academicYearId: params.academicYearId,
          termId: params.termId,
          classId: params.classId,
          subjectId: params.subjectId,
          teacherId: params.teacherId,
          status: "ACTIVE",
        },
      });

      if (assignments.length === 0) {
        return {
          hasAuthority: false,
          isPrimary: false,
          reason: "NO_ACTIVE_TEACHER_SUBJECT_ASSIGNMENT",
        };
      }

      for (const assignment of assignments) {
        if (assignment.scope === AssignmentScope.CLASS_WIDE) {
          return {
            hasAuthority: true,
            isPrimary: assignment.isPrimary,
            scope: AssignmentScope.CLASS_WIDE,
            assignmentId: assignment.id,
          };
        } else if (assignment.scope === AssignmentScope.ARM_SPECIFIC) {
          if (params.armId && assignment.armId === params.armId) {
            return {
              hasAuthority: true,
              isPrimary: assignment.isPrimary,
              scope: AssignmentScope.ARM_SPECIFIC,
              assignmentId: assignment.id,
            };
          }
        }
      }

      return {
        hasAuthority: false,
        isPrimary: false,
        reason: "ARM_MISMATCH_FOR_ARM_SPECIFIC_ASSIGNMENT",
      };
    });
  }
}
