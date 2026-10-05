import { Test, TestingModule } from '@nestjs/testing';
import { ResultsEngineService, MissingGradingConfigurationException, InvalidComponentWeightException } from './results-engine.service';
import { ResultStatus, ScoreProvenance } from '@saas/core-platform';
import { kernel } from '@saas/core-platform';

// Mocking kernel db
jest.mock('@saas/core-platform', () => ({
  ResultStatus: { DRAFT: 'DRAFT', PUBLISHED: 'PUBLISHED', FINALIZED: 'FINALIZED' },
  ScoreProvenance: { CBT: 'CBT', MANUAL: 'MANUAL', CBT_MANUAL_OVERRIDE: 'CBT_MANUAL_OVERRIDE' },
  kernel: {
    db: {
      $transaction: jest.fn(cb => cb(kernel.db)),
      subjectResult: { findUnique: jest.fn(), update: jest.fn() },
      academicGradingConfig: { findUnique: jest.fn() },
      assessmentComponent: { findMany: jest.fn() },
      assessmentScore: { findMany: jest.fn() }
    }
  }
}));

describe('ResultsEngineService', () => {
  let service: ResultsEngineService;
  let txMock: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsEngineService],
    }).compile();

    service = module.get<ResultsEngineService>(ResultsEngineService);
    txMock = kernel.db;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // 1 & 2. Tenant and School isolation
  it('should fail if grading config not found for tenant/school context', async () => {
    txMock.subjectResult.findUnique.mockResolvedValue({
      id: 'sr1',
      tenantId: 'tenant1',
      schoolId: 'school1',
      academicYearId: 'year1',
      termId: 'term1',
      status: ResultStatus.DRAFT,
      enrollment: { classId: 'class1', armId: 'arm1' }
    });
    txMock.academicGradingConfig.findUnique.mockResolvedValue(null);

    await expect(service.recalculateSubjectResult('tenant1', 'school1', 'sr1', txMock))
      .rejects.toThrow(MissingGradingConfigurationException);
  });

  // 4. Missing grading configuration -> explicit error
  // 5. Weight sum validation
  it('should throw InvalidComponentWeightException if weights do not sum to 100', async () => {
    txMock.subjectResult.findUnique.mockResolvedValue({
      id: 'sr1', status: ResultStatus.DRAFT,
      academicYearId: 'y1', termId: 't1',
      enrollment: { classId: 'c1', armId: null }
    });
    txMock.academicGradingConfig.findUnique.mockResolvedValue({ gradingScale: { boundaries: [] } });
    txMock.assessmentComponent.findMany.mockResolvedValue([
      { id: 'c1', type: 'CBT', weight: 40, armId: null },
      { id: 'c2', type: 'EXAM', weight: 50, armId: null }
    ]);

    await expect(service.recalculateSubjectResult('t1', 's1', 'sr1', txMock))
      .rejects.toThrow(InvalidComponentWeightException);
  });

  // 6. Weighted calculation formula & 7. Grade-boundary resolution
  it('should calculate weighted total and resolve grade', async () => {
    txMock.subjectResult.findUnique.mockResolvedValue({
      id: 'sr1', status: ResultStatus.DRAFT,
      academicYearId: 'y1', termId: 't1',
      enrollment: { classId: 'c1', armId: null }
    });
    txMock.academicGradingConfig.findUnique.mockResolvedValue({
      gradingScaleId: 'scale1',
      gradingScale: {
        boundaries: [
          { minScore: 70, grade: 'A', remark: 'Excellent' },
          { minScore: 0, grade: 'F', remark: 'Fail' }
        ]
      }
    });
    txMock.assessmentComponent.findMany.mockResolvedValue([
      { id: 'c1', type: 'CBT', weight: 40, maxScore: 40, armId: null },
      { id: 'c2', type: 'EXAM', weight: 60, maxScore: 60, armId: null }
    ]);
    txMock.assessmentScore.findMany.mockResolvedValue([
      { type: 'CBT', score: 30, isAbsent: false }, // (30/40)*40 = 30
      { type: 'EXAM', score: 45, isAbsent: false }  // (45/60)*60 = 45
    ]); // Total = 75 -> A

    txMock.subjectResult.update.mockResolvedValue({ id: 'sr1' });

    await service.recalculateSubjectResult('t1', 's1', 'sr1', txMock);

    expect(txMock.subjectResult.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        totalScore: 75,
        grade: 'A',
        remark: 'Excellent',
        gradingScaleId: 'scale1'
      })
    }));
  });

  // 15. Published result mutation rejection
  it('should reject calculation for PUBLISHED results', async () => {
    txMock.subjectResult.findUnique.mockResolvedValue({
      id: 'sr1', status: ResultStatus.PUBLISHED
    });

    await expect(service.recalculateSubjectResult('t1', 's1', 'sr1', txMock))
      .rejects.toThrow('Cannot recalculate a PUBLISHED subject result');
  });

  // 18. CLASS_WIDE vs ARM_SPECIFIC scope overrides
  it('should override CLASS_WIDE with ARM_SPECIFIC component if present', async () => {
    txMock.subjectResult.findUnique.mockResolvedValue({
      id: 'sr1', status: ResultStatus.DRAFT,
      academicYearId: 'y1', termId: 't1',
      enrollment: { classId: 'c1', armId: 'arm1' }
    });
    txMock.academicGradingConfig.findUnique.mockResolvedValue({
      gradingScaleId: 'scale1',
      gradingScale: { boundaries: [{ minScore: 0, grade: 'P' }] }
    });
    txMock.assessmentComponent.findMany.mockResolvedValue([
      { id: 'class-cbt', type: 'CBT', weight: 100, maxScore: 10, armId: null },
      { id: 'arm-cbt', type: 'CBT', weight: 100, maxScore: 20, armId: 'arm1' }
    ]);
    txMock.assessmentScore.findMany.mockResolvedValue([
      { type: 'CBT', score: 10, isAbsent: false } // ARM_SPECIFIC will use maxScore 20, so 50 total
    ]);
    await service.recalculateSubjectResult('t1', 's1', 'sr1', txMock);

    expect(txMock.subjectResult.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        totalScore: 50 // (10/20) * 100
      })
    }));
  });
});
