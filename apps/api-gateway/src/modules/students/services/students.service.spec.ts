import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from './students.service';
import { StudentsRepository } from '../repositories/students.repository';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { tenantContext } from '@saas/core-platform';

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TEST: Mocked repository tests for StudentsService domain invariants.
//
// These tests verify that the StudentsService correctly enforces:
//   - tenant isolation (cross-tenant records rejected via mock returning null)
//   - school consistency (school must match student's school)
//   - enrollment uniqueness (active enrollment pre-check)
//   - enrollment lifecycle (transfer, withdrawal semantics)
//   - guardian linking rules (duplicate, primary)
//   - student-number allocation is called correctly
//
// All repository calls are mocked. No PostgreSQL connection is required.
// These tests do NOT verify PlatformKernel tenant-injection; that is covered
// by the core-platform's own isolation tests.
// ─────────────────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const SCHOOL_ID = 'school-1';
const OTHER_SCHOOL_ID = 'school-2';
const OTHER_TENANT_ID = 'tenant-2';

// Wrap all tests in the active tenant context to simulate a real request.
function withTenant(fn: () => Promise<void>): () => Promise<void> {
  return () => tenantContext.run({ tenantId: TENANT_ID }, fn);
}

describe('StudentsService (Unit / Mocked)', () => {
  let service: StudentsService;
  let repo: jest.Mocked<StudentsRepository>;

  const mockRepo = () => ({
    findSchool: jest.fn(),
    findAcademicYear: jest.fn(),
    findClass: jest.fn(),
    findArm: jest.fn(),
    findStudent: jest.fn(),
    findGuardian: jest.fn(),
    findActiveEnrollment: jest.fn(),
    findEnrollment: jest.fn(),
    findStudentGuardianLink: jest.fn(),
    findPrimaryGuardian: jest.fn(),
    mintStudentNumber: jest.fn(),
    createStudent: jest.fn(),
    createGuardian: jest.fn(),
    createStudentGuardianLink: jest.fn(),
    clearPrimaryGuardian: jest.fn(),
    createEnrollment: jest.fn(),
    transferEnrollment: jest.fn(),
    withdrawEnrollment: jest.fn(),
    setStudentStatus: jest.fn(),
    listStudents: jest.fn(),
    listEnrollments: jest.fn(),
    listStudentGuardians: jest.fn(),
    listGuardians: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: StudentsRepository, useValue: mockRepo() },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
    repo = module.get(StudentsRepository);

    // Mock kernel.db.$queryRaw globally for these unit tests since they don't mock Prisma
    const { kernel } = require('@saas/core-platform');
    kernel.db.$queryRaw = jest.fn().mockResolvedValue([{ id: 'mock' }]);
    kernel.db.role = { findUnique: jest.fn() };
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Student Creation ────────────────────────────────────────────────────

  describe('createStudent', () => {
    const baseInput = {
      schoolId: SCHOOL_ID,
      firstName: 'Ada',
      lastName: 'Okonkwo',
      gender: 'FEMALE' as const,
      admissionDate: new Date('2026-09-01'),
    };

    it('creates student successfully when school belongs to active tenant',
      withTenant(async () => {
        repo.findSchool.mockResolvedValueOnce({ id: SCHOOL_ID, tenantId: TENANT_ID } as any);
        repo.mintStudentNumber.mockResolvedValueOnce('STU-0001');
        repo.createStudent.mockResolvedValueOnce({ id: 'stu-1', studentNumber: 'STU-0001' } as any);

        const result = await service.createStudent(baseInput);
        expect(result.id).toBe('stu-1');
        expect(repo.mintStudentNumber).toHaveBeenCalledWith(TENANT_ID, SCHOOL_ID, undefined);
      }));

    it('rejects when school not found (cross-tenant or nonexistent)',
      withTenant(async () => {
        // Kernel returns null for cross-tenant records.
        repo.findSchool.mockResolvedValueOnce(null);

        await expect(service.createStudent(baseInput))
          .rejects.toThrow(BadRequestException);
      }));

    it('rejects when school tenantId does not match WorkspaceContext tenantId',
      withTenant(async () => {
        repo.findSchool.mockResolvedValueOnce({ id: SCHOOL_ID, tenantId: OTHER_TENANT_ID } as any);

        await expect(service.createStudent(baseInput))
          .rejects.toThrow(BadRequestException);
      }));

    it('calls mintStudentNumber with correct tenantId and schoolId',
      withTenant(async () => {
        repo.findSchool.mockResolvedValueOnce({ id: SCHOOL_ID, tenantId: TENANT_ID } as any);
        repo.mintStudentNumber.mockResolvedValueOnce('STU-0042');
        repo.createStudent.mockResolvedValueOnce({ id: 'stu-2', studentNumber: 'STU-0042' } as any);

        await service.createStudent(baseInput);
        expect(repo.mintStudentNumber).toHaveBeenCalledWith(TENANT_ID, SCHOOL_ID, undefined);
      }));
  });

  // ─── Guardian Management ─────────────────────────────────────────────────

  describe('createGuardian', () => {
    it('creates guardian scoped to active tenant',
      withTenant(async () => {
        repo.createGuardian.mockResolvedValueOnce({ id: 'g-1' } as any);

        const result = await service.createGuardian({ firstName: 'Ola', lastName: 'Ade' });
        expect(result.id).toBe('g-1');
        expect(repo.createGuardian).toHaveBeenCalledWith(
          expect.objectContaining({ tenantId: TENANT_ID }),
        );
      }));
  });

  describe('linkGuardian', () => {
    const linkInput = {
      studentId: 'stu-1',
      guardianId: 'g-1',
      schoolId: 'school-1',
      relationship: 'FATHER' as const,
      isPrimary: false,
      isEmergencyContact: false,
    };

    it('links guardian to student when both belong to active tenant',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce({ id: 'stu-1', tenantId: TENANT_ID, schoolId: SCHOOL_ID } as any);
        repo.findGuardian.mockResolvedValueOnce({ id: 'g-1', tenantId: TENANT_ID } as any);
        repo.findStudentGuardianLink.mockResolvedValueOnce(null);
        repo.createStudentGuardianLink.mockResolvedValueOnce({ id: 'sg-1' } as any);

        const result = await service.linkGuardian(linkInput);
        expect(result.id).toBe('sg-1');
      }));

    it('rejects when student not found (cross-tenant)',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce(null);

        await expect(service.linkGuardian(linkInput))
          .rejects.toThrow(BadRequestException);
      }));

    it('rejects when guardian not found (cross-tenant)',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce({ id: 'stu-1', tenantId: TENANT_ID, schoolId: SCHOOL_ID } as any);
        repo.findGuardian.mockResolvedValueOnce(null);

        await expect(service.linkGuardian(linkInput))
          .rejects.toThrow(BadRequestException);
      }));

    it('rejects duplicate guardian link',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce({ id: 'stu-1', tenantId: TENANT_ID, schoolId: SCHOOL_ID } as any);
        repo.findGuardian.mockResolvedValueOnce({ id: 'g-1', tenantId: TENANT_ID } as any);
        repo.findStudentGuardianLink.mockResolvedValueOnce({ id: 'link-1' } as any);

        await expect(service.linkGuardian(linkInput))
          .rejects.toThrow(ConflictException);
      }));

    it('clears existing primary guardian before setting new primary',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce({ id: 'stu-1', tenantId: TENANT_ID, schoolId: SCHOOL_ID } as any);
        repo.findGuardian.mockResolvedValueOnce({ id: 'g-1', tenantId: TENANT_ID } as any);
        repo.findStudentGuardianLink.mockResolvedValueOnce(null);
        repo.clearPrimaryGuardian.mockResolvedValueOnce({ count: 1 } as any);
        repo.createStudentGuardianLink.mockResolvedValueOnce({ id: 'sg-1', isPrimary: true } as any);

        await service.linkGuardian({ ...linkInput, isPrimary: true });
        expect(repo.clearPrimaryGuardian).toHaveBeenCalledWith('stu-1', expect.anything());
      }));

    it('does not clear primary when isPrimary is false',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce({ id: 'stu-1', tenantId: TENANT_ID, schoolId: SCHOOL_ID } as any);
        repo.findGuardian.mockResolvedValueOnce({ id: 'g-1', tenantId: TENANT_ID } as any);
        repo.findStudentGuardianLink.mockResolvedValueOnce(null);
        repo.createStudentGuardianLink.mockResolvedValueOnce({ id: 'sg-1' } as any);

        await service.linkGuardian({ ...linkInput, isPrimary: false });
        expect(repo.clearPrimaryGuardian).not.toHaveBeenCalled();
      }));

    it('correctly records isEmergencyContact separately from relationship',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce({ id: 'stu-1', tenantId: TENANT_ID, schoolId: SCHOOL_ID } as any);
        repo.findGuardian.mockResolvedValueOnce({ id: 'g-1', tenantId: TENANT_ID } as any);
        repo.findStudentGuardianLink.mockResolvedValueOnce(null);
        repo.createStudentGuardianLink.mockResolvedValueOnce({ id: 'sg-1' } as any);

        await service.linkGuardian({ ...linkInput, relationship: 'OTHER', isEmergencyContact: true });

        expect(repo.createStudentGuardianLink).toHaveBeenCalledWith(
          expect.objectContaining({
            relationship: 'OTHER',
            isEmergencyContact: true,
            schoolId: 'school-1',
          }),
          expect.anything()
        );
      }));
  });

  // ─── Enrollment ─────────────────────────────────────────────────────────

  describe('createEnrollment', () => {
    const enrollInput = {
      studentId: 'stu-1',
      academicYearId: 'year-1',
      classId: 'class-1',
    };

    const activeStudent = { id: 'stu-1', tenantId: TENANT_ID, schoolId: SCHOOL_ID, status: 'ACTIVE' };
    const academicYear = { id: 'year-1', tenantId: TENANT_ID, schoolId: SCHOOL_ID };
    const classEntity = { id: 'class-1', tenantId: TENANT_ID, schoolId: SCHOOL_ID };

    it('enrolls student successfully when all parents are valid',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce(activeStudent as any);
        repo.findAcademicYear.mockResolvedValueOnce(academicYear as any);
        repo.findClass.mockResolvedValueOnce(classEntity as any);
        repo.findActiveEnrollment.mockResolvedValueOnce(null);
        repo.createEnrollment.mockResolvedValueOnce({ id: 'enr-1' } as any);

        const result = await service.createEnrollment(enrollInput);
        expect(result.id).toBe('enr-1');
      }));

    it('rejects when student not found (cross-tenant)',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce(null);

        await expect(service.createEnrollment(enrollInput))
          .rejects.toThrow(BadRequestException);
      }));

    it('rejects enrollment for non-ACTIVE student',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce({ ...activeStudent, status: 'WITHDRAWN' } as any);

        await expect(service.createEnrollment(enrollInput))
          .rejects.toThrow(BadRequestException);
      }));

    it('rejects when AcademicYear not found (cross-tenant)',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce(activeStudent as any);
        repo.findAcademicYear.mockResolvedValueOnce(null);

        await expect(service.createEnrollment(enrollInput))
          .rejects.toThrow(BadRequestException);
      }));

    it('rejects when AcademicYear belongs to a different school than student',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce(activeStudent as any);
        repo.findAcademicYear.mockResolvedValueOnce({ ...academicYear, schoolId: OTHER_SCHOOL_ID } as any);

        await expect(service.createEnrollment(enrollInput))
          .rejects.toThrow(BadRequestException);
      }));

    it('rejects when Class belongs to a different school than student',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce(activeStudent as any);
        repo.findAcademicYear.mockResolvedValueOnce(academicYear as any);
        repo.findClass.mockResolvedValueOnce({ ...classEntity, schoolId: OTHER_SCHOOL_ID } as any);

        await expect(service.createEnrollment(enrollInput))
          .rejects.toThrow(BadRequestException);
      }));

    it('rejects when Arm does not belong to the specified Class',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce(activeStudent as any);
        repo.findAcademicYear.mockResolvedValueOnce(academicYear as any);
        repo.findClass.mockResolvedValueOnce(classEntity as any);
        repo.findArm.mockResolvedValueOnce({ id: 'arm-1', classId: 'class-OTHER' } as any);

        await expect(service.createEnrollment({ ...enrollInput, armId: 'arm-1' }))
          .rejects.toThrow(BadRequestException);
      }));

    it('rejects when Arm not found (cross-tenant)',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce(activeStudent as any);
        repo.findAcademicYear.mockResolvedValueOnce(academicYear as any);
        repo.findClass.mockResolvedValueOnce(classEntity as any);
        repo.findArm.mockResolvedValueOnce(null);

        await expect(service.createEnrollment({ ...enrollInput, armId: 'arm-1' }))
          .rejects.toThrow(BadRequestException);
      }));

    it('rejects duplicate ACTIVE enrollment for same student/year (pre-check)',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce(activeStudent as any);
        repo.findAcademicYear.mockResolvedValueOnce(academicYear as any);
        repo.findClass.mockResolvedValueOnce(classEntity as any);
        repo.findActiveEnrollment.mockResolvedValueOnce({ id: 'existing-enr' } as any);

        await expect(service.createEnrollment(enrollInput))
          .rejects.toThrow(ConflictException);
      }));

    it('maps Prisma P2002 unique violation to ConflictException (race condition)',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce(activeStudent as any);
        repo.findAcademicYear.mockResolvedValueOnce(academicYear as any);
        repo.findClass.mockResolvedValueOnce(classEntity as any);
        repo.findActiveEnrollment.mockResolvedValueOnce(null);
        repo.createEnrollment.mockRejectedValueOnce({ code: 'P2002' });

        await expect(service.createEnrollment(enrollInput))
          .rejects.toThrow(ConflictException);
      }));
  });

  // ─── Enrollment Transfer ─────────────────────────────────────────────────

  describe('transferEnrollment', () => {
    const activeEnrollment = {
      id: 'enr-1', status: 'ACTIVE', schoolId: SCHOOL_ID,
      studentId: 'stu-1', academicYearId: 'year-1', tenantId: TENANT_ID,
    };

    it('transfers enrollment and preserves old record',
      withTenant(async () => {
        repo.findEnrollment.mockResolvedValueOnce(activeEnrollment as any);
        repo.findClass.mockResolvedValueOnce({ id: 'class-2', schoolId: SCHOOL_ID } as any);
        repo.transferEnrollment.mockResolvedValueOnce({ id: 'enr-2', status: 'ACTIVE' } as any);

        const result = await service.transferEnrollment({
          enrollmentId: 'enr-1', newClassId: 'class-2',
        });
        expect(result.id).toBe('enr-2');
        // Old enrollment preservation is the repository's responsibility (it wraps both ops in $transaction).
      }));

    it('rejects transfer of a non-ACTIVE enrollment',
      withTenant(async () => {
        repo.findEnrollment.mockResolvedValueOnce({ ...activeEnrollment, status: 'WITHDRAWN' } as any);

        await expect(service.transferEnrollment({ enrollmentId: 'enr-1', newClassId: 'class-2' }))
          .rejects.toThrow(BadRequestException);
      }));

    it('rejects when target class belongs to a different school',
      withTenant(async () => {
        repo.findEnrollment.mockResolvedValueOnce(activeEnrollment as any);
        repo.findClass.mockResolvedValueOnce({ id: 'class-2', schoolId: OTHER_SCHOOL_ID } as any);

        await expect(service.transferEnrollment({ enrollmentId: 'enr-1', newClassId: 'class-2' }))
          .rejects.toThrow(BadRequestException);
      }));

    it('student status remains ACTIVE after an internal transfer (not TRANSFERRED)',
      withTenant(async () => {
        repo.findEnrollment.mockResolvedValueOnce(activeEnrollment as any);
        repo.findClass.mockResolvedValueOnce({ id: 'class-2', schoolId: SCHOOL_ID } as any);
        repo.transferEnrollment.mockResolvedValueOnce({ id: 'enr-2', status: 'ACTIVE' } as any);

        await service.transferEnrollment({ enrollmentId: 'enr-1', newClassId: 'class-2' });

        // setStudentStatus must NOT be called — student remains ACTIVE.
        expect(repo.setStudentStatus).not.toHaveBeenCalled();
      }));

    it('rejects when target arm does not belong to target class',
      withTenant(async () => {
        repo.findEnrollment.mockResolvedValueOnce(activeEnrollment as any);
        repo.findClass.mockResolvedValueOnce({ id: 'class-2', schoolId: SCHOOL_ID } as any);
        repo.findArm.mockResolvedValueOnce({ id: 'arm-1', classId: 'class-OTHER' } as any);

        await expect(service.transferEnrollment({
          enrollmentId: 'enr-1', newClassId: 'class-2', newArmId: 'arm-1',
        })).rejects.toThrow(BadRequestException);
      }));
  });

  // ─── Student Withdrawal ──────────────────────────────────────────────────

  describe('withdrawStudent', () => {
    const activeEnrollment = {
      id: 'enr-1', status: 'ACTIVE', studentId: 'stu-1', tenantId: TENANT_ID,
    };

    it('withdraws student and sets status to WITHDRAWN',
      withTenant(async () => {
        repo.findEnrollment.mockResolvedValueOnce(activeEnrollment as any);
        repo.findStudent.mockResolvedValueOnce({ id: 'stu-1', tenantId: TENANT_ID, schoolId: SCHOOL_ID } as any);
        repo.withdrawEnrollment.mockResolvedValueOnce({} as any);
        repo.setStudentStatus.mockResolvedValueOnce({} as any);

        await service.withdrawStudent({ enrollmentId: 'enr-1', studentId: 'stu-1' });

        expect(repo.withdrawEnrollment).toHaveBeenCalledWith('enr-1', undefined);
        expect(repo.setStudentStatus).toHaveBeenCalledWith('stu-1', 'WITHDRAWN');
      }));

    it('rejects withdrawal of a non-ACTIVE enrollment',
      withTenant(async () => {
        repo.findEnrollment.mockResolvedValueOnce({ ...activeEnrollment, status: 'TRANSFERRED' } as any);

        await expect(service.withdrawStudent({ enrollmentId: 'enr-1', studentId: 'stu-1' }))
          .rejects.toThrow(BadRequestException);
      }));

    it('rejects when enrollment does not belong to the specified student',
      withTenant(async () => {
        repo.findEnrollment.mockResolvedValueOnce({ ...activeEnrollment, studentId: 'stu-OTHER' } as any);
        repo.findStudent.mockResolvedValueOnce({ id: 'stu-1', tenantId: TENANT_ID, schoolId: SCHOOL_ID } as any);

        await expect(service.withdrawStudent({ enrollmentId: 'enr-1', studentId: 'stu-1' }))
          .rejects.toThrow(BadRequestException);
      }));

    it('historical enrollment row is preserved (withdrawEnrollment updates, not deletes)',
      withTenant(async () => {
        repo.findEnrollment.mockResolvedValueOnce(activeEnrollment as any);
        repo.findStudent.mockResolvedValueOnce({ id: 'stu-1', tenantId: TENANT_ID, schoolId: SCHOOL_ID } as any);
        repo.withdrawEnrollment.mockResolvedValueOnce({ id: 'enr-1', status: 'WITHDRAWN' } as any);
        repo.setStudentStatus.mockResolvedValueOnce({} as any);

        await service.withdrawStudent({ enrollmentId: 'enr-1', studentId: 'stu-1' });

        // withdrawEnrollment should be called (status update), not a delete.
        expect(repo.withdrawEnrollment).toHaveBeenCalledTimes(1);
      }));
  });

  // ─── Read Operations ─────────────────────────────────────────────────────

  describe('read operations', () => {
    it('getStudent rejects when student not found (cross-tenant)',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce(null);
        await expect(service.getStudent('stu-x')).rejects.toThrow(BadRequestException);
      }));

    it('listEnrollments rejects when student not found (cross-tenant)',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce(null);
        await expect(service.listEnrollments('stu-x')).rejects.toThrow(BadRequestException);
      }));

    it('listStudentGuardians rejects when student not found (cross-tenant)',
      withTenant(async () => {
        repo.findStudent.mockResolvedValueOnce(null);
        await expect(service.listStudentGuardians('stu-x')).rejects.toThrow(BadRequestException);
      }));
  });
});
