import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaClient, ResultStatus } from "@prisma/client";
import { CreateGradingScaleDto, CreateGradeBoundaryDto, RecordScoreDto } from "../dto/results.dto";

const prisma = new PrismaClient();

@Injectable()
export class ResultsService {
  async createGradingScale(tenantId: string, schoolId: string, dto: CreateGradingScaleDto) {
    try {
      return await prisma.gradingScale.create({
        data: {
          tenantId,
          schoolId,
          ...dto,
        },
      });
    } catch (e: any) {
      if (e.code === "P2002") {
        throw new ConflictException(`Grading scale '${dto.name}' already exists.`);
      }
      throw e;
    }
  }

  async addGradeBoundary(tenantId: string, schoolId: string, dto: CreateGradeBoundaryDto) {
    const scale = await prisma.gradingScale.findUnique({ where: { id: dto.gradingScaleId } });
    if (!scale || scale.tenantId !== tenantId || scale.schoolId !== schoolId) {
      throw new NotFoundException("Grading Scale not found in this school context.");
    }
    
    // Boundary domain check is implicitly handled by dto validation (minScore >= 0)
    // Could add extra logic to prevent overlapping boundaries if needed.

    try {
      return await prisma.gradeBoundary.create({
        data: {
          tenantId,
          schoolId,
          ...dto,
        },
      });
    } catch (e: any) {
      if (e.code === "P2002") {
        throw new ConflictException(`Grade '${dto.grade}' already exists in this scale.`);
      }
      throw e;
    }
  }

  async listGradingScales(tenantId: string, schoolId: string) {
    return prisma.gradingScale.findMany({
      where: { tenantId, schoolId },
      include: {
        boundaries: {
          orderBy: { minScore: "desc" },
        },
      },
    });
  }

  async recordScore(tenantId: string, schoolId: string, dto: RecordScoreDto) {
    // 1. Validation constraints
    if (dto.score !== undefined && dto.score > dto.maxScore) {
      throw new BadRequestException("Score cannot be greater than maxScore.");
    }

    // Context validation
    const [academicYear, term, enrollment, subject] = await Promise.all([
      prisma.academicYear.findUnique({ where: { id: dto.academicYearId } }),
      prisma.term.findUnique({ where: { id: dto.termId } }),
      prisma.enrollment.findUnique({ where: { id: dto.enrollmentId } }),
      prisma.subject.findUnique({ where: { id: dto.subjectId } }),
    ]);

    if (!academicYear || academicYear.tenantId !== tenantId || academicYear.schoolId !== schoolId) throw new NotFoundException("Invalid Academic Year context.");
    if (!term || term.tenantId !== tenantId || term.academicYearId !== dto.academicYearId) throw new NotFoundException("Invalid Term context or Term does not belong to Academic Year.");
    if (!enrollment || enrollment.tenantId !== tenantId || enrollment.schoolId !== schoolId) throw new NotFoundException("Invalid Enrollment context.");
    if (!subject || subject.tenantId !== tenantId || subject.schoolId !== schoolId) throw new NotFoundException("Invalid Subject context.");

    // Transactional safety & Result locking
    return prisma.$transaction(async (tx) => {
      // Upsert SubjectResult
      let subjectResult = await tx.subjectResult.findUnique({
        where: {
          tenantId_schoolId_enrollmentId_subjectId_termId: {
            tenantId,
            schoolId,
            enrollmentId: dto.enrollmentId,
            subjectId: dto.subjectId,
            termId: dto.termId,
          },
        },
      });

      if (!subjectResult) {
        subjectResult = await tx.subjectResult.create({
          data: {
            tenantId,
            schoolId,
            academicYearId: dto.academicYearId,
            termId: dto.termId,
            enrollmentId: dto.enrollmentId,
            subjectId: dto.subjectId,
            status: ResultStatus.DRAFT,
          },
        });
      } else {
        // Historical integrity guardrail
        if (subjectResult.status === ResultStatus.FINALIZED || subjectResult.status === ResultStatus.PUBLISHED) {
          throw new ForbiddenException(`Cannot record score: Result is already ${subjectResult.status}. Amendment mechanisms required.`);
        }
      }

      // Upsert AssessmentScore
      await tx.assessmentScore.upsert({
        where: {
          tenantId_schoolId_subjectResultId_type: {
            tenantId,
            schoolId,
            subjectResultId: subjectResult.id,
            type: dto.type,
          },
        },
        update: {
          score: dto.score,
          maxScore: dto.maxScore,
        },
        create: {
          tenantId,
          schoolId,
          subjectResultId: subjectResult.id,
          type: dto.type,
          score: dto.score,
          maxScore: dto.maxScore,
        },
      });

      // Recalculate deterministic aggregation 
      // Do not hard-code simple raw-score addition assumptions for all future assessment systems.
      // We will sum the raw scores currently, but keep this logic isolated.
      const allScores = await tx.assessmentScore.findMany({
        where: { subjectResultId: subjectResult.id },
      });
      
      const totalScore = allScores.reduce((acc, curr) => acc + (curr.score || 0), 0);

      // Determine grade if grading scale is attached
      let grade = null;
      let remark = null;

      if (subjectResult.gradingScaleId) {
        const boundaries = await tx.gradeBoundary.findMany({
          where: { gradingScaleId: subjectResult.gradingScaleId },
          orderBy: { minScore: "desc" },
        });

        const matchedBoundary = boundaries.find((b) => totalScore >= b.minScore);
        if (matchedBoundary) {
          grade = matchedBoundary.grade;
          remark = matchedBoundary.remark;
        }
      }

      // Update SubjectResult
      return tx.subjectResult.update({
        where: { id: subjectResult.id },
        data: {
          totalScore,
          grade,
          remark,
        },
        include: {
          scores: true,
        },
      });
    });
  }

  async attachGradingScale(tenantId: string, schoolId: string, subjectResultId: string, gradingScaleId: string) {
    return prisma.$transaction(async (tx) => {
      const subjectResult = await tx.subjectResult.findUnique({
        where: { id: subjectResultId },
      });

      if (!subjectResult || subjectResult.tenantId !== tenantId || subjectResult.schoolId !== schoolId) {
        throw new NotFoundException("Subject Result not found.");
      }

      if (subjectResult.status === ResultStatus.FINALIZED || subjectResult.status === ResultStatus.PUBLISHED) {
        throw new ForbiddenException(`Cannot attach grading scale: Result is already ${subjectResult.status}.`);
      }

      const scale = await tx.gradingScale.findUnique({ where: { id: gradingScaleId } });
      if (!scale || scale.tenantId !== tenantId || scale.schoolId !== schoolId) {
        throw new NotFoundException("Grading Scale not found.");
      }

      const totalScore = subjectResult.totalScore || 0;
      const boundaries = await tx.gradeBoundary.findMany({
        where: { gradingScaleId: gradingScaleId },
        orderBy: { minScore: "desc" },
      });

      let grade = null;
      let remark = null;
      const matchedBoundary = boundaries.find((b) => totalScore >= b.minScore);
      if (matchedBoundary) {
        grade = matchedBoundary.grade;
        remark = matchedBoundary.remark;
      }

      return tx.subjectResult.update({
        where: { id: subjectResultId },
        data: {
          gradingScaleId,
          grade,
          remark,
        },
      });
    });
  }

  async publishResults(tenantId: string, schoolId: string, termId: string, classId: string) {
    // Note: The specific permission logic for this is enforced in the controller.
    
    // Find all draft enrollments in this term/class
    const results = await prisma.subjectResult.findMany({
      where: {
        tenantId,
        schoolId,
        termId,
        status: { in: [ResultStatus.DRAFT, ResultStatus.FINALIZED] },
        enrollment: {
          classId: classId,
        },
      },
    });

    if (results.length === 0) return { count: 0 };

    const update = await prisma.subjectResult.updateMany({
      where: {
        id: { in: results.map(r => r.id) }
      },
      data: {
        status: ResultStatus.PUBLISHED,
        publishedAt: new Date(),
      }
    });

    return { count: update.count };
  }
}
