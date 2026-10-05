import { ResultsEngineService } from "./results-engine.service";
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { ResultStatus, kernel } from "@saas/core-platform";
import { CreateGradingScaleDto, CreateGradeBoundaryDto, RecordScoreDto } from "../dto/results.dto";

const prisma = kernel.db;

@Injectable()
export class ResultsService {
  constructor(private readonly resultsEngine: ResultsEngineService) {}
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
    
    // Check if the scale is attached to any locked results
    const lockedResults = await prisma.subjectResult.findFirst({
      where: {
        gradingScaleId: dto.gradingScaleId,
        status: { in: [ResultStatus.FINALIZED, ResultStatus.PUBLISHED] },
      },
    });

    if (lockedResults) {
      throw new ForbiddenException("Cannot modify Grading Scale: It is attached to finalized or published results.");
    }

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

  async getAcademicGradingConfig(tenantId: string, schoolId: string, academicYearId: string, termId: string) {
    return prisma.academicGradingConfig.findUnique({
      where: {
        tenantId_schoolId_academicYearId_termId: {
          tenantId,
          schoolId,
          academicYearId,
          termId,
        },
      },
      include: {
        gradingScale: {
          include: {
            boundaries: {
              orderBy: { minScore: "desc" },
            },
          },
        },
      },
    });
  }

  async setAcademicGradingConfig(tenantId: string, schoolId: string, academicYearId: string, termId: string, gradingScaleId: string) {
    const scale = await prisma.gradingScale.findFirst({
      where: { id: gradingScaleId, tenantId, schoolId },
    });

    if (!scale) {
      throw new NotFoundException("Grading scale not found or does not belong to this school.");
    }

    const term = await prisma.term.findFirst({
      where: { id: termId, academicYearId, tenantId },
      include: { academicYear: true },
    });

    if (!term || term.academicYear.schoolId !== schoolId) {
      throw new NotFoundException("Term not found or does not belong to the selected Academic Year/School.");
    }

    return prisma.academicGradingConfig.upsert({
      where: {
        tenantId_schoolId_academicYearId_termId: {
          tenantId,
          schoolId,
          academicYearId,
          termId,
        },
      },
      update: {
        gradingScaleId,
      },
      create: {
        tenantId,
        schoolId,
        academicYearId,
        termId,
        gradingScaleId,
      },
      include: {
        gradingScale: {
          include: {
            boundaries: {
              orderBy: { minScore: "desc" },
            },
          },
        },
      },
    });
  }

  async listAssessmentComponents(tenantId: string, schoolId: string, academicYearId: string, termId: string, classId?: string, subjectId?: string) {
    return prisma.assessmentComponent.findMany({
      where: {
        tenantId,
        schoolId,
        academicYearId,
        termId,
        ...(classId ? { classId } : {}),
        ...(subjectId ? { subjectId } : {}),
      },
      include: {
        class: true,
        arm: true,
        subject: true,
      },
      orderBy: { title: "asc" },
    });
  }

  async createAssessmentComponent(tenantId: string, schoolId: string, dto: any) {
    // Validate Academic Year and Term scope
    const term = await prisma.term.findFirst({
      where: { id: dto.termId, academicYearId: dto.academicYearId, tenantId },
      include: { academicYear: true },
    });
    if (!term || term.academicYear.schoolId !== schoolId) {
      throw new NotFoundException("Term does not exist or does not belong to the selected Academic Year/School.");
    }

    // Validate Class
    const cls = await prisma.class.findFirst({
      where: { id: dto.classId, tenantId, schoolId },
    });
    if (!cls) {
      throw new NotFoundException("Class not found.");
    }

    // Validate Arm if specified
    if (dto.armId) {
      const arm = await prisma.arm.findFirst({
        where: { id: dto.armId, classId: dto.classId, tenantId },
      });
      if (!arm) {
        throw new NotFoundException("Arm not found or does not belong to the specified Class.");
      }
    }

    // Validate Subject
    const subject = await prisma.subject.findFirst({
      where: { id: dto.subjectId, tenantId, schoolId },
    });
    if (!subject) {
      throw new NotFoundException("Subject not found.");
    }

    try {
      return await prisma.assessmentComponent.create({
        data: {
          tenantId,
          schoolId,
          academicYearId: dto.academicYearId,
          termId: dto.termId,
          classId: dto.classId,
          armId: dto.armId || null,
          subjectId: dto.subjectId,
          type: dto.type,
          title: dto.title,
          maxScore: dto.maxScore,
          weight: dto.weight,
        },
        include: {
          class: true,
          arm: true,
          subject: true,
        },
      });
    } catch (e: any) {
      if (e.code === "P2002") {
        throw new ConflictException("An assessment component of this type already exists for this class/subject scope.");
      }
      throw e;
    }
  }

  async deleteAssessmentComponent(tenantId: string, schoolId: string, id: string) {
    const comp = await prisma.assessmentComponent.findFirst({
      where: { id, tenantId, schoolId },
    });
    if (!comp) {
      throw new NotFoundException("Assessment component not found.");
    }

    // Safeguard historical integrity: reject deletion if student scores exist for this component
    const scoreCount = await prisma.assessmentScore.count({
      where: { assessmentComponentId: id, tenantId, schoolId },
    });
    if (scoreCount > 0) {
      throw new ForbiddenException("Cannot delete assessment component: It has historical student score records.");
    }

    try {
      return await prisma.assessmentComponent.delete({
        where: { id },
      });
    } catch (e: any) {
      if (e.code === "P2003") {
        throw new ForbiddenException("Cannot delete assessment component: It is linked to recorded scores or CBT exams.");
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
      prisma.enrollment.findFirst({ where: { studentId: dto.studentId, academicYearId: dto.academicYearId, status: "ACTIVE" } }),
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
            enrollmentId: enrollment.id,
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
            enrollmentId: enrollment.id,
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

      // Upsert AssessmentScore using the appropriate idempotency boundary
      let existingScore = null;
      if (dto.assessmentComponentId) {
        existingScore = await tx.assessmentScore.findFirst({
          where: {
            tenantId,
            schoolId,
            subjectResultId: subjectResult.id,
            assessmentComponentId: dto.assessmentComponentId,
          },
        });
      }
      if (!existingScore) {
        existingScore = await tx.assessmentScore.findFirst({
          where: {
            tenantId,
            schoolId,
            subjectResultId: subjectResult.id,
            type: dto.type,
          },
        });
      }

      if (existingScore) {
        await tx.assessmentScore.update({
          where: { id: existingScore.id },
          data: {
            score: dto.score,
            maxScore: dto.maxScore,
            type: dto.type,
            ...(dto.assessmentComponentId ? { assessmentComponentId: dto.assessmentComponentId } : {}),
          },
        });
      } else {
        await tx.assessmentScore.create({
          data: {
            tenantId,
            schoolId,
            subjectResultId: subjectResult.id,
            type: dto.type,
            assessmentComponentId: dto.assessmentComponentId || null,
            score: dto.score,
            maxScore: dto.maxScore,
          },
        });
      }

            // Phase 6G Results Engine recalculation
      const updated = await this.resultsEngine.recalculateSubjectResult(tenantId, schoolId, subjectResult.id, tx);
      return tx.subjectResult.findUnique({ where: { id: updated.id }, include: { scores: true } });
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
    throw new ForbiddenException(
      "Direct publication of results is disabled. All result publications must be approved and published through GradebookWorkflowService.",
    );
  }

  async resolveOrCreateSubjectResult(
    tx: any,
    params: {
      tenantId: string;
      schoolId: string;
      academicYearId: string;
      termId: string;
      enrollmentId: string;
      subjectId: string;
    }
  ) {
    return tx.subjectResult.upsert({
      where: {
        tenantId_schoolId_enrollmentId_subjectId_termId: {
          tenantId: params.tenantId,
          schoolId: params.schoolId,
          enrollmentId: params.enrollmentId,
          subjectId: params.subjectId,
          termId: params.termId,
        }
      },
      update: {},
      create: {
        tenantId: params.tenantId,
        schoolId: params.schoolId,
        academicYearId: params.academicYearId,
        termId: params.termId,
        enrollmentId: params.enrollmentId,
        subjectId: params.subjectId,
        status: ResultStatus.DRAFT,
      },
    });
  }

}
