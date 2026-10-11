import {
  Injectable,
  BadRequestException,
  NotFoundException,
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
import * as argon2 from "argon2";

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

  // ─── Student Creation & Management ─────────────────────────────────────────

  async createStudent(input: CreateStudentInput) {
    const tenantId = this.getActiveTenantId();

    const school = await this.repo.findSchool(input.schoolId);
    if (!school || school.tenantId !== tenantId) {
      throw new BadRequestException(
        "School not found or does not belong to the active tenant",
      );
    }

    // Authoritative campus resolution
    let campusId = input.campusId;
    if (!campusId) {
      const campuses = await kernel.db.campus.findMany({
        where: { schoolId: input.schoolId },
      });
      if (campuses.length === 1) {
        campusId = campuses[0].id;
      } else if (campuses.length > 1) {
        throw new BadRequestException(
          "Campus context is required for student creation in a multi-campus school",
        );
      } else {
        throw new BadRequestException("No campus configured for this school");
      }
    } else {
      const campus = await this.repo.findCampus(campusId);
      if (!campus || campus.schoolId !== input.schoolId || campus.tenantId !== tenantId) {
        throw new BadRequestException("Campus does not belong to the active school");
      }
    }

    const admissionNumber =
      input.admissionNumber || (await this.repo.mintStudentNumber(input.schoolId));

    return this.repo.createStudent({
      ...input,
      campusId,
      admissionNumber,
    });
  }

  async updateStudent(studentId: string, input: any) {
    const student = await this.repo.findStudent(studentId);
    if (!student) {
      throw new NotFoundException("Student not found");
    }
    return this.repo.updateStudent(studentId, input);
  }

  async getStudent(studentId: string) {
    const student = await this.repo.findStudent(studentId);
    if (!student) {
      throw new NotFoundException("Student not found");
    }
    return student;
  }

  async listStudents(
    schoolId?: string,
    campusId?: string,
    search?: string,
    academicYearId?: string,
    classId?: string,
    armId?: string,
  ) {
    return this.repo.listStudents(
      schoolId,
      campusId,
      search,
      academicYearId,
      classId,
      armId,
    );
  }

  // ─── Guardian Management ───────────────────────────────────────────────────

  async createGuardian(input: CreateGuardianInput) {
    const tenantId = this.getActiveTenantId();

    // Check if user already exists
    const email = input.email ? input.email.toLowerCase().trim() : null;
    let userId: string;

    if (email) {
      const existingUser = await kernel.db.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        userId = existingUser.id;
        // Verify if user already has a guardian profile
        const existingGuardian = await kernel.db.guardian.findUnique({
          where: { userId },
        });
        if (existingGuardian) {
          throw new ConflictException(
            "A guardian profile already exists for this email address",
          );
        }
      } else {
        const dummyHash = await argon2.hash("TempPass123!");
        const newUser = await kernel.db.user.create({
          data: {
            email,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone || null,
            passwordHash: dummyHash,
          },
        });
        userId = newUser.id;
      }
    } else {
      const randomEmail = `guardian-${Date.now()}-${Math.floor(Math.random() * 10000)}@tenant.schoolos.internal`;
      const dummyHash = await argon2.hash("TempPass123!");
      const newUser = await kernel.db.user.create({
        data: {
          email: randomEmail,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone || null,
          passwordHash: dummyHash,
        },
      });
      userId = newUser.id;
    }

    return this.repo.createGuardian({
      ...input,
      userId,
    });
  }

  async updateGuardian(guardianId: string, input: any) {
    const guardian = await this.repo.findGuardian(guardianId);
    if (!guardian) {
      throw new NotFoundException("Guardian not found");
    }
    return this.repo.updateGuardian(guardianId, input);
  }

  async listGuardians(schoolId?: string, roleId?: string, search?: string) {
    return this.repo.listGuardians(schoolId, search);
  }

  async linkGuardian(input: LinkGuardianInput & { schoolId?: string; roleId?: string }) {
    const tenantId = this.getActiveTenantId();

    const student = await this.repo.findStudent(input.studentId);
    if (!student || student.tenantId !== tenantId) {
      throw new BadRequestException(
        "Student not found or does not belong to the active tenant",
      );
    }

    if (input.schoolId && student.schoolId !== input.schoolId) {
      throw new BadRequestException(
        "Student does not belong to the active school",
      );
    }

    const guardian = await this.repo.findGuardian(input.guardianId);
    if (!guardian || guardian.tenantId !== tenantId) {
      throw new BadRequestException(
        "Guardian not found or does not belong to the active tenant",
      );
    }

    const existing = await this.repo.findStudentGuardianLink(
      input.studentId,
      input.guardianId,
    );
    if (existing) {
      throw new ConflictException("Guardian is already linked to this student");
    }

    if (input.isPrimary) {
      await this.repo.clearPrimaryGuardian(input.studentId);
    }

    return this.repo.createStudentGuardianLink({
      studentId: input.studentId,
      guardianId: input.guardianId,
      relationship: input.relationship,
      isPrimary: input.isPrimary,
      canPickup: input.canPickup,
    });
  }

  async listStudentGuardians(studentId: string) {
    const student = await this.repo.findStudent(studentId);
    if (!student) {
      throw new NotFoundException("Student not found");
    }
    return this.repo.listStudentGuardians(studentId);
  }

  // ─── Enrollment Management ─────────────────────────────────────────────────

  async createEnrollment(input: CreateEnrollmentInput & { campusId?: string | null }) {
    const tenantId = this.getActiveTenantId();

    const student = await this.repo.findStudent(input.studentId);
    if (!student || student.tenantId !== tenantId) {
      throw new BadRequestException(
        "Student not found or does not belong to the active tenant",
      );
    }

    if (student.status !== StudentStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot enroll a student with status '${student.status}'`,
      );
    }

    const year = await this.repo.findAcademicYear(input.academicYearId);
    if (!year || year.schoolId !== student.schoolId || year.tenantId !== tenantId) {
      throw new BadRequestException(
        "Academic Year not found or does not belong to the student's school",
      );
    }

    const cls = await this.repo.findClass(input.classId);
    if (!cls || cls.schoolId !== student.schoolId || cls.tenantId !== tenantId) {
      throw new BadRequestException(
        "Class not found or does not belong to the student's school",
      );
    }

    // Campus consistency validation
    if (cls.campusId && cls.campusId !== student.campusId) {
      throw new BadRequestException(
        "Class campus does not match student assigned campus",
      );
    }

    const arm = await this.repo.findArm(input.armId);
    if (!arm || arm.classId !== input.classId || arm.tenantId !== tenantId) {
      throw new BadRequestException("Arm does not belong to the specified Class");
    }

    const existingActive = await this.repo.findActiveEnrollment(
      input.studentId,
      input.academicYearId,
    );
    if (existingActive) {
      throw new ConflictException(
        "Student already has an active enrollment for this academic year",
      );
    }

    return this.repo.createEnrollment({
      studentId: input.studentId,
      academicYearId: input.academicYearId,
      classId: input.classId,
      armId: input.armId,
    });
  }

  async listEnrollments(studentId: string) {
    const student = await this.repo.findStudent(studentId);
    if (!student) {
      throw new NotFoundException("Student not found");
    }
    return this.repo.listEnrollments(studentId);
  }

  async transferEnrollment(input: {
    enrollmentId: string;
    newClassId: string;
    newArmId?: string;
    newCampusId?: string | null;
    notes?: string;
  }) {
    const tenantId = this.getActiveTenantId();

    const enrollment = await this.repo.findEnrollment(input.enrollmentId);
    if (!enrollment || enrollment.tenantId !== tenantId) {
      throw new NotFoundException("Enrollment not found");
    }

    if (enrollment.status !== EnrollmentStatus.ENROLLED) {
      throw new BadRequestException("Only ENROLLED records can be transferred");
    }

    const student = await this.repo.findStudent(enrollment.studentId);
    if (!student || student.tenantId !== tenantId) {
      throw new NotFoundException("Student not found");
    }

    const newClass = await this.repo.findClass(input.newClassId);
    if (!newClass || newClass.schoolId !== student.schoolId || newClass.tenantId !== tenantId) {
      throw new BadRequestException(
        "Target class does not belong to the student's school",
      );
    }

    if (newClass.campusId && newClass.campusId !== student.campusId) {
      throw new BadRequestException(
        "Target class campus does not match student assigned campus",
      );
    }

    if (!input.newArmId) {
      throw new BadRequestException("Target arm is required for transfer");
    }

    const newArm = await this.repo.findArm(input.newArmId);
    if (!newArm || newArm.classId !== input.newClassId || newArm.tenantId !== tenantId) {
      throw new BadRequestException("Target arm does not belong to the target class");
    }

    return this.repo.transferEnrollment(
      input.enrollmentId,
      enrollment.studentId,
      enrollment.academicYearId,
      input.newClassId,
      input.newArmId,
    );
  }

  async withdrawStudent(input: WithdrawStudentInput) {
    const tenantId = this.getActiveTenantId();

    const enrollment = await this.repo.findEnrollment(input.enrollmentId);
    if (!enrollment || enrollment.tenantId !== tenantId) {
      throw new NotFoundException("Enrollment not found");
    }

    if (enrollment.studentId !== input.studentId) {
      throw new BadRequestException(
        "Enrollment does not belong to the specified student",
      );
    }

    if (enrollment.status !== EnrollmentStatus.ENROLLED) {
      throw new BadRequestException("Only ENROLLED records can be withdrawn");
    }

    await this.repo.withdrawEnrollment(input.enrollmentId);
    await this.repo.setStudentStatus(input.studentId, StudentStatus.INACTIVE);

    return { message: "Student withdrawn successfully" };
  }
}
