import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { tenantContext, EnrollmentStatus, StudentStatus, kernel } from '@saas/core-platform';
import { StudentsRepository, CreateStudentInput, CreateGuardianInput, LinkGuardianInput, CreateEnrollmentInput, TransferEnrollmentInput, WithdrawStudentInput } from '../repositories/students.repository';

// ─────────────────────────────────────────────────────────────────────────────
// TENANT/SCHOOL CONSISTENCY ENFORCEMENT
//
// The PlatformKernel enforces tenantId on TENANT_SCOPED models (Student, Guardian,
// StudentGuardian, Enrollment) — cross-tenant rows are never returned.
//
// However, foreign-key existence (e.g. School, AcademicYear, Class, Arm) does NOT
// guarantee that the referenced record belongs to the correct tenant or school.
// All parent-child tenant/school consistency checks are performed explicitly here.
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class StudentsService {
  constructor(private readonly repo: StudentsRepository) {}

  private getActiveTenantId(): string {
    const store = tenantContext.getStore();
    if (!store?.tenantId) {
      throw new BadRequestException('No active tenant context');
    }
    return store.tenantId;
  }

  // ─── Student Creation ──────────────────────────────────────────────────────

  /**
   * Creates a student record.
   * - Validates the school belongs to the active tenant.
   * - Atomically allocates a unique student number via DB UPSERT sequence.
   * - tenantId is sourced exclusively from WorkspaceContext, never from caller.
   */
  async createStudent(input: CreateStudentInput, tx?: typeof kernel.db) {
    const tenantId = this.getActiveTenantId();

    // Validate school exists and belongs to the active tenant.
    // kernel.db.school is TENANT_SCOPED; it returns null if school.tenantId != context.tenantId.
    const school = await this.repo.findSchool(input.schoolId, tx);
    if (!school) {
      throw new BadRequestException('School not found or does not belong to the active tenant');
    }

    // Confirm school.tenantId === WorkspaceContext.tenantId (belt-and-suspenders).
    if (school.tenantId !== tenantId) {
      throw new BadRequestException('School does not belong to the active tenant');
    }

    // Atomically allocate the next student number for this school.
    const studentNumber = await this.repo.mintStudentNumber(tenantId, input.schoolId, tx);

    return this.repo.createStudent({ ...input, studentNumber, tenantId }, tx);
  }

  // ─── Guardian Management ───────────────────────────────────────────────────

  /**
   * Creates a new guardian person record scoped to the active tenant.
   */
  async createGuardian(input: CreateGuardianInput) {
    const tenantId = this.getActiveTenantId();
    return this.repo.createGuardian({ ...input, tenantId });
  }

  /**
   * Links an existing guardian to a student.
   *
   * Enforced invariants:
   * - Student must belong to the active tenant (kernel enforces).
   * - Guardian must belong to the active tenant (kernel enforces).
   * - The link junction tenantId is set from WorkspaceContext.
   * - If isPrimary=true, any existing primary link for the student is cleared first.
   *   This enforces "zero or one primary guardian per student."
   */
  async linkGuardian(input: LinkGuardianInput) {
    const tenantId = this.getActiveTenantId();

    return require('@saas/core-platform').kernel.db.$transaction(async (tx: any) => {
      const student = await this.repo.findStudent(input.studentId, tx);
      if (!student) {
        throw new BadRequestException('Student not found or does not belong to the active tenant');
      }

      if (input.schoolId && student.schoolId !== input.schoolId) {
        throw new BadRequestException('Student does not belong to the active school');
      }

      const guardian = await this.repo.findGuardian(input.guardianId, tx);
      if (!guardian) {
        throw new BadRequestException('Guardian not found or does not belong to the active tenant');
      }

      // Guardian and student must share the same tenant (both fetched via kernel, so this holds,
      // but we validate explicitly to document the invariant clearly).
      if (guardian.tenantId !== student.tenantId || student.tenantId !== tenantId) {
        throw new BadRequestException('Student and Guardian must belong to the same tenant');
      }

      // Check for duplicate link.
      const existingLink = await this.repo.findStudentGuardianLink(input.studentId, input.guardianId, tx);
      if (existingLink) {
        throw new ConflictException('Guardian is already linked to this student');
      }

      // If setting as primary: clear any existing primary first (zero or one).
      if (input.isPrimary) {
        await this.repo.clearPrimaryGuardian(input.studentId, tx);
      }

      return this.repo.createStudentGuardianLink({ ...input, tenantId }, tx);
    });
  }

  // ─── Enrollment Management ─────────────────────────────────────────────────

  /**
   * Enrolls a student in a class/arm for an academic year.
   *
   * Enforced invariants:
   * - Student belongs to active tenant and is ACTIVE.
   * - AcademicYear belongs to active tenant AND same school as student.
   * - Class belongs to active tenant AND same school as student.
   * - Arm (if provided) belongs to active tenant AND belongs to the specified class
   *   AND its campus belongs to the same school.
   * - No existing ACTIVE enrollment for this student/year (pre-check; DB partial index is authoritative).
   */
  async createEnrollment(input: CreateEnrollmentInput, tx?: typeof kernel.db) {
    const tenantId = this.getActiveTenantId();

    const student = await this.repo.findStudent(input.studentId, tx);
    if (!student) {
      throw new BadRequestException('Student not found or does not belong to the active tenant');
    }
    if (student.status !== StudentStatus.ACTIVE) {
      throw new BadRequestException(`Cannot enroll a student with status '${student.status}'`);
    }

    // AcademicYear: explicit tenantId filter (not in tenantScopedModels yet).
    const academicYear = await this.repo.findAcademicYear(input.academicYearId, tx);
    if (!academicYear) {
      throw new BadRequestException('AcademicYear not found or does not belong to the active tenant');
    }
    if (academicYear.schoolId !== student.schoolId) {
      throw new BadRequestException('AcademicYear does not belong to the student\'s school');
    }

    // Class: explicit tenantId filter.
    const classEntity = await this.repo.findClass(input.classId, tx);
    if (!classEntity) {
      throw new BadRequestException('Class not found or does not belong to the active tenant');
    }
    if (classEntity.schoolId !== student.schoolId) {
      throw new BadRequestException('Class does not belong to the student\'s school');
    }

    // Arm (optional): validate class and school/campus consistency.
    if (input.armId) {
      const arm = await this.repo.findArm(input.armId, tx);
      if (!arm) {
        throw new BadRequestException('Arm not found or does not belong to the active tenant');
      }
      if (arm.classId !== input.classId) {
        throw new BadRequestException('Arm does not belong to the specified Class');
      }
      // arm.campusId → campus.schoolId == student.schoolId checked via class.schoolId === arm's class.schoolId;
      // arm.classId === classId already verified, and classEntity.schoolId === student.schoolId already verified.
    }

    // Friendly pre-check before hitting the DB partial index.
    const existingActive = await this.repo.findActiveEnrollment(input.studentId, input.academicYearId, tx);
    if (existingActive) {
      throw new ConflictException('Student already has an ACTIVE enrollment for this academic year');
    }

    // Create enrollment — DB partial index enforces uniqueness against races.
    try {
      return await this.repo.createEnrollment({
        tenantId,
        studentId: input.studentId,
        schoolId: student.schoolId,
        academicYearId: input.academicYearId,
        classId: input.classId,
        armId: input.armId,
      }, tx);
    } catch (err: unknown) {
      // PostgreSQL unique_violation on the partial index (race condition).
      const code = (err as { code?: string })?.code;
      if (code === 'P2002') {
        throw new ConflictException('Student already has an ACTIVE enrollment for this academic year (concurrent request)');
      }
      throw err;
    }
  }

  /**
   * Transfers a student to a different class/arm within the same academic year.
   *
   * Semantics:
   * - The current ACTIVE enrollment is closed with status TRANSFERRED (historical row preserved).
   * - A new ACTIVE enrollment is created for the new class/arm.
   * - Both operations are wrapped in a kernel.$transaction.
   *
   * NOTE: StudentStatus remains ACTIVE — this is an internal placement change,
   * not a transfer out of the institution.
   */
  async transferEnrollment(input: TransferEnrollmentInput) {
    const tenantId = this.getActiveTenantId();

    const enrollment = await this.repo.findEnrollment(input.enrollmentId);
    if (!enrollment) {
      throw new BadRequestException('Enrollment not found or does not belong to the active tenant');
    }
    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new BadRequestException('Only ACTIVE enrollments can be transferred');
    }

    const newClass = await this.repo.findClass(input.newClassId);
    if (!newClass) {
      throw new BadRequestException('Target Class not found or does not belong to the active tenant');
    }
    if (newClass.schoolId !== enrollment.schoolId) {
      throw new BadRequestException('Target Class does not belong to the enrollment\'s school');
    }

    if (input.newArmId) {
      const arm = await this.repo.findArm(input.newArmId);
      if (!arm) {
        throw new BadRequestException('Target Arm not found or does not belong to the active tenant');
      }
      if (arm.classId !== input.newClassId) {
        throw new BadRequestException('Target Arm does not belong to the target Class');
      }
    }

    return this.repo.transferEnrollment(
      input.enrollmentId,
      input.newClassId,
      tenantId,
      enrollment.schoolId,
      enrollment.studentId,
      enrollment.academicYearId,
      input.newArmId,
      input.notes,
    );
  }

  /**
   * Withdraws a student from their current enrollment.
   *
   * - Closes the ACTIVE enrollment with status WITHDRAWN.
   * - Sets student status to WITHDRAWN.
   * - Historical enrollment row is preserved.
   */
  async withdrawStudent(input: WithdrawStudentInput) {
    const enrollment = await this.repo.findEnrollment(input.enrollmentId);
    if (!enrollment) {
      throw new BadRequestException('Enrollment not found or does not belong to the active tenant');
    }
    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new BadRequestException('Only ACTIVE enrollments can be withdrawn');
    }

    const student = await this.repo.findStudent(input.studentId);
    if (!student) {
      throw new BadRequestException('Student not found or does not belong to the active tenant');
    }
    if (enrollment.studentId !== input.studentId) {
      throw new BadRequestException('Enrollment does not belong to the specified student');
    }

    await this.repo.withdrawEnrollment(input.enrollmentId, input.notes);
    await this.repo.setStudentStatus(input.studentId, 'WITHDRAWN');

    return { message: 'Student withdrawn successfully' };
  }

  // ─── Read Operations ───────────────────────────────────────────────────────

  async listStudents(schoolId?: string) {
    return this.repo.listStudents(schoolId);
  }

  async getStudent(studentId: string) {
    const student = await this.repo.findStudent(studentId);
    if (!student) {
      throw new BadRequestException('Student not found or does not belong to the active tenant');
    }
    return student;
  }

  async listEnrollments(studentId: string) {
    // Verify student belongs to active tenant before listing enrollments.
    const student = await this.repo.findStudent(studentId);
    if (!student) {
      throw new BadRequestException('Student not found or does not belong to the active tenant');
    }
    return this.repo.listEnrollments(studentId);
  }

  async listStudentGuardians(studentId: string) {
    const student = await this.repo.findStudent(studentId);
    if (!student) {
      throw new BadRequestException('Student not found or does not belong to the active tenant');
    }
    return this.repo.listStudentGuardians(studentId);
  }

  async listGuardians(schoolId?: string) {
    return this.repo.listGuardians(schoolId);
  }
}
