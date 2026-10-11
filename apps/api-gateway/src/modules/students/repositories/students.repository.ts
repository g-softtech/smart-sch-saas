import { Injectable } from "@nestjs/common";
import { kernel, tenantContext, EnrollmentStatus, StudentStatus, StaffStatus } from "@saas/core-platform";
import { Prisma } from "@saas/core-platform";

export type CreateStudentInput = {
  schoolId: string;
  campusId: string;
  admissionNumber?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dob?: Date;
  gender: "MALE" | "FEMALE" | "OTHER";
  enrolledAt?: Date;
  email?: string;
};

export type UpdateStudentInput = {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dob?: Date;
  gender?: "MALE" | "FEMALE" | "OTHER";
  email?: string;
  status?: StudentStatus;
};

export type CreateGuardianInput = {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  relationship: string;
  address?: string;
  occupation?: string;
};

export type UpdateGuardianInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  relationship?: string;
  address?: string;
  occupation?: string;
};

export type LinkGuardianInput = {
  studentId: string;
  guardianId: string;
  relationship?: string;
  isPrimary?: boolean;
  canPickup?: boolean;
};

export type CreateEnrollmentInput = {
  studentId: string;
  academicYearId: string;
  classId: string;
  armId: string;
};

export type TransferEnrollmentInput = {
  enrollmentId: string;
  studentId: string;
  academicYearId: string;
  newClassId: string;
  newArmId: string;
  notes?: string;
};

export type WithdrawStudentInput = {
  studentId: string;
  enrollmentId: string;
  notes?: string;
};

@Injectable()
export class StudentsRepository {
  // ─── Lookups ─────────────────────────────────────────────────────────────

  async findSchool(schoolId: string) {
    return kernel.db.school.findUnique({ where: { id: schoolId } });
  }

  async findCampus(campusId: string) {
    return kernel.db.campus.findUnique({ where: { id: campusId } });
  }

  async findAcademicYear(academicYearId: string) {
    return kernel.db.academicYear.findUnique({ where: { id: academicYearId } });
  }

  async findClass(classId: string) {
    return kernel.db.class.findUnique({ where: { id: classId } });
  }

  async findArm(armId: string) {
    return kernel.db.arm.findUnique({ where: { id: armId } });
  }

  async findStudent(studentId: string) {
    const student = await kernel.db.student.findUnique({
      where: { id: studentId },
      include: {
        school: true,
        campus: true,
        user: true,
        enrollments: {
          include: {
            academicYear: true,
            class: true,
            arm: true,
          },
          orderBy: { enrolledAt: "desc" },
        },
        guardians: {
          include: {
            guardian: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!student) return null;

    // Attach studentNumber alias for frontend backwards compatibility
    return {
      ...student,
      studentNumber: student.admissionNumber,
      dateOfBirth: student.dob,
      admissionDate: student.enrolledAt,
    };
  }

  async findGuardian(guardianId: string) {
    const guardian = await kernel.db.guardian.findUnique({
      where: { id: guardianId },
      include: {
        user: true,
        students: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!guardian) return null;

    return {
      ...guardian,
      firstName: guardian.user?.firstName || "",
      lastName: guardian.user?.lastName || "",
      email: guardian.user?.email || null,
      phone: guardian.user?.phone || null,
    };
  }

  async findActiveEnrollment(studentId: string, academicYearId: string) {
    return kernel.db.enrollment.findFirst({
      where: {
        studentId,
        academicYearId,
        status: EnrollmentStatus.ENROLLED,
      },
    });
  }

  async findEnrollment(enrollmentId: string) {
    return kernel.db.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        academicYear: true,
        class: true,
        arm: true,
      },
    });
  }

  async findStudentGuardianLink(studentId: string, guardianId: string) {
    return kernel.db.studentGuardian.findUnique({
      where: {
        studentId_guardianId: { studentId, guardianId },
      },
    });
  }

  async findPrimaryGuardian(studentId: string) {
    return kernel.db.studentGuardian.findFirst({
      where: { studentId, isPrimary: true },
    });
  }

  // ─── Mutations ───────────────────────────────────────────────────────────

  async mintStudentNumber(schoolId: string): Promise<string> {
    const count = await kernel.db.student.count({
      where: { schoolId },
    });
    const nextSeq = count + 1;
    return `STU-${String(nextSeq).padStart(5, "0")}`;
  }

  async createStudent(data: CreateStudentInput & { admissionNumber: string }) {
    const student: any = await (kernel.db.student.create as any)({
      data: {
        schoolId: data.schoolId,
        campusId: data.campusId,
        admissionNumber: data.admissionNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || null,
        gender: data.gender,
        dob: data.dob || new Date("2010-01-01"),
        enrolledAt: data.enrolledAt || new Date(),
        status: StudentStatus.ACTIVE,
      },
      include: {
        campus: true,
        school: true,
      },
    });

    return {
      ...student,
      studentNumber: student.admissionNumber,
      dateOfBirth: student.dob,
      admissionDate: student.enrolledAt,
    };
  }

  async updateStudent(studentId: string, data: UpdateStudentInput) {
    const updated = await kernel.db.student.update({
      where: { id: studentId },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.middleName !== undefined && { middleName: data.middleName }),
        ...(data.dob !== undefined && { dob: data.dob }),
        ...(data.gender && { gender: data.gender }),
        ...(data.status && { status: data.status }),
      },
      include: {
        school: true,
        campus: true,
      },
    });

    return {
      ...updated,
      studentNumber: updated.admissionNumber,
      dateOfBirth: updated.dob,
      admissionDate: updated.enrolledAt,
    };
  }

  async createGuardian(data: CreateGuardianInput & { userId: string }) {
    const guardian: any = await (kernel.db.guardian.create as any)({
      data: {
        userId: data.userId,
        relationship: data.relationship || "Guardian",
        occupation: data.occupation || null,
        address: data.address || null,
      },
      include: {
        user: true,
      },
    });

    return {
      ...guardian,
      firstName: guardian.user.firstName,
      lastName: guardian.user.lastName,
      email: guardian.user.email,
      phone: guardian.user.phone,
    };
  }

  async updateGuardian(guardianId: string, data: UpdateGuardianInput) {
    const guardian = await kernel.db.guardian.findUnique({
      where: { id: guardianId },
      include: { user: true },
    });

    if (!guardian) return null;

    if (data.firstName || data.lastName || data.phone || data.email) {
      await kernel.db.user.update({
        where: { id: guardian.userId },
        data: {
          ...(data.firstName && { firstName: data.firstName }),
          ...(data.lastName && { lastName: data.lastName }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.email && { email: data.email.toLowerCase().trim() }),
        },
      });
    }

    const updatedGuardian = await kernel.db.guardian.update({
      where: { id: guardianId },
      data: {
        ...(data.relationship && { relationship: data.relationship }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.occupation !== undefined && { occupation: data.occupation }),
      },
      include: { user: true },
    });

    return {
      ...updatedGuardian,
      firstName: updatedGuardian.user.firstName,
      lastName: updatedGuardian.user.lastName,
      email: updatedGuardian.user.email,
      phone: updatedGuardian.user.phone,
    };
  }

  async createStudentGuardianLink(data: LinkGuardianInput) {
    return kernel.db.studentGuardian.create({
      data: {
        studentId: data.studentId,
        guardianId: data.guardianId,
        isPrimary: data.isPrimary ?? false,
        canPickup: data.canPickup ?? true,
      },
      include: {
        guardian: {
          include: { user: true },
        },
      },
    });
  }

  async clearPrimaryGuardian(studentId: string) {
    return kernel.db.studentGuardian.updateMany({
      where: { studentId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  async createEnrollment(data: CreateEnrollmentInput) {
    return (kernel.db.enrollment.create as any)({
      data: {
        studentId: data.studentId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        armId: data.armId,
        status: EnrollmentStatus.ENROLLED,
      },
      include: {
        academicYear: true,
        class: true,
        arm: true,
      },
    });
  }

  async transferEnrollment(
    enrollmentId: string,
    studentId: string,
    academicYearId: string,
    newClassId: string,
    newArmId: string,
  ) {
    return kernel.db.enrollment.update({
      where: { id: enrollmentId },
      data: {
        classId: newClassId,
        armId: newArmId,
        status: EnrollmentStatus.ENROLLED,
      },
      include: {
        academicYear: true,
        class: true,
        arm: true,
      },
    });
  }

  async withdrawEnrollment(enrollmentId: string) {
    return kernel.db.enrollment.update({
      where: { id: enrollmentId },
      data: { status: EnrollmentStatus.WITHDRAWN },
    });
  }

  async setStudentStatus(studentId: string, status: StudentStatus) {
    return kernel.db.student.update({
      where: { id: studentId },
      data: { status },
    });
  }

  async listStudents(
    schoolId?: string,
    campusId?: string,
    search?: string,
    academicYearId?: string,
    classId?: string,
    armId?: string,
  ) {
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;
    if (campusId) where.campusId = campusId;

    if (academicYearId || classId || armId) {
      where.enrollments = {
        some: {
          status: EnrollmentStatus.ENROLLED,
          ...(academicYearId && { academicYearId }),
          ...(classId && { classId }),
          ...(armId && { armId }),
        },
      };
    }

    if (search) {
      const term = search.trim();
      where.OR = [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { admissionNumber: { contains: term, mode: "insensitive" } },
      ];
    }

    const students = await kernel.db.student.findMany({
      where,
      include: {
        school: true,
        campus: true,
        enrollments: {
          where: { status: EnrollmentStatus.ENROLLED },
          include: {
            academicYear: true,
            class: true,
            arm: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return students.map((s) => ({
      ...s,
      studentNumber: s.admissionNumber,
      dateOfBirth: s.dob,
      admissionDate: s.enrolledAt,
    }));
  }

  async listEnrollments(studentId: string) {
    return kernel.db.enrollment.findMany({
      where: { studentId },
      include: {
        academicYear: true,
        class: true,
        arm: true,
      },
      orderBy: { enrolledAt: "desc" },
    });
  }

  async listStudentGuardians(studentId: string) {
    const links = await kernel.db.studentGuardian.findMany({
      where: { studentId },
      include: {
        guardian: {
          include: { user: true },
        },
      },
    });

    return links.map((link) => ({
      ...link,
      guardian: {
        ...link.guardian,
        firstName: link.guardian.user?.firstName || "",
        lastName: link.guardian.user?.lastName || "",
        email: link.guardian.user?.email || null,
        phone: link.guardian.user?.phone || null,
      },
    }));
  }

  async listGuardians(schoolId?: string, search?: string) {
    const where: any = {};

    if (search) {
      const term = search.trim();
      where.user = {
        OR: [
          { firstName: { contains: term, mode: "insensitive" } },
          { lastName: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
          { phone: { contains: term, mode: "insensitive" } },
        ],
      };
    }

    const guardians = await kernel.db.guardian.findMany({
      where,
      include: {
        user: true,
        students: {
          include: {
            student: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return guardians.map((g) => ({
      ...g,
      firstName: g.user?.firstName || "",
      lastName: g.user?.lastName || "",
      email: g.user?.email || null,
      phone: g.user?.phone || null,
    }));
  }
}
