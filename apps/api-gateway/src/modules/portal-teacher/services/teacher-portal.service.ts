import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { kernel, tenantContext } from "@saas/core-platform";
import { UpdateTeacherProfileDto, TeacherDashboardDto } from "../dto/teacher-portal.dto";

@Injectable()
export class TeacherPortalService {
  /**
   * Authoritatively resolves the authenticated user's StaffProfile within their active workspace.
   */
  async resolveTeacher(userId: string) {
    const store = tenantContext.getStore();
    const tenantId = store?.tenantId;

    const staff = await kernel.db.staffProfile.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        school: true,
        photo: { select: { id: true } },
      },
    });

    if (!staff) {
      throw new ForbiddenException("Not authorized as an active teacher profile in this workspace");
    }

    return staff;
  }

  async getProfile(userId: string) {
    const staff = await this.resolveTeacher(userId);
    const hasPhoto = !!staff.photo;
    const photoUrl = hasPhoto ? `/api/v1/portal/teacher/profile/photo` : null;

    return {
      id: staff.id,
      staffNumber: staff.staffNumber,
      firstName: staff.firstName,
      lastName: staff.lastName,
      middleName: staff.middleName,
      email: staff.email,
      phone: staff.phone,
      designation: staff.designation,
      type: staff.type,
      joiningDate: staff.joiningDate,
      schoolId: staff.schoolId,
      schoolName: staff.school?.name || "SchoolOS",
      tenantId: staff.tenantId,
      hasPhoto,
      photoUrl,
    };
  }

  async updateProfile(userId: string, dto: UpdateTeacherProfileDto) {
    const staff = await this.resolveTeacher(userId);

    const updated = await kernel.db.staffProfile.update({
      where: { id: staff.id },
      data: {
        phone: dto.phone,
      },
      include: {
        photo: { select: { id: true } },
      },
    });

    return this.getProfile(userId);
  }

  async uploadPhoto(userId: string, file: Express.Multer.File) {
    const staff = await this.resolveTeacher(userId);

    const fileType = await import("file-type");
    const type = await (fileType.default || (fileType as any)).fromBuffer(file.buffer);
    if (!type || !["image/jpeg", "image/png", "image/webp"].includes(type.mime)) {
      throw new BadRequestException("Invalid or unsupported file type. Must be JPEG, PNG, or WebP.");
    }

    const photo = await kernel.db.staffPhoto.upsert({
      where: { staffId: staff.id },
      create: {
        tenantId: staff.tenantId,
        schoolId: staff.schoolId,
        staffId: staff.id,
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

  async getPhoto(userId: string) {
    const staff = await this.resolveTeacher(userId);

    const photo = await kernel.db.staffPhoto.findUnique({
      where: { staffId: staff.id },
    });

    if (!photo) {
      return null;
    }

    return photo;
  }

  async deletePhoto(userId: string) {
    const staff = await this.resolveTeacher(userId);

    await kernel.db.staffPhoto.delete({
      where: { staffId: staff.id },
    }).catch(() => null);

    return { success: true, message: "Profile photo removed successfully." };
  }

  async getDashboard(userId: string): Promise<TeacherDashboardDto> {
    const staff = await this.resolveTeacher(userId);

    // Get timetable entries for this teacher
    const timetableEntries = await kernel.db.timetableEntry.findMany({
      where: {
        teacherId: staff.id,
        tenantId: staff.tenantId,
        schoolId: staff.schoolId,
      },
      include: {
        class: true,
        arm: true,
        subject: true,
        period: true,
      },
      orderBy: {
        period: { startTime: "asc" },
      },
    });

    // Determine current day of week
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const currentDayStr = days[new Date().getDay()];

    const todaySchedule = timetableEntries
      .filter((e) => e.dayOfWeek === currentDayStr)
      .map((e) => ({
        periodId: e.periodId,
        periodName: e.period.name,
        startTime: e.period.startTime,
        endTime: e.period.endTime,
        className: e.class.name,
        armName: e.arm?.name,
        subjectName: e.subject.name,
        dayOfWeek: e.dayOfWeek,
      }));

    // Calculate unique classes
    const uniqueClassIds = Array.from(new Set(timetableEntries.map((e) => e.classId)));

    // Total students across teacher's assigned classes
    let totalStudentsCount = 0;
    if (uniqueClassIds.length > 0) {
      totalStudentsCount = await kernel.db.student.count({
        where: {
          tenantId: staff.tenantId,
          schoolId: staff.schoolId,
          status: "ACTIVE",
          enrollments: {
            some: {
              classId: { in: uniqueClassIds },
            },
          },
        },
      });
    }

    const hasPhoto = !!staff.photo;
    const photoUrl = hasPhoto ? `/api/v1/portal/teacher/profile/photo` : null;

    return {
      teacherName: `${staff.firstName} ${staff.lastName}`,
      staffNumber: staff.staffNumber,
      designation: staff.designation || "Teacher",
      hasPhoto,
      photoUrl,
      assignedClassesCount: uniqueClassIds.length,
      todayPeriodsCount: todaySchedule.length,
      totalStudentsCount,
      todaySchedule,
    };
  }

  async getTimetable(userId: string) {
    const staff = await this.resolveTeacher(userId);

    const entries = await kernel.db.timetableEntry.findMany({
      where: {
        teacherId: staff.id,
        tenantId: staff.tenantId,
        schoolId: staff.schoolId,
      },
      include: {
        class: true,
        arm: true,
        subject: true,
        period: true,
        academicYear: true,
        term: true,
      },
      orderBy: [
        { dayOfWeek: "asc" },
        { period: { startTime: "asc" } },
      ],
    });

    return entries.map((e) => ({
      id: e.id,
      dayOfWeek: e.dayOfWeek,
      periodName: e.period.name,
      startTime: e.period.startTime,
      endTime: e.period.endTime,
      className: e.class.name,
      classId: e.classId,
      armName: e.arm?.name,
      armId: e.armId,
      subjectName: e.subject.name,
      subjectId: e.subjectId,
      termName: e.term.name,
      academicYearName: e.academicYear.name,
    }));
  }

  async getClasses(userId: string) {
    const staff = await this.resolveTeacher(userId);

    const entries = await kernel.db.timetableEntry.findMany({
      where: {
        teacherId: staff.id,
        tenantId: staff.tenantId,
        schoolId: staff.schoolId,
      },
      include: {
        class: true,
        arm: true,
        subject: true,
      },
    });

    // Group by class and arm
    const classMap = new Map<string, {
      classId: string;
      className: string;
      armId?: string;
      armName?: string;
      subjects: Set<string>;
    }>();

    for (const e of entries) {
      const key = `${e.classId}_${e.armId || "none"}`;
      if (!classMap.has(key)) {
        classMap.set(key, {
          classId: e.classId,
          className: e.class.name,
          armId: e.armId || undefined,
          armName: e.arm?.name,
          subjects: new Set(),
        });
      }
      classMap.get(key)!.subjects.add(e.subject.name);
    }

    const classesList = Array.from(classMap.values()).map((c) => ({
      classId: c.classId,
      className: c.className,
      armId: c.armId,
      armName: c.armName,
      subjects: Array.from(c.subjects),
    }));

    return classesList;
  }

  async getStudentsForClass(userId: string, classId: string, armId?: string) {
    const staff = await this.resolveTeacher(userId);

    // Verify teacher is assigned to this class/arm
    const assignment = await kernel.db.timetableEntry.findFirst({
      where: {
        teacherId: staff.id,
        tenantId: staff.tenantId,
        schoolId: staff.schoolId,
        classId,
        ...(armId ? { armId } : {}),
      },
    });

    if (!assignment) {
      throw new ForbiddenException("You are not assigned to teach this class or arm");
    }

    const students = await kernel.db.student.findMany({
      where: {
        tenantId: staff.tenantId,
        schoolId: staff.schoolId,
        status: "ACTIVE",
        enrollments: {
          some: {
            classId,
            ...(armId ? { armId } : {}),
          },
        },
      },
      include: {
        enrollments: {
          include: { arm: true },
        },
        photo: { select: { id: true } },
      },
      orderBy: [
        { lastName: "asc" },
        { firstName: "asc" },
      ],
    });

    return students.map((s) => ({
      id: s.id,
      studentNumber: s.studentNumber,
      firstName: s.firstName,
      lastName: s.lastName,
      middleName: s.middleName,
      gender: s.gender,
      armName: s.enrollments[0]?.arm?.name,
      hasPhoto: !!s.photo,
      photoUrl: s.photo ? `/api/v1/students/${s.id}/photo` : null,
    }));
  }
}
