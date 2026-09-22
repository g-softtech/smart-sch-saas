import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceIntegrationService } from './attendance-integration.service';
import { AcademicsService } from '../../academics/services/academics.service';
import { kernel, AttendanceStatus } from '@saas/core-platform';

jest.mock('@saas/core-platform', () => {
  const original = jest.requireActual('@saas/core-platform');
  return {
    ...original,
    kernel: {
      db: {
        attendanceRegister: {
          findFirst: jest.fn(),
        },
        $transaction: jest.fn(),
      },
    },
  };
});

describe('AttendanceIntegrationService', () => {
  let service: AttendanceIntegrationService;
  let academicsService: jest.Mocked<AcademicsService>;

  beforeEach(async () => {
    const mockAcademicsService = {
      resolveAcademicPeriod: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceIntegrationService,
        {
          provide: AcademicsService,
          useValue: mockAcademicsService,
        },
      ],
    }).compile();

    service = module.get<AttendanceIntegrationService>(AttendanceIntegrationService);
    academicsService = module.get(AcademicsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const baseEventPayload = {
    arrivalId: 'arrival-1',
    studentId: 'student-1',
    tenantId: 'tenant-1',
    schoolId: 'school-1',
    timestamp: '2026-09-22T08:00:00.000Z',
    source: 'CAMERA' as const,
    operatorId: 'op-1',
  };

  const mockResolution = {
    skip: false,
    academicYear: { id: 'year-1' },
    term: { id: 'term-1' },
    enrollment: { id: 'enr-1', classId: 'class-1', armId: 'arm-1' },
  };

  it('skips if no academic period resolves', async () => {
    academicsService.resolveAcademicPeriod.mockResolvedValueOnce({ skip: true, reason: 'No active academic year' } as any);
    await service.handleStudentArrival({ payload: baseEventPayload } as any);
    expect(kernel.db.attendanceRegister.findFirst).not.toHaveBeenCalled();
  });

  it('skips if no matching register exists', async () => {
    academicsService.resolveAcademicPeriod.mockResolvedValueOnce(mockResolution as any);
    (kernel.db.attendanceRegister.findFirst as jest.Mock).mockResolvedValueOnce(null);
    
    await service.handleStudentArrival({ payload: baseEventPayload } as any);
    
    expect(kernel.db.attendanceRegister.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tenantId: 'tenant-1',
        schoolId: 'school-1',
        academicYearId: 'year-1',
        termId: 'term-1',
        classId: 'class-1',
        armId: 'arm-1',
        date: new Date('2026-09-22T00:00:00.000Z'),
      }),
    });
    expect(kernel.db.$transaction).not.toHaveBeenCalled();
  });

  it('locks register and skips if register is finalized', async () => {
    academicsService.resolveAcademicPeriod.mockResolvedValueOnce(mockResolution as any);
    (kernel.db.attendanceRegister.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'reg-1' });

    let txCallback: any;
    (kernel.db.$transaction as jest.Mock).mockImplementation(async (cb) => {
      txCallback = cb;
      return await cb({
        $queryRaw: jest.fn().mockImplementation((query) => {
          if (query.strings[0].includes('FOR UPDATE')) {
            return Promise.resolve([{ isFinalized: true }]);
          }
          return Promise.resolve([]);
        }),
      });
    });

    await service.handleStudentArrival({ payload: baseEventPayload } as any);
    
    // We expect transaction to be called, but since isFinalized is true, no record is created
    expect(kernel.db.$transaction).toHaveBeenCalled();
  });

  it('skips if attendance record already exists (idempotency & manual protection)', async () => {
    academicsService.resolveAcademicPeriod.mockResolvedValueOnce(mockResolution as any);
    (kernel.db.attendanceRegister.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'reg-1' });

    let createCalled = false;
    (kernel.db.$transaction as jest.Mock).mockImplementation(async (cb) => {
      return await cb({
        $queryRaw: jest.fn().mockImplementation((query) => {
          if (query.strings[0].includes('FOR UPDATE')) {
            return Promise.resolve([{ isFinalized: false }]);
          }
          if (query.strings[0].includes('sys_attendance_records')) {
            return Promise.resolve([{ id: 'rec-1', status: 'ABSENT' }]); // Existing record
          }
          return Promise.resolve([]);
        }),
        attendanceRecord: {
          create: jest.fn().mockImplementation(() => { createCalled = true; })
        }
      });
    });

    await service.handleStudentArrival({ payload: baseEventPayload } as any);
    expect(createCalled).toBe(false);
  });

  it('creates PRESENT record if register is open and no record exists', async () => {
    academicsService.resolveAcademicPeriod.mockResolvedValueOnce(mockResolution as any);
    (kernel.db.attendanceRegister.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'reg-1' });

    const createMock = jest.fn().mockResolvedValue({ id: 'new-rec' });

    (kernel.db.$transaction as jest.Mock).mockImplementation(async (cb) => {
      return await cb({
        $queryRaw: jest.fn().mockImplementation((query) => {
          if (query.strings[0].includes('FOR UPDATE')) {
            return Promise.resolve([{ isFinalized: false }]);
          }
          if (query.strings[0].includes('sys_attendance_records')) {
            return Promise.resolve([]); // No existing record
          }
          return Promise.resolve([]);
        }),
        attendanceRecord: {
          create: createMock,
        }
      });
    });

    await service.handleStudentArrival({ payload: baseEventPayload } as any);
    
    expect(createMock).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        schoolId: 'school-1',
        registerId: 'reg-1',
        studentId: 'student-1',
        enrollmentId: 'enr-1',
        status: AttendanceStatus.PRESENT,
        reason: 'Automated from Arrival',
        createdById: 'SYSTEM',
        lastModifiedById: 'SYSTEM',
      }
    });
  });
});
