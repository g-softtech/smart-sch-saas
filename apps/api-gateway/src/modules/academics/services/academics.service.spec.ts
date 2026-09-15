import { Test, TestingModule } from '@nestjs/testing';
import { AcademicsService } from './academics.service';
import { AcademicsRepository } from '../repositories/academics.repository';
import { BadRequestException } from '@nestjs/common';

// UNIT TEST: In-Memory / Mocked Tests for Academics Domain Invariants
// These tests verify that the AcademicsService correctly enforces
// cross-record constraints and tenant/school boundaries without requiring PostgreSQL.

describe('AcademicsService (Unit / Mocked)', () => {
  let service: AcademicsService;
  let repo: jest.Mocked<AcademicsRepository>;

  beforeEach(async () => {
    const mockRepo = {
      findSchool: jest.fn(),
      findAcademicYear: jest.fn(),
      findClass: jest.fn(),
      findCampus: jest.fn(),
      findSubjectGroup: jest.fn(),
      createCampus: jest.fn(),
      createAcademicYear: jest.fn(),
      createTerm: jest.fn(),
      createDepartment: jest.fn(),
      createClass: jest.fn(),
      createArm: jest.fn(),
      createSubjectGroup: jest.fn(),
      createSubject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicsService,
        {
          provide: AcademicsRepository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<AcademicsService>(AcademicsService);
    repo = module.get(AcademicsRepository);
  });

  describe('Campus', () => {
    it('valid Campus creation', async () => {
      repo.findSchool.mockResolvedValueOnce({ id: 'school-1' } as any);
      repo.createCampus.mockResolvedValueOnce({ id: 'campus-1' } as any);

      const result = await service.createCampus({ schoolId: 'school-1', name: 'Main Campus' });
      expect(result.id).toBe('campus-1');
    });

    it('Campus with mismatched School tenant rejected', async () => {
      // PlatformKernel intercepts cross-tenant queries, returning null
      repo.findSchool.mockResolvedValueOnce(null);

      await expect(service.createCampus({ schoolId: 'school-1', name: 'Main Campus' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('AcademicYear', () => {
    it('valid AcademicYear', async () => {
      repo.findSchool.mockResolvedValueOnce({ id: 'school-1', tenantId: 'tenant-1' } as any);
      repo.createAcademicYear.mockResolvedValueOnce({ id: 'year-1' } as any);

      const result = await service.createAcademicYear('tenant-1', { schoolId: 'school-1', name: '2026/2027' });
      expect(result.id).toBe('year-1');
    });

    it('AcademicYear with mismatched School tenant rejected', async () => {
      repo.findSchool.mockResolvedValueOnce(null);

      await expect(service.createAcademicYear('tenant-1', { schoolId: 'school-1', name: '2026/2027' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('Term', () => {
    it('valid Term', async () => {
      repo.findAcademicYear.mockResolvedValueOnce({ id: 'year-1' } as any);
      repo.createTerm.mockResolvedValueOnce({ id: 'term-1' } as any);

      const result = await service.createTerm({ academicYearId: 'year-1', name: 'Fall Term' });
      expect(result.id).toBe('term-1');
    });

    it('Term with mismatched AcademicYear tenant rejected', async () => {
      repo.findAcademicYear.mockResolvedValueOnce(null);

      await expect(service.createTerm({ academicYearId: 'year-1', name: 'Fall Term' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('Class', () => {
    it('valid Class', async () => {
      repo.findSchool.mockResolvedValueOnce({ id: 'school-1' } as any);
      repo.createClass.mockResolvedValueOnce({ id: 'class-1' } as any);

      await expect(service.createClass({ schoolId: 'school-1', name: 'Year 1' })).resolves.toBeDefined();
    });
  });

  describe('Arm', () => {
    it('valid Arm', async () => {
      repo.findClass.mockResolvedValueOnce({ id: 'class-1', schoolId: 'school-1' } as any);
      repo.findCampus.mockResolvedValueOnce({ id: 'campus-1', schoolId: 'school-1' } as any);
      repo.createArm.mockResolvedValueOnce({ id: 'arm-1' } as any);

      await expect(service.createArm({ classId: 'class-1', campusId: 'campus-1', name: 'A' })).resolves.toBeDefined();
    });

    it('Arm with mismatched Class tenant rejected', async () => {
      repo.findClass.mockResolvedValueOnce(null);
      // Even if campus is valid, it should fail
      repo.findCampus.mockResolvedValueOnce({ id: 'campus-1', schoolId: 'school-1' } as any);

      await expect(service.createArm({ classId: 'class-1', campusId: 'campus-1', name: 'A' }))
        .rejects.toThrow(BadRequestException);
    });

    it('Arm with mismatched Campus tenant rejected', async () => {
      repo.findClass.mockResolvedValueOnce({ id: 'class-1', schoolId: 'school-1' } as any);
      repo.findCampus.mockResolvedValueOnce(null);

      await expect(service.createArm({ classId: 'class-1', campusId: 'campus-1', name: 'A' }))
        .rejects.toThrow(BadRequestException);
    });

    it('Arm whose Class and Campus belong to different schools rejected', async () => {
      repo.findClass.mockResolvedValueOnce({ id: 'class-1', schoolId: 'school-1' } as any);
      repo.findCampus.mockResolvedValueOnce({ id: 'campus-1', schoolId: 'school-2' } as any); // Different school

      await expect(service.createArm({ classId: 'class-1', campusId: 'campus-1', name: 'A' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('Subject', () => {
    it('valid Subject without SubjectGroup', async () => {
      repo.findSchool.mockResolvedValueOnce({ id: 'school-1' } as any);
      repo.createSubject.mockResolvedValueOnce({ id: 'sub-1' } as any);

      await expect(service.createSubject({ schoolId: 'school-1', name: 'Math' })).resolves.toBeDefined();
    });

    it('valid Subject with matching SubjectGroup', async () => {
      repo.findSchool.mockResolvedValueOnce({ id: 'school-1' } as any);
      repo.findSubjectGroup.mockResolvedValueOnce({ id: 'group-1', schoolId: 'school-1' } as any);
      repo.createSubject.mockResolvedValueOnce({ id: 'sub-1' } as any);

      await expect(service.createSubject({ schoolId: 'school-1', name: 'Math', subjectGroupId: 'group-1' })).resolves.toBeDefined();
    });

    it('Subject with mismatched SubjectGroup tenant rejected', async () => {
      repo.findSchool.mockResolvedValueOnce({ id: 'school-1' } as any);
      repo.findSubjectGroup.mockResolvedValueOnce(null); // Kernel filters it out

      await expect(service.createSubject({ schoolId: 'school-1', name: 'Math', subjectGroupId: 'group-1' }))
        .rejects.toThrow(BadRequestException);
    });

    it('Subject with mismatched SubjectGroup school rejected', async () => {
      repo.findSchool.mockResolvedValueOnce({ id: 'school-1' } as any);
      repo.findSubjectGroup.mockResolvedValueOnce({ id: 'group-1', schoolId: 'school-2' } as any);

      await expect(service.createSubject({ schoolId: 'school-1', name: 'Math', subjectGroupId: 'group-1' }))
        .rejects.toThrow(BadRequestException);
    });
  });
});
