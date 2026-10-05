import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { kernel } from '@saas/core-platform';
import { ResultStatus } from '@saas/core-platform';

export class MissingGradingConfigurationException extends ConflictException {
  constructor(message = 'MissingGradingConfigurationException: No authoritative grading configuration found for this academic context.') {
    super(message);
  }
}

export class InvalidComponentWeightException extends ConflictException {
  constructor(message: string) {
    super(message);
  }
}

@Injectable()
export class ResultsEngineService {
  /**
   * Recalculates the authoritative total score and grade for a SubjectResult.
   * MUST be called within a transaction that modifies the AssessmentScore.
   */
  async recalculateSubjectResult(tenantId: string, schoolId: string, subjectResultId: string, tx: any) {
    const subjectResult = await tx.subjectResult.findUnique({
      where: { id: subjectResultId, tenantId, schoolId },
      include: {
        enrollment: true,
      },
    });

    if (!subjectResult) {
      throw new NotFoundException('SubjectResult not found');
    }

    if (subjectResult.status === ResultStatus.PUBLISHED) {
      throw new ForbiddenException('Cannot recalculate a PUBLISHED subject result unless authorized reopen has occurred.');
    }

    // 1. Resolve Academic Grading Config
    const gradingConfig = await tx.academicGradingConfig.findUnique({
      where: {
        tenantId_schoolId_academicYearId_termId: {
          tenantId,
          schoolId,
          academicYearId: subjectResult.academicYearId,
          termId: subjectResult.termId,
        },
      },
      include: {
        gradingScale: {
          include: {
            boundaries: {
              orderBy: { minScore: 'desc' },
            },
          },
        },
      },
    });

    if (!gradingConfig || !gradingConfig.gradingScale) {
      throw new MissingGradingConfigurationException();
    }

    // 2. Load applicable AssessmentComponents
    const components = await tx.assessmentComponent.findMany({
      where: {
        tenantId,
        schoolId,
        academicYearId: subjectResult.academicYearId,
        termId: subjectResult.termId,
        classId: subjectResult.enrollment.classId,
        subjectId: subjectResult.subjectId,
        OR: [
          { armId: null },
          { armId: subjectResult.enrollment.armId },
        ],
      },
    });

    // Resolve overrides (ARM_SPECIFIC overrides CLASS_WIDE for the same AssessmentType)
    const activeComponentsMap = new Map<string, any>();
    for (const comp of components) {
      const existing = activeComponentsMap.get(comp.assessmentTypeId);
      if (!existing) {
        activeComponentsMap.set(comp.assessmentTypeId, comp);
      } else {
        // If we already have one, keep the ARM_SPECIFIC one
        if (comp.armId !== null) {
          activeComponentsMap.set(comp.assessmentTypeId, comp);
        }
      }
    }
    const activeComponents = Array.from(activeComponentsMap.values());

    // Validate weights sum to 100%
    const totalWeight = activeComponents.reduce((sum, c) => sum + (c.weight || 0), 0);
    // Floating point safe check (tolerance 0.01)
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new InvalidComponentWeightException(`Applicable assessment components must sum to 100%. Current sum: ${totalWeight}%`);
    }

    // 3. Load AssessmentScores
    const scores = await tx.assessmentScore.findMany({
      where: { subjectResultId: subjectResult.id },
    });

    // 4. Calculate weighted total
    let finalTotalScore = 0;

    for (const comp of activeComponents) {
      const scoreRecord = scores.find((s: any) => s.assessmentComponentId === comp.id);
      if (scoreRecord && !scoreRecord.isAbsent && scoreRecord.score !== null) {
        const contribution = (scoreRecord.score / comp.maxScore) * comp.weight;
        finalTotalScore += contribution;
      }
    }

    // Round to 2 decimal places to prevent floating point anomalies
    finalTotalScore = Math.round(finalTotalScore * 100) / 100;

    // 5. Resolve grade
    let finalGrade = null;
    let finalRemark = null;
    let finalGradePoint = null;

    const matchedBoundary = gradingConfig.gradingScale.boundaries.find(b => finalTotalScore >= b.minScore);
    if (matchedBoundary) {
      finalGrade = matchedBoundary.grade;
      finalRemark = matchedBoundary.remark;
      finalGradePoint = matchedBoundary.gradePoint; // Assuming gradePoint exists, will verify
    }

    // 6. Persist
    const updated = await tx.subjectResult.update({
      where: { id: subjectResult.id },
      data: {
        totalScore: finalTotalScore,
        grade: finalGrade,
        remark: finalRemark,
        gradingScaleId: gradingConfig.gradingScaleId,
        // gradePoint: finalGradePoint, // wait, does SubjectResult have gradePoint? Let me check schema.
      },
    });

    return updated;
  }
}
