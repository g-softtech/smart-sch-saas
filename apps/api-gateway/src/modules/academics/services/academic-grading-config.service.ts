import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { kernel } from '@saas/core-platform';

@Injectable()
export class AcademicGradingConfigService {
  async getAuthoritativeConfig(tenantId: string, schoolId: string, academicYearId: string, termId: string) {
    return kernel.db.academicGradingConfig.findUnique({
      where: {
        tenantId_schoolId_academicYearId_termId: {
          tenantId,
          schoolId,
          academicYearId,
          termId,
        }
      },
      include: {
        gradingScale: true
      }
    });
  }

  async setAuthoritativeConfig(tenantId: string, schoolId: string, academicYearId: string, termId: string, gradingScaleId: string) {
    const scale = await kernel.db.gradingScale.findUnique({
      where: { id: gradingScaleId, tenantId, schoolId }
    });

    if (!scale) {
      throw new NotFoundException('Grading scale not found');
    }

    return kernel.db.academicGradingConfig.upsert({
      where: {
        tenantId_schoolId_academicYearId_termId: {
          tenantId,
          schoolId,
          academicYearId,
          termId,
        }
      },
      update: {
        gradingScaleId
      },
      create: {
        tenantId,
        schoolId,
        academicYearId,
        termId,
        gradingScaleId
      }
    });
  }
}
