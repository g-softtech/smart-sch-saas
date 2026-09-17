import { Injectable } from '@nestjs/common';
import { kernel, tenantContext, EnrollmentStatus } from '@saas/core-platform';
import { Prisma } from '@saas/core-platform';

export type CreateStudentInput = {
  schoolId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: Date;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  nationality?: string;
  admissionDate: Date;
};

export type CreateGuardianInput = {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  occupation?: string;
};

export type LinkGuardianInput = {
  studentId: string;
  guardianId: string;
  relationship: 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'OTHER';
  isPrimary?: boolean;
  isEmergencyContact?: boolean;
  schoolId?: string;
  roleId?: string;
};

export type CreateEnrollmentInput = {
  studentId: string;
  academicYearId: string;
  classId: string;
  armId?: string;
};

export type TransferEnrollmentInput = {
  enrollmentId: string;
  newClassId: string;
  newArmId?: string;
  notes?: string;
};

export type WithdrawStudentInput = {
  enrollmentId: string;
  studentId: string;
  notes?: string;
};

@Injectable()
export class StudentsRepository {

  // ─── School lookup (not TENANT_SCOPED in kernel, but query scoped by tenantId field) ───
  async findSchool(schoolId: string, tx?: typeof kernel.db) {
    // School IS in tenantScopedModels — kernel appends tenantId automatically.
    const db = tx ?? kernel.db;
    return db.school.findUnique({ where: { id: schoolId } });
  }

  async findAcademicYear(academicYearId: string, tx?: typeof kernel.db) {
    // AcademicYear is NOT in tenantScopedModels; tenantId filter applied explicitly.
    const db = tx ?? kernel.db;
    const tenantId = tenantContext.getStore()?.tenantId;
    return db.academicYear.findFirst({ where: { id: academicYearId, tenantId } });
  }

  async findClass(classId: string, tx?: typeof kernel.db) {
    // Class is NOT in tenantScopedModels; tenantId filter applied explicitly.
    const db = tx ?? kernel.db;
    const tenantId = tenantContext.getStore()?.tenantId;
    return db.class.findFirst({ where: { id: classId, tenantId } });
  }

  async findArm(armId: string, tx?: typeof kernel.db) {
    // Arm is NOT in tenantScopedModels; tenantId filter applied explicitly.
    const db = tx ?? kernel.db;
    const tenantId = tenantContext.getStore()?.tenantId;
    return db.arm.findFirst({ where: { id: armId, tenantId } });
  }

  async findStudent(studentId: string, tx?: typeof kernel.db) {
    // Student IS in tenantScopedModels — kernel appends tenantId automatically.
    const db = tx ?? kernel.db;
    return db.student.findUnique({ where: { id: studentId } });
  }

  async findGuardian(guardianId: string, tx?: typeof kernel.db) {
    // Guardian IS in tenantScopedModels — kernel appends tenantId automatically.
    const db = tx ?? kernel.db;
    return db.guardian.findUnique({ where: { id: guardianId } });
  }

  async findActiveEnrollment(studentId: string, academicYearId: string, tx?: typeof kernel.db) {
    const db = tx ?? kernel.db;
    return db.enrollment.findFirst({
      where: { studentId, academicYearId, status: EnrollmentStatus.ACTIVE },
    });
  }

  async findEnrollment(enrollmentId: string, tx?: typeof kernel.db) {
    const db = tx ?? kernel.db;
    return db.enrollment.findUnique({ where: { id: enrollmentId } });
  }

  async findStudentGuardianLink(studentId: string, guardianId: string, tx?: typeof kernel.db) {
    // Also tenantScopedModels
    const db = tx ?? kernel.db;
    return db.studentGuardian.findUnique({
      where: {
        studentId_guardianId: { studentId, guardianId },
      },
    });
  }

  async findPrimaryGuardian(studentId: string, tx?: typeof kernel.db) {
    const db = tx ?? kernel.db;
    return db.studentGuardian.findFirst({ where: { studentId, isPrimary: true } });
  }

  /**
   * Atomically allocates the next student number for a school.
   * Uses INSERT ... ON CONFLICT ... DO UPDATE to ensure concurrency safety.
   * Two simultaneous first-time requests cannot both insert lastNumber=1;
   * the UPSERT serialises them on the unique constraint.
   */
  async mintStudentNumber(tenantId: string, schoolId: string, tx?: typeof kernel.db): Promise<string> {
    const db = tx ?? kernel.db;
    const result = await db.$queryRaw<Array<{ lastNumber: number }>>`
      INSERT INTO stud_student_number_sequences ("tenantId", "schoolId", "lastNumber")
      VALUES (${tenantId}, ${schoolId}, 1)
      ON CONFLICT ("tenantId", "schoolId")
      DO UPDATE SET "lastNumber" = stud_student_number_sequences."lastNumber" + 1
      RETURNING "lastNumber"
    `;
    const seq = result[0].lastNumber;
    return `STU-${seq.toString().padStart(4, '0')}`;
  }

  async createStudent(data: CreateStudentInput & { studentNumber: string; tenantId: string }, tx?: typeof kernel.db) {
    // tenantId injected by kernel from context; also passed explicitly to student-number sequence.
    // The kernel will overwrite any tenantId in data.data with the context value, which is correct.
    const db = tx ?? kernel.db;
    return db.student.create({
      data: {
        tenantId: data.tenantId, // will be overridden by kernel — included for TypeScript type safety
        schoolId: data.schoolId,
        studentNumber: data.studentNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        nationality: data.nationality,
        admissionDate: data.admissionDate,
      },
    });
  }

  async createGuardian(data: CreateGuardianInput & { tenantId: string }) {
    return kernel.db.guardian.create({
      data: {
        tenantId: data.tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        occupation: data.occupation,
      },
    });
  }

  async createStudentGuardianLink(data: LinkGuardianInput & { tenantId: string }, tx?: typeof kernel.db) {
    const db = tx ?? kernel.db;
    return db.studentGuardian.create({
      data: {
        tenantId: data.tenantId,
        studentId: data.studentId,
        guardianId: data.guardianId,
        relationship: data.relationship,
        isPrimary: data.isPrimary ?? false,
        isEmergencyContact: data.isEmergencyContact ?? false,
      },
    });
  }

  async clearPrimaryGuardian(studentId: string, tx?: typeof kernel.db) {
    // Clear any existing primary flag before setting a new one.
    const db = tx ?? kernel.db;
    return db.studentGuardian.updateMany({
      where: { studentId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  async createEnrollment(data: {
    tenantId: string;
    studentId: string;
    schoolId: string;
    academicYearId: string;
    classId: string;
    armId?: string;
  }, tx?: typeof kernel.db) {
    const db = tx ?? kernel.db;
    return db.enrollment.create({
      data: {
        tenantId: data.tenantId,
        studentId: data.studentId,
        schoolId: data.schoolId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        armId: data.armId,
        status: EnrollmentStatus.ACTIVE,
      },
    });
  }

  /**
   * Atomically closes the current enrollment and opens a new one.
   * Uses kernel.$transaction so both operations succeed or both fail.
   * The scoped transaction client enforces tenantId on all model operations inside.
   */
  async transferEnrollment(
    enrollmentId: string,
    newClassId: string,
    tenantId: string,
    schoolId: string,
    studentId: string,
    academicYearId: string,
    newArmId?: string,
    notes?: string,
  ) {
    return kernel.$transaction(async (tx) => {
      // Close current enrollment
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { status: EnrollmentStatus.TRANSFERRED, notes: notes ?? null },
      });

      // Open new enrollment
      return tx.enrollment.create({
        data: {
          tenantId,
          studentId,
          schoolId,
          academicYearId,
          classId: newClassId,
          armId: newArmId,
          status: EnrollmentStatus.ACTIVE,
        },
      });
    });
  }

  async withdrawEnrollment(enrollmentId: string, notes?: string) {
    return kernel.db.enrollment.update({
      where: { id: enrollmentId },
      data: { status: EnrollmentStatus.WITHDRAWN, notes: notes ?? null },
    });
  }

  async setStudentStatus(studentId: string, status: 'ACTIVE' | 'SUSPENDED' | 'GRADUATED' | 'WITHDRAWN' | 'TRANSFERRED') {
    return kernel.db.student.update({
      where: { id: studentId },
      data: { status },
    });
  }

  async listStudents(schoolId?: string) {
    const where: Record<string, unknown> = schoolId ? { schoolId } : {};
    return kernel.db.student.findMany({ where });
  }

  async listEnrollments(studentId: string) {
    return kernel.db.enrollment.findMany({
      where: { studentId },
      include: {
        academicYear: true,
        class: true,
        arm: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async listStudentGuardians(studentId: string) {
    return kernel.db.studentGuardian.findMany({
      where: { studentId },
      include: { guardian: true },
    });
  }

  async listGuardians(schoolId?: string, search?: string) {
    const where: any = {};
    // Temporarily disabling schoolId filter so newly created unlinked guardians are visible tenant-wide.
    // if (schoolId) {
    //   where.students = {
    //     some: { student: { schoolId } }
    //   };
    // }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    return kernel.db.guardian.findMany({ where });
  }
}
