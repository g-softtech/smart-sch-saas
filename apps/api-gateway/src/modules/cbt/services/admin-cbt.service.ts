import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { kernel, AuditService } from "@saas/core-platform";
import { CreateCBTExamDto, UpdateCBTExamDto, SyncQuestionsDto } from "../dto/admin-cbt.dto";
import { CBTStatus, Prisma } from "@saas/core-platform";

@Injectable()
export class AdminCBTService {
  private readonly logger = new Logger(AdminCBTService.name);

  constructor(private readonly auditService: AuditService) {}

  async createDraft(tenantId: string, schoolId: string, dto: CreateCBTExamDto) {
    const component = await kernel.db.assessmentComponent.findUnique({
      where: { id: dto.assessmentComponentId },
      include: { CBTExam: true }
    });
    if (!component) throw new NotFoundException("AssessmentComponent not found");
    if (component.tenantId !== tenantId || component.schoolId !== schoolId) {
      throw new NotFoundException("AssessmentComponent not found in this scope");
    }
    if (component.CBTExam) throw new ConflictException("AssessmentComponent already has a CBTExam");

    if (dto.availableFrom >= dto.availableTo) {
      throw new BadRequestException("availableFrom must be before availableTo");
    }

    return await kernel.db.cBTExam.create({
      data: {
        tenantId,
        schoolId,
        teacherId: dto.teacherId,
        assessmentComponentId: dto.assessmentComponentId,
        title: dto.title,
        instructions: dto.instructions,
        availableFrom: dto.availableFrom,
        availableTo: dto.availableTo,
        durationMinutes: dto.durationMinutes,
        status: CBTStatus.DRAFT
      }
    });
  }

  async updateExam(tenantId: string, schoolId: string, examId: string, dto: UpdateCBTExamDto) {
    const exam = await kernel.db.cBTExam.findUnique({ where: { id: examId } });
    if (!exam || exam.tenantId !== tenantId || exam.schoolId !== schoolId) {
      throw new NotFoundException("CBTExam not found");
    }
    if (exam.status !== CBTStatus.DRAFT) {
      throw new ConflictException("Only DRAFT exams can be modified");
    }

    if (dto.availableFrom || dto.availableTo) {
      const from = dto.availableFrom ?? exam.availableFrom;
      const to = dto.availableTo ?? exam.availableTo;
      if (from >= to) {
        throw new BadRequestException("availableFrom must be before availableTo");
      }
    }

    return await kernel.db.cBTExam.update({
      where: { id: examId },
      data: { ...dto }
    });
  }

  async syncQuestions(tenantId: string, schoolId: string, examId: string, dto: SyncQuestionsDto) {
    const exam = await kernel.db.cBTExam.findUnique({ where: { id: examId } });
    if (!exam || exam.tenantId !== tenantId || exam.schoolId !== schoolId) {
      throw new NotFoundException("CBTExam not found");
    }
    if (exam.status !== CBTStatus.DRAFT) {
      throw new ConflictException("Only DRAFT exams can be modified");
    }

    // Replace all questions for simplicity (sync)
    await kernel.db.$transaction(async (tx) => {
      await tx.cBTQuestion.deleteMany({ where: { examId } });
      if (dto.questions.length > 0) {
        await tx.cBTQuestion.createMany({
          data: dto.questions.map((q) => ({
            examId,
            questionType: q.questionType,
            questionText: q.questionText,
            points: q.points,
            options: q.options ? q.options : Prisma.JsonNull,
            correctOption: q.correctOption ?? null,
            correctAnswerPayload: q.correctAnswerPayload ?? Prisma.JsonNull,
          }))
        });
      }
    });

    return { success: true };
  }

  async publishExam(tenantId: string, schoolId: string, examId: string, userId: string, ipAddress: string) {
    const exam = await kernel.db.cBTExam.findUnique({
      where: { id: examId },
      include: {
        assessmentComponent: true,
        questions: true
      }
    });

    if (!exam || exam.tenantId !== tenantId || exam.schoolId !== schoolId) {
      throw new NotFoundException("CBTExam not found");
    }
    if (exam.status !== CBTStatus.DRAFT) {
      throw new ConflictException("Only DRAFT exams can be published");
    }
    if (exam.questions.length === 0) {
      throw new BadRequestException("Exam must have at least one question");
    }

    let totalPoints = 0;
    for (const q of exam.questions) {
      if (q.points <= 0) throw new BadRequestException(`Question ${q.id} has invalid points`);
      totalPoints += q.points;

      if (q.questionType === "SINGLE_CHOICE" || q.questionType === "MULTIPLE_CHOICE") {
         if (!Array.isArray(q.options) || q.options.length < 2) {
           throw new BadRequestException(`Question ${q.id} must have at least 2 options`);
         }
         if (q.questionType === "SINGLE_CHOICE" && (q.correctOption === null || q.correctOption === undefined || q.correctOption < 0 || q.correctOption >= q.options.length)) {
           throw new BadRequestException(`SINGLE_CHOICE Question ${q.id} has invalid correctOption`);
         }
      }
    }

    // We allow tiny float differences
    if (Math.abs(totalPoints - exam.assessmentComponent.maxScore) > 0.01) {
      throw new BadRequestException(`Total question points (${totalPoints}) must equal AssessmentComponent maxScore (${exam.assessmentComponent.maxScore})`);
    }

    // Construct grading snapshot
    const gradingSnapshot = {
      questions: exam.questions.map(q => ({
        id: q.id,
        questionType: q.questionType,
        questionText: q.questionText,
        points: q.points,
        options: q.options,
        correctOption: q.correctOption,
        correctAnswerPayload: q.correctAnswerPayload
      }))
    };

    // Construct presentation snapshot (stripped of answers)
    const presentationSnapshot = {
      questions: exam.questions.map(q => ({
        id: q.id,
        questionType: q.questionType,
        questionText: q.questionText,
        points: q.points,
        options: q.options
      }))
    };

    return await kernel.db.$transaction(async (tx) => {
      // Re-check status with a lock equivalent in logic by using updateMany or strict where
      const result = await tx.cBTExam.updateMany({
        where: { id: examId, status: CBTStatus.DRAFT },
        data: {
          status: CBTStatus.PUBLISHED,
          publishedPayload: gradingSnapshot,
          presentationPayload: presentationSnapshot
        }
      });

      if (result.count === 0) {
        throw new ConflictException("Exam is no longer in DRAFT status or could not be locked");
      }

      await this.auditService.logAction(tx as any, {
        tenantId,
        userId,
        action: 'CBT_EXAM_PUBLISHED',
        entity: 'CBTExam',
        entityId: examId,
        metadata: {
          assessmentComponentId: exam.assessmentComponentId,
          maxScore: exam.assessmentComponent.maxScore,
          questionCount: exam.questions.length
        },
        severity: 'MEDIUM',
        ipAddress
      });

      return { success: true, published: true };
    });
  }

  async getExam(tenantId: string, schoolId: string, examId: string) {
    const exam = await kernel.db.cBTExam.findUnique({
      where: { id: examId },
      include: { questions: true }
    });
    if (!exam || exam.tenantId !== tenantId || exam.schoolId !== schoolId) {
      throw new NotFoundException("CBTExam not found");
    }
    return exam;
  }

  async getExamsForClass(tenantId: string, schoolId: string, classId: string, armId?: string) {
    return kernel.db.cBTExam.findMany({
      where: {
        tenantId,
        schoolId,
        assessmentComponent: {
          classId,
          ...(armId ? { armId } : {})
        }
      },
      include: {
        assessmentComponent: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
