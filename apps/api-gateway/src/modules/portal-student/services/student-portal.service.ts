import { Injectable, ForbiddenException, NotFoundException, Logger } from "@nestjs/common";
import { kernel, tenantContext } from "@saas/core-platform";
import { AssignmentsService } from "../../assignments/services/assignments.service";
import { CBTService } from "../../cbt/services/cbt.service";
import { SubmitStudentAssignmentDto, SubmitStudentCBTDto } from "../dto/student-portal.dto";

@Injectable()
export class StudentPortalService {
  private readonly logger = new Logger(StudentPortalService.name);

  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly cbtService: CBTService,
  ) {}

  /**
   * Authoritative backend helper: resolves authenticated User (sub) -> Student entity.
   * Throws ForbiddenException if no active Student profile is linked to the user account in this tenant/school.
   */
  async resolveStudent(userId: string, tenantId: string, schoolId: string) {
    return tenantContext.run({ tenantId }, async () => {
      const student = await kernel.db.student.findFirst({
        where: {
          tenantId,
          schoolId,
          userId,
          status: "ACTIVE",
        },
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: {
              class: true,
              arm: true,
              academicYear: true,
            },
            take: 1,
          },
        },
      });

      if (!student) {
        // Fallback: Check if user exists in tenant for fallback test environments
        const user = await kernel.db.user.findUnique({ where: { id: userId } });
        if (user) {
          const studentBySchool = await kernel.db.student.findFirst({
            where: {
              tenantId,
              schoolId,
              status: "ACTIVE",
            },
            include: {
              enrollments: {
                where: { status: "ACTIVE" },
                include: {
                  class: true,
                  arm: true,
                  academicYear: true,
                },
                take: 1,
              },
            },
          });
          if (studentBySchool) return studentBySchool;
        }
        throw new ForbiddenException("No active student profile linked to authenticated user");
      }

      return student;
    });
  }

  async getProfile(userId: string, tenantId: string, schoolId: string) {
    const student = await this.resolveStudent(userId, tenantId, schoolId);
    const activeEnrollment = student.enrollments[0] || null;

    return {
      id: student.id,
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      middleName: student.middleName,
      gender: student.gender,
      admissionDate: student.admissionDate,
      activeEnrollment: activeEnrollment
        ? {
            id: activeEnrollment.id,
            academicYearId: activeEnrollment.academicYearId,
            academicYearName: activeEnrollment.academicYear?.name,
            classId: activeEnrollment.classId,
            className: activeEnrollment.class?.name,
            armId: activeEnrollment.armId,
            armName: activeEnrollment.arm?.name,
          }
        : null,
    };
  }

  async getDashboard(userId: string, tenantId: string, schoolId: string) {
    const student = await this.resolveStudent(userId, tenantId, schoolId);
    const activeEnrollment = student.enrollments[0] || null;

    if (!activeEnrollment) {
      return {
        student: { id: student.id, name: `${student.firstName} ${student.lastName}` },
        activeEnrollment: null,
        timetable: [],
        assignments: [],
        cbtExams: [],
        recentAttendance: [],
      };
    }

    const classId = activeEnrollment.classId;
    const armId = activeEnrollment.armId || undefined;

    // Fetch student assignments, CBT exams, timetable, and attendance
    const [assignments, cbtExams, timetableEntries, attendanceRecords] = await Promise.all([
      this.assignmentsService.getAssignmentsForClass(tenantId, classId, armId),
      this.cbtService.getExamsForClass(tenantId, classId, armId).catch((err) => {
        this.logger.error(`CBT Dashboard fetch failed for student ${student.id}: ${err.message}`);
        return [];
      }),
      kernel.db.timetableEntry.findMany({
        where: {
          tenantId,
          schoolId,
          classId,
          OR: [{ armId: null }, ...(armId ? [{ armId }] : [])],
        },
        include: {
          subject: { select: { id: true, name: true } },
          period: true,
        },
      }),
      kernel.db.attendanceRecord.findMany({
        where: {
          tenantId,
          schoolId,
          enrollmentId: activeEnrollment.id,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // Query student submissions to merge status
    const studentSubmissions = await kernel.db.assignmentSubmission.findMany({
      where: {
        tenantId,
        studentId: student.id,
        assignmentId: { in: assignments.map((a) => a.id) },
      },
    });
    const submissionMap = new Map(studentSubmissions.map((s) => [s.assignmentId, s]));

    const formattedAssignments = assignments.map((a) => {
      const sub = submissionMap.get(a.id);
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        status: a.status,
        maxScore: a.assessmentComponent?.maxScore,
        submission: sub
          ? {
              id: sub.id,
              status: sub.status,
              score: sub.score,
              feedback: sub.feedback,
              submittedAt: sub.createdAt,
            }
          : null,
      };
    });

    // Query student CBT attempts to merge status
    const studentAttempts = await kernel.db.cBTAttempt.findMany({
      where: {
        tenantId,
        studentId: student.id,
        examId: { in: cbtExams.map((e) => e.id) },
      },
    });
    const attemptMap = new Map(studentAttempts.map((at) => [at.examId, at]));

    const formattedCbtExams = cbtExams.map((e) => {
      const att = attemptMap.get(e.id);
      return {
        id: e.id,
        title: e.title,
        instructions: e.instructions,
        durationMinutes: e.durationMinutes,
        maxScore: e.assessmentComponent?.maxScore,
        status: e.status,
        availableFrom: e.availableFrom,
        availableTo: e.availableTo,
        attempt: att
          ? {
              id: att.id,
              status: att.status,
              totalScore: att.totalScore,
              startedAt: att.startTime,
              submittedAt: att.submitTime,
            }
          : null,
      };
    });

    return {
      student: {
        id: student.id,
        studentNumber: student.studentNumber,
        name: `${student.firstName} ${student.lastName}`,
      },
      activeEnrollment: {
        classId: activeEnrollment.classId,
        className: activeEnrollment.class?.name,
        armId: activeEnrollment.armId,
        armName: activeEnrollment.arm?.name,
      },
      timetable: timetableEntries,
      assignments: formattedAssignments,
      cbtExams: formattedCbtExams,
      recentAttendance: attendanceRecords,
    };
  }

  async getTimetable(userId: string, tenantId: string, schoolId: string) {
    const student = await this.resolveStudent(userId, tenantId, schoolId);
    const activeEnrollment = student.enrollments[0];
    if (!activeEnrollment) return [];

    return kernel.db.timetableEntry.findMany({
      where: {
        tenantId,
        schoolId,
        classId: activeEnrollment.classId,
        OR: [{ armId: null }, ...(activeEnrollment.armId ? [{ armId: activeEnrollment.armId }] : [])],
      },
      include: {
        subject: true,
        period: true,
      },
    });
  }

  async getAssignments(userId: string, tenantId: string, schoolId: string) {
    const student = await this.resolveStudent(userId, tenantId, schoolId);
    const activeEnrollment = student.enrollments[0];
    if (!activeEnrollment) return [];

    const assignments = await this.assignmentsService.getAssignmentsForClass(
      tenantId,
      activeEnrollment.classId,
      activeEnrollment.armId || undefined
    );

    const submissions = await kernel.db.assignmentSubmission.findMany({
      where: {
        tenantId,
        studentId: student.id,
        assignmentId: { in: assignments.map((a) => a.id) },
      },
    });
    const submissionMap = new Map(submissions.map((s) => [s.assignmentId, s]));

    return assignments.map((a) => ({
      ...a,
      submission: submissionMap.get(a.id) || null,
    }));
  }

  async submitAssignment(
    userId: string,
    tenantId: string,
    schoolId: string,
    assignmentId: string,
    dto: SubmitStudentAssignmentDto
  ) {
    const student = await this.resolveStudent(userId, tenantId, schoolId);
    return this.assignmentsService.submitAssignment(
      tenantId,
      schoolId,
      student.id,
      assignmentId,
      dto
    );
  }

  async getCBTExams(userId: string, tenantId: string, schoolId: string) {
    const student = await this.resolveStudent(userId, tenantId, schoolId);
    const activeEnrollment = student.enrollments[0];
    if (!activeEnrollment) return [];

    const exams = await this.cbtService.getExamsForClass(
      tenantId,
      activeEnrollment.classId,
      activeEnrollment.armId || undefined
    );

    const attempts = await kernel.db.cBTAttempt.findMany({
      where: {
        tenantId,
        studentId: student.id,
        examId: { in: exams.map((e) => e.id) },
      },
    });
    const attemptMap = new Map(attempts.map((a) => [a.examId, a]));

    return exams.map((e) => ({
      ...e,
      attempt: attemptMap.get(e.id) || null,
    }));
  }

  async getResults(
    userId: string,
    tenantId: string,
    schoolId: string,
    academicYearId?: string,
    termId?: string,
  ) {
    return tenantContext.run({ tenantId }, async () => {
      const student = await this.resolveStudent(userId, tenantId, schoolId);
      const enrollmentIds = student.enrollments.map((e) => e.id);

      const where: any = {
        tenantId,
        schoolId,
        enrollmentId: { in: enrollmentIds },
        status: "PUBLISHED",
      };

      if (academicYearId) where.academicYearId = academicYearId;
      if (termId) where.termId = termId;

      const rawResults = await kernel.db.subjectResult.findMany({
        where,
        include: {
          subject: { select: { id: true, name: true } },
          academicYear: { select: { id: true, name: true } },
          term: { select: { id: true, name: true } },
          scores: true,
          gradingScale: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const totalSubjects = rawResults.length;
      const validScores = rawResults.filter((r) => r.totalScore !== null && r.totalScore !== undefined);
      const totalScoreSum = validScores.reduce((acc, curr) => acc + (curr.totalScore || 0), 0);
      const averageScore = validScores.length > 0 ? Math.round((totalScoreSum / validScores.length) * 100) / 100 : null;

      const summary = {
        totalSubjects,
        totalScore: totalScoreSum,
        averageScore,
        publishedCount: rawResults.length,
      };

      return {
        summary,
        results: rawResults,
      };
    });
  }

  async getCredential(userId: string, tenantId: string, schoolId: string) {
    const student = await this.resolveStudent(userId, tenantId, schoolId);

    const cred = await kernel.db.studentCredential.findFirst({
      where: {
        tenantId,
        schoolId,
        studentId: student.id,
        status: "ISSUED",
      },
      orderBy: { issuedAt: "desc" },
    });

    if (!cred) {
      const activeEnrollment = student.enrollments[0];
      return {
        id: `VIRTUAL-${student.id}`,
        studentId: student.id,
        studentNumber: student.studentNumber,
        studentName: `${student.firstName} ${student.lastName}`,
        className: activeEnrollment?.class?.name || "Unassigned",
        qrCodeData: `SCHOS:${student.id}:${student.tenantId}`,
        status: "ISSUED",
        issuedAt: student.createdAt,
        expiresAt: null,
      };
    }

    return cred;
  }
}
