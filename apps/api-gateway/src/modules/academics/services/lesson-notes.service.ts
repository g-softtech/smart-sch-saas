import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { kernel, tenantContext, LessonNoteStatus } from "@saas/core-platform";
import {
  CreateLessonNoteDto,
  UpdateLessonNoteDto,
  RejectLessonNoteDto,
  QueryLessonNotesDto,
} from "../dto/lesson-notes.dto";

@Injectable()
export class LessonNotesService {
  private readonly logger = new Logger(LessonNotesService.name);

  /**
   * Helper to resolve StaffProfile for a logged-in user in a tenant/school context.
   */
  private async getStaffProfileForUser(userId: string, tenantId: string, schoolId: string) {
    const staff = await kernel.db.staffProfile.findFirst({
      where: {
        userId,
        tenantId,
        schoolId,
        status: "ACTIVE",
      },
    });

    if (!staff) {
      throw new ForbiddenException("Authenticated user is not an active staff member in this school");
    }

    return staff;
  }

  /**
   * Create a new Lesson Note in DRAFT state.
   */
  async createLessonNote(
    tenantId: string,
    schoolId: string,
    userId: string,
    userRole: string,
    dto: CreateLessonNoteDto
  ) {
    return tenantContext.run({ tenantId }, async () => {
      const staff = await this.getStaffProfileForUser(userId, tenantId, schoolId);

      // 1. Authoritative TeacherSubjectAssignment check
      const assignment = await kernel.db.teacherSubjectAssignment.findUnique({
        where: { id: dto.assignmentId },
        include: { arm: true, class: true },
      });

      if (!assignment || assignment.tenantId !== tenantId || assignment.schoolId !== schoolId) {
        throw new NotFoundException("Teacher subject assignment not found in active workspace");
      }

      if (assignment.teacherId !== staff.id) {
        throw new ForbiddenException("Teacher is not assigned to this subject assignment");
      }

      if (assignment.status !== "ACTIVE") {
        throw new ForbiddenException("Teacher subject assignment is deactivated");
      }

      // Resolve campusId strictly from arm or class boundary (never guessed)
      const campusId = assignment.arm?.campusId || null;

      // 2. Transactional creation
      return kernel.db.$transaction(async (tx) => {
        const lessonNote = await tx.lessonNote.create({
          data: {
            tenantId,
            schoolId,
            campusId,
            academicYearId: assignment.academicYearId,
            termId: assignment.termId,
            classId: assignment.classId,
            armId: assignment.armId,
            subjectId: assignment.subjectId,
            teacherId: staff.id,
            assignmentId: assignment.id,
            weekNumber: dto.weekNumber,
            title: dto.title,
            topic: dto.topic,
            subtopic: dto.subtopic,
            objectives: dto.objectives,
            materials: dto.materials,
            introduction: dto.introduction,
            presentationSteps: dto.presentationSteps,
            evaluation: dto.evaluation,
            assignment: dto.assignment,
            status: "DRAFT",
          },
          include: {
            class: true,
            arm: true,
            subject: true,
            teacher: true,
          },
        });

        await tx.lessonNoteAuditLog.create({
          data: {
            tenantId,
            schoolId,
            lessonNoteId: lessonNote.id,
            fromStatus: null,
            toStatus: "DRAFT",
            action: "CREATED",
            actorUserId: userId,
            actorRole: userRole || "TEACHER",
          },
        });

        return lessonNote;
      });
    });
  }

  /**
   * Update DRAFT or REJECTED Lesson Note content.
   */
  async updateLessonNote(
    tenantId: string,
    schoolId: string,
    userId: string,
    userRole: string,
    noteId: string,
    dto: UpdateLessonNoteDto
  ) {
    return tenantContext.run({ tenantId }, async () => {
      const staff = await this.getStaffProfileForUser(userId, tenantId, schoolId);

      return kernel.db.$transaction(async (tx) => {
        const existingNote = await tx.lessonNote.findUnique({
          where: { id: noteId },
        });

        if (!existingNote || existingNote.tenantId !== tenantId || existingNote.schoolId !== schoolId) {
          throw new NotFoundException("Lesson note not found in active workspace");
        }

        if (existingNote.teacherId !== staff.id) {
          throw new ForbiddenException("Only the authoring teacher can update this lesson note");
        }

        if (existingNote.status === "SUBMITTED" || existingNote.status === "APPROVED") {
          throw new ForbiddenException(
            `Cannot modify lesson note while in ${existingNote.status} status`
          );
        }

        const updatedNote = await tx.lessonNote.update({
          where: { id: noteId },
          data: {
            ...(dto.weekNumber !== undefined && { weekNumber: dto.weekNumber }),
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.topic !== undefined && { topic: dto.topic }),
            ...(dto.subtopic !== undefined && { subtopic: dto.subtopic }),
            ...(dto.objectives !== undefined && { objectives: dto.objectives }),
            ...(dto.materials !== undefined && { materials: dto.materials }),
            ...(dto.introduction !== undefined && { introduction: dto.introduction }),
            ...(dto.presentationSteps !== undefined && { presentationSteps: dto.presentationSteps }),
            ...(dto.evaluation !== undefined && { evaluation: dto.evaluation }),
            ...(dto.assignment !== undefined && { assignment: dto.assignment }),
          },
          include: {
            class: true,
            arm: true,
            subject: true,
            teacher: true,
          },
        });

        await tx.lessonNoteAuditLog.create({
          data: {
            tenantId,
            schoolId,
            lessonNoteId: noteId,
            fromStatus: existingNote.status,
            toStatus: existingNote.status,
            action: "UPDATED_CONTENT",
            actorUserId: userId,
            actorRole: userRole || "TEACHER",
          },
        });

        return updatedNote;
      });
    });
  }

  /**
   * Submit Lesson Note for Administrative Review.
   */
  async submitLessonNote(
    tenantId: string,
    schoolId: string,
    userId: string,
    userRole: string,
    noteId: string
  ) {
    return tenantContext.run({ tenantId }, async () => {
      const staff = await this.getStaffProfileForUser(userId, tenantId, schoolId);

      return kernel.db.$transaction(async (tx) => {
        const existingNote = await tx.lessonNote.findUnique({
          where: { id: noteId },
        });

        if (!existingNote || existingNote.tenantId !== tenantId || existingNote.schoolId !== schoolId) {
          throw new NotFoundException("Lesson note not found in active workspace");
        }

        if (existingNote.teacherId !== staff.id) {
          throw new ForbiddenException("Only the authoring teacher can submit this lesson note");
        }

        if (existingNote.status !== "DRAFT" && existingNote.status !== "REJECTED") {
          throw new BadRequestException(
            `Lesson note cannot be submitted from current status: ${existingNote.status}`
          );
        }

        const submittedNote = await tx.lessonNote.update({
          where: { id: noteId },
          data: {
            status: "SUBMITTED",
            submittedAt: new Date(),
          },
          include: {
            class: true,
            arm: true,
            subject: true,
            teacher: true,
          },
        });

        await tx.lessonNoteAuditLog.create({
          data: {
            tenantId,
            schoolId,
            lessonNoteId: noteId,
            fromStatus: existingNote.status,
            toStatus: "SUBMITTED",
            action: "SUBMITTED",
            actorUserId: userId,
            actorRole: userRole || "TEACHER",
          },
        });

        return submittedNote;
      });
    });
  }

  /**
   * Approve submitted Lesson Note (Admin/HOD).
   */
  async approveLessonNote(
    tenantId: string,
    schoolId: string,
    reviewerUserId: string,
    reviewerRole: string,
    noteId: string
  ) {
    return tenantContext.run({ tenantId }, async () => {
      return kernel.db.$transaction(async (tx) => {
        const existingNote = await tx.lessonNote.findUnique({
          where: { id: noteId },
        });

        if (!existingNote || existingNote.tenantId !== tenantId || existingNote.schoolId !== schoolId) {
          throw new NotFoundException("Lesson note not found in active workspace");
        }

        if (existingNote.status !== "SUBMITTED") {
          throw new BadRequestException(
            `Only SUBMITTED lesson notes can be approved. Current status: ${existingNote.status}`
          );
        }

        const approvedNote = await tx.lessonNote.update({
          where: { id: noteId },
          data: {
            status: "APPROVED",
            reviewedAt: new Date(),
            reviewedById: reviewerUserId,
          },
          include: {
            class: true,
            arm: true,
            subject: true,
            teacher: true,
            reviewer: true,
          },
        });

        await tx.lessonNoteAuditLog.create({
          data: {
            tenantId,
            schoolId,
            lessonNoteId: noteId,
            fromStatus: "SUBMITTED",
            toStatus: "APPROVED",
            action: "APPROVED",
            actorUserId: reviewerUserId,
            actorRole: reviewerRole || "ADMIN",
          },
        });

        return approvedNote;
      });
    });
  }

  /**
   * Reject submitted Lesson Note with mandatory feedback (Admin/HOD).
   */
  async rejectLessonNote(
    tenantId: string,
    schoolId: string,
    reviewerUserId: string,
    reviewerRole: string,
    noteId: string,
    dto: RejectLessonNoteDto
  ) {
    return tenantContext.run({ tenantId }, async () => {
      return kernel.db.$transaction(async (tx) => {
        const existingNote = await tx.lessonNote.findUnique({
          where: { id: noteId },
        });

        if (!existingNote || existingNote.tenantId !== tenantId || existingNote.schoolId !== schoolId) {
          throw new NotFoundException("Lesson note not found in active workspace");
        }

        if (existingNote.status !== "SUBMITTED") {
          throw new BadRequestException(
            `Only SUBMITTED lesson notes can be rejected. Current status: ${existingNote.status}`
          );
        }

        const rejectedNote = await tx.lessonNote.update({
          where: { id: noteId },
          data: {
            status: "REJECTED",
            reviewedAt: new Date(),
            reviewedById: reviewerUserId,
            rejectionReason: dto.reason,
          },
          include: {
            class: true,
            arm: true,
            subject: true,
            teacher: true,
            reviewer: true,
          },
        });

        await tx.lessonNoteAuditLog.create({
          data: {
            tenantId,
            schoolId,
            lessonNoteId: noteId,
            fromStatus: "SUBMITTED",
            toStatus: "REJECTED",
            action: "REJECTED",
            reason: dto.reason,
            actorUserId: reviewerUserId,
            actorRole: reviewerRole || "ADMIN",
          },
        });

        return rejectedNote;
      });
    });
  }

  /**
   * Query Lesson Notes with multi-tenant and school filtering.
   */
  async getLessonNotes(tenantId: string, schoolId: string, query: QueryLessonNotesDto) {
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
      if (query.status) where.status = query.status;

      return kernel.db.lessonNote.findMany({
        where,
        include: {
          class: true,
          arm: true,
          subject: true,
          teacher: true,
          reviewer: true,
        },
        orderBy: [{ weekNumber: "asc" }, { createdAt: "desc" }],
      });
    });
  }

  /**
   * Get single Lesson Note details by ID with audit log history.
   */
  async getLessonNoteById(tenantId: string, schoolId: string, noteId: string) {
    return tenantContext.run({ tenantId }, async () => {
      const note = await kernel.db.lessonNote.findUnique({
        where: { id: noteId },
        include: {
          class: true,
          arm: true,
          subject: true,
          teacher: true,
          reviewer: true,
          teacherAssignment: true,
          auditLogs: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!note || note.tenantId !== tenantId || note.schoolId !== schoolId) {
        throw new NotFoundException("Lesson note not found in active workspace");
      }

      return note;
    });
  }
}
