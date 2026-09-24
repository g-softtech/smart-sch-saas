import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import {
  tenantContext,
  EnrollmentStatus,
  StudentStatus,
  kernel,
} from "@saas/core-platform";
import {
  StudentsRepository,
  CreateStudentInput,
  CreateGuardianInput,
  LinkGuardianInput,
  CreateEnrollmentInput,
  TransferEnrollmentInput,
  WithdrawStudentInput,
} from "../repositories/students.repository";

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
      throw new BadRequestException("No active tenant context");
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
      throw new BadRequestException(
        "School not found or does not belong to the active tenant",
      );
    }

    // Confirm school.tenantId === WorkspaceContext.tenantId (belt-and-suspenders).
    if (school.tenantId !== tenantId) {
      throw new BadRequestException(
        "School does not belong to the active tenant",
      );
    }

    // Atomically allocate the next student number for this school.
    const studentNumber = await this.repo.mintStudentNumber(
      tenantId,
      input.schoolId,
      tx,
    );

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

    if (!input.schoolId) {
      if (!input.roleId) {
        throw new ForbiddenException(
          "Tenant-wide linking requires explicitly authorized role",
        );
      }
      const role =
        await require("@saas/core-platform").kernel.db.role.findUnique({
          where: { id: input.roleId },
        });
      if (!role || role.name !== "SUPER_ADMIN" || role.tenantId !== tenantId) {
        throw new ForbiddenException(
          "Tenant-wide linking requires SUPER_ADMIN role",
        );
      }
    }

    return require("@saas/core-platform").kernel.db.$transaction(
      async (tx: any) => {
        // 1. Acquire row-level lock on the Student record to serialize concurrent requests.
        const locked =
          await tx.$queryRaw`SELECT id FROM "stud_students" WHERE id = ${input.studentId} FOR UPDATE`;
        if (!locked || locked.length === 0) {
          throw new BadRequestException(
            "Student not found or does not belong to the active tenant",
          );
        }

        const student = await this.repo.findStudent(input.studentId, tx);
        if (!student) {
          throw new BadRequestException(
            "Student not found or does not belong to the active tenant",
          );
        }

        if (input.schoolId && student.schoolId !== input.schoolId) {
          throw new BadRequestException(
            "Student does not belong to the active school",
          );
        }

        const guardian = await this.repo.findGuardian(input.guardianId, tx);
        if (!guardian) {
          throw new BadRequestException(
            "Guardian not found or does not belong to the active tenant",
          );
        }

        // Guardian and student must share the same tenant (both fetched via kernel, so this holds,
        // but we validate explicitly to document the invariant clearly).
        if (
          guardian.tenantId !== student.tenantId ||
          student.tenantId !== tenantId
        ) {
          throw new BadRequestException(
            "Student and Guardian must belong to the same tenant",
          );
        }

        // Check for duplicate link.
        const existingLink = await this.repo.findStudentGuardianLink(
          input.studentId,
          input.guardianId,
          tx,
        );
        if (existingLink) {
          throw new ConflictException(
            "Guardian is already linked to this student",
          );
        }

        // If setting as primary: clear any existing primary first (zero or one).
        if (input.isPrimary) {
          await this.repo.clearPrimaryGuardian(input.studentId, tx);
        }

        return this.repo.createStudentGuardianLink({ ...input, tenantId }, tx);
      },
    );
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
      throw new BadRequestException(
        "Student not found or does not belong to the active tenant",
      );
    }
    if (student.status !== StudentStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot enroll a student with status '${student.status}'`,
      );
    }

    // AcademicYear: explicit tenantId filter (not in tenantScopedModels yet).
    const academicYear = await this.repo.findAcademicYear(
      input.academicYearId,
      tx,
    );
    if (!academicYear) {
      throw new BadRequestException(
        "AcademicYear not found or does not belong to the active tenant",
      );
    }
    if (academicYear.schoolId !== student.schoolId) {
      throw new BadRequestException(
        "AcademicYear does not belong to the student's school",
      );
    }

    // Class: explicit tenantId filter.
    const classEntity = await this.repo.findClass(input.classId, tx);
    if (!classEntity) {
      throw new BadRequestException(
        "Class not found or does not belong to the active tenant",
      );
    }
    if (classEntity.schoolId !== student.schoolId) {
      throw new BadRequestException(
        "Class does not belong to the student's school",
      );
    }

    if (input.armId) {
      const arm = await this.repo.findArm(input.armId, tx);
      if (!arm) {
        throw new BadRequestException(
          "Arm not found or does not belong to the active tenant",
        );
      }
      if (arm.classId !== input.classId) {
        throw new BadRequestException(
          "Arm does not belong to the specified Class",
        );
      }
      if (arm.campusId !== input.campusId) {
        throw new BadRequestException(
          "Specified campusId does not match the arm's campus",
        );
      }
    }

    const school = await kernel.db.school.findUnique({
      where: { id: student.schoolId },
      include: { campuses: true }
    });

    if (school?.campuses && school.campuses.length > 1) {
      if (!input.campusId) {
        throw new BadRequestException("Campus context is strictly required for new enrollment in a multi-campus school. (Contract gap for internal callers lacking campus context)");
      }
    }

    if (input.campusId) {
      const campus = await kernel.db.campus.findUnique({ where: { id: input.campusId } });
      if (!campus || campus.schoolId !== student.schoolId) {
        throw new BadRequestException("Campus not found or does not belong to the school");
      }
    }

    // Friendly pre-check before hitting the DB partial index.
    const existingActive = await this.repo.findActiveEnrollment(
      input.studentId,
      input.academicYearId,
      tx,
    );
    if (existingActive) {
      throw new ConflictException(
        "Student already has an ACTIVE enrollment for this academic year",
      );
    }

    // Create enrollment — DB partial index enforces uniqueness against races.
    try {
      return await this.repo.createEnrollment(
        {
          tenantId,
          studentId: input.studentId,
          schoolId: student.schoolId,
          academicYearId: input.academicYearId,
          classId: input.classId,
          campusId: input.campusId,
          armId: input.armId,
        },
        tx,
      );
    } catch (err: unknown) {
      // PostgreSQL unique_violation on the partial index (race condition).
      const code = (err as { code?: string })?.code;
      if (code === "P2002") {
        throw new ConflictException(
          "Student already has an ACTIVE enrollment for this academic year (concurrent request)",
        );
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
      throw new BadRequestException(
        "Enrollment not found or does not belong to the active tenant",
      );
    }
    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new BadRequestException(
        "Only ACTIVE enrollments can be transferred",
      );
    }

    const newClass = await this.repo.findClass(input.newClassId);
    if (!newClass) {
      throw new BadRequestException(
        "Target Class not found or does not belong to the active tenant",
      );
    }
    if (newClass.schoolId !== enrollment.schoolId) {
      throw new BadRequestException(
        "Target Class does not belong to the enrollment's school",
      );
    }

    if (input.newArmId) {
      const arm = await this.repo.findArm(input.newArmId);
      if (!arm) {
        throw new BadRequestException(
          "Target Arm not found or does not belong to the active tenant",
        );
      }
      if (arm.classId !== input.newClassId) {
        throw new BadRequestException(
          "Target Arm does not belong to the target Class",
        );
      }
      if (arm.campusId !== input.newCampusId) {
        throw new BadRequestException(
          "Specified newCampusId does not match the arm's campus",
        );
      }
    }

    const school = await kernel.db.school.findUnique({
      where: { id: enrollment.schoolId },
      include: { campuses: true }
    });

    if (school?.campuses && school.campuses.length > 1) {
      if (!input.newCampusId) {
        throw new BadRequestException("Campus context is strictly required for enrollment transfer in a multi-campus school");
      }
    }

    if (input.newCampusId) {
      const campus = await kernel.db.campus.findUnique({ where: { id: input.newCampusId } });
      if (!campus || campus.schoolId !== enrollment.schoolId) {
        throw new BadRequestException("Campus not found or does not belong to the school");
      }
    }

    return this.repo.transferEnrollment(
      input.enrollmentId,
      input.newClassId,
      input.newCampusId,
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
      throw new BadRequestException(
        "Enrollment not found or does not belong to the active tenant",
      );
    }
    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new BadRequestException("Only ACTIVE enrollments can be withdrawn");
    }

    const student = await this.repo.findStudent(input.studentId);
    if (!student) {
      throw new BadRequestException(
        "Student not found or does not belong to the active tenant",
      );
    }
    if (enrollment.studentId !== input.studentId) {
      throw new BadRequestException(
        "Enrollment does not belong to the specified student",
      );
    }

    await this.repo.withdrawEnrollment(input.enrollmentId, input.notes);
    await this.repo.setStudentStatus(input.studentId, "WITHDRAWN");

    return { message: "Student withdrawn successfully" };
  }

  // ─── Read Operations ───────────────────────────────────────────────────────

  async listStudents(schoolId?: string, campusId?: string, search?: string) {
    return this.repo.listStudents(schoolId, campusId, search);
  }

  async getStudent(studentId: string) {
    const student = await this.repo.findStudent(studentId);
    if (!student) {
      throw new BadRequestException(
        "Student not found or does not belong to the active tenant",
      );
    }
    return student;
  }

  async listEnrollments(studentId: string) {
    // Verify student belongs to active tenant before listing enrollments.
    const student = await this.repo.findStudent(studentId);
    if (!student) {
      throw new BadRequestException(
        "Student not found or does not belong to the active tenant",
      );
    }
    return this.repo.listEnrollments(studentId);
  }

  async listStudentGuardians(studentId: string) {
    const student = await this.repo.findStudent(studentId);
    if (!student) {
      throw new BadRequestException(
        "Student not found or does not belong to the active tenant",
      );
    }
    return this.repo.listStudentGuardians(studentId);
  }

  async listGuardians(schoolId?: string, roleId?: string, search?: string) {
    const tenantId = this.getActiveTenantId();

    if (!schoolId) {
      if (!roleId) {
        throw new ForbiddenException(
          "Tenant-wide listing requires explicitly authorized role",
        );
      }
      const role =
        await require("@saas/core-platform").kernel.db.role.findUnique({
          where: { id: roleId },
        });
      if (!role || role.name !== "SUPER_ADMIN" || role.tenantId !== tenantId) {
        throw new ForbiddenException(
          "Tenant-wide listing requires SUPER_ADMIN role",
        );
      }
    }

    return this.repo.listGuardians(schoolId, search);
  }

  // ─── Student Photo ─────────────────────────────────────────────────────────

  async uploadStudentPhoto(studentId: string, file: Express.Multer.File, schoolId: string) {
    const tenantId = this.getActiveTenantId();

    const student = await this.repo.findStudent(studentId);
    if (!student || student.schoolId !== schoolId) {
      throw new ForbiddenException("Not authorized to modify this student");
    }

    // Dynamic import file-type to validate actual magic numbers
    const fileType = await import('file-type');
    const type = await (fileType.default || fileType as any).fromBuffer(file.buffer);
    if (!type || !['image/jpeg', 'image/png'].includes(type.mime)) {
      throw new BadRequestException("Invalid or unsupported file type. Must be JPEG or PNG.");
    }
    
    // Strip EXIF data? We'll rely on the client or advanced processing if needed. 
    // Minimum requirement: validate MIME type from actual buffer.

    // Upsert the photo
    const photo = await kernel.db.studentPhoto.upsert({
      where: { studentId },
      create: {
        tenantId,
        schoolId,
        studentId,
        mimeType: type.mime,
        data: file.buffer,
      },
      update: {
        mimeType: type.mime,
        data: file.buffer,
      },
    });

    return { id: photo.id, mimeType: photo.mimeType, updatedAt: photo.updatedAt };
  }

  async getStudentPhoto(studentId: string) {
    const tenantId = this.getActiveTenantId();
    
    // We must ensure the student belongs to the active tenant
    const student = await kernel.db.student.findFirst({
      where: { id: studentId, tenantId },
      select: { id: true },
    });

    if (!student) {
      throw new ForbiddenException("Not authorized to access this student photo");
    }

    const photo = await kernel.db.studentPhoto.findUnique({
      where: { studentId },
    });

    if (!photo) {
      return null;
    }

    return photo;
  }

  async deleteStudentPhoto(studentId: string, schoolId: string) {
    const tenantId = this.getActiveTenantId();

    const student = await this.repo.findStudent(studentId);
    if (!student || student.schoolId !== schoolId) {
      throw new ForbiddenException("Not authorized to modify this student");
    }

    await kernel.db.studentPhoto.delete({
      where: { studentId },
    }).catch(() => null);

    return { success: true };
  }
}
