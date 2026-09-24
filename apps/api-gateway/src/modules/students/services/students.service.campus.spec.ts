import { Test, TestingModule } from "@nestjs/testing";
import { StudentsService } from "./students.service";
import { StudentsRepository } from "../repositories/students.repository";
import { BadRequestException } from "@nestjs/common";
import { tenantContext } from "@saas/core-platform";

// ─────────────────────────────────────────────────────────────────────────────
// CAMPUS ISOLATION UNIT TESTS
//
// Tests cover:
//   1. Student list campus isolation (campusId filter forwarded to repo)
//   3. Multi-campus enrollment without campus → rejected
//   4. Enrollment with campus belonging to another school → rejected
//   5. Valid campus enrollment → succeeds
//   Legacy: null campusId allowed in single-campus school
// ─────────────────────────────────────────────────────────────────────────────

const TENANT_ID = "tenant-1";
const SCHOOL_ID = "school-1";
const OTHER_SCHOOL_ID = "school-2";
const CAMPUS_ID = "campus-1";
const OTHER_SCHOOL_CAMPUS_ID = "campus-other-school";

function withTenant(fn: () => Promise<void>): () => Promise<void> {
  return () => tenantContext.run({ tenantId: TENANT_ID }, fn);
}

describe("StudentsService - Campus Isolation", () => {
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

    const { kernel } = require("@saas/core-platform");
    kernel.db.$queryRaw = jest.fn().mockResolvedValue([{ id: "mock" }]);
    kernel.db.role = { findUnique: jest.fn() };
    kernel.db.school = {
      findUnique: jest.fn().mockResolvedValue({
        id: SCHOOL_ID,
        campuses: [{ id: CAMPUS_ID }],
      }),
    };
    kernel.db.campus = {
      findUnique: jest.fn().mockResolvedValue({
        id: CAMPUS_ID,
        schoolId: SCHOOL_ID,
      }),
    };
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Test 1: Student list campus isolation ───────────────────────────────

  describe("Test 1 - Student list campus isolation", () => {
    it(
      "listStudents forwards campusId to repo so only campus-scoped students are returned",
      withTenant(async () => {
        repo.listStudents.mockResolvedValueOnce([] as any);
        await service.listStudents(SCHOOL_ID, CAMPUS_ID);
        expect(repo.listStudents).toHaveBeenCalledWith(
          SCHOOL_ID,
          CAMPUS_ID,
          undefined,
        );
      }),
    );

    it(
      "listStudents without campusId passes undefined so all-campus (legacy) students are returned",
      withTenant(async () => {
        repo.listStudents.mockResolvedValueOnce([] as any);
        await service.listStudents(SCHOOL_ID, undefined);
        expect(repo.listStudents).toHaveBeenCalledWith(
          SCHOOL_ID,
          undefined,
          undefined,
        );
      }),
    );
  });

  // ─── Test 3: Multi-campus enrollment without campus -> rejected ───────────

  describe("Test 3 - Multi-campus enrollment without campus rejected", () => {
    const activeStudent = {
      id: "stu-1",
      tenantId: TENANT_ID,
      schoolId: SCHOOL_ID,
      status: "ACTIVE",
    };
    const academicYear = { id: "year-1", tenantId: TENANT_ID, schoolId: SCHOOL_ID };
    const classEntity = { id: "class-1", tenantId: TENANT_ID, schoolId: SCHOOL_ID };

    it(
      "rejects createEnrollment with null campusId in a multi-campus school",
      withTenant(async () => {
        const { kernel } = require("@saas/core-platform");
        kernel.db.school.findUnique.mockResolvedValueOnce({
          id: SCHOOL_ID,
          campuses: [{ id: "campus-a" }, { id: "campus-b" }],
        });
        repo.findStudent.mockResolvedValueOnce(activeStudent as any);
        repo.findAcademicYear.mockResolvedValueOnce(academicYear as any);
        repo.findClass.mockResolvedValueOnce(classEntity as any);
        repo.findActiveEnrollment.mockResolvedValueOnce(null);

        await expect(
          service.createEnrollment({
            studentId: "stu-1",
            academicYearId: "year-1",
            classId: "class-1",
            campusId: null as any,
          }),
        ).rejects.toThrow(BadRequestException);
      }),
    );

    it(
      "rejects createEnrollment with undefined campusId in a multi-campus school",
      withTenant(async () => {
        const { kernel } = require("@saas/core-platform");
        kernel.db.school.findUnique.mockResolvedValueOnce({
          id: SCHOOL_ID,
          campuses: [{ id: "campus-a" }, { id: "campus-b" }],
        });
        repo.findStudent.mockResolvedValueOnce(activeStudent as any);
        repo.findAcademicYear.mockResolvedValueOnce(academicYear as any);
        repo.findClass.mockResolvedValueOnce(classEntity as any);
        repo.findActiveEnrollment.mockResolvedValueOnce(null);

        await expect(
          service.createEnrollment({
            studentId: "stu-1",
            academicYearId: "year-1",
            classId: "class-1",
          } as any),
        ).rejects.toThrow(BadRequestException);
      }),
    );
  });

  // ─── Test 4: Enrollment with campus from another school -> rejected ────────

  describe("Test 4 - Cross-school campus enrollment rejected", () => {
    const activeStudent = {
      id: "stu-1",
      tenantId: TENANT_ID,
      schoolId: SCHOOL_ID,
      status: "ACTIVE",
    };
    const academicYear = { id: "year-1", tenantId: TENANT_ID, schoolId: SCHOOL_ID };
    const classEntity = { id: "class-1", tenantId: TENANT_ID, schoolId: SCHOOL_ID };

    it(
      "rejects enrollment when campusId belongs to a different school",
      withTenant(async () => {
        const { kernel } = require("@saas/core-platform");
        kernel.db.school.findUnique.mockResolvedValueOnce({
          id: SCHOOL_ID,
          campuses: [{ id: CAMPUS_ID }],
        });
        kernel.db.campus.findUnique.mockResolvedValueOnce({
          id: OTHER_SCHOOL_CAMPUS_ID,
          schoolId: OTHER_SCHOOL_ID,
        });
        repo.findStudent.mockResolvedValueOnce(activeStudent as any);
        repo.findAcademicYear.mockResolvedValueOnce(academicYear as any);
        repo.findClass.mockResolvedValueOnce(classEntity as any);
        repo.findActiveEnrollment.mockResolvedValueOnce(null);

        await expect(
          service.createEnrollment({
            studentId: "stu-1",
            academicYearId: "year-1",
            classId: "class-1",
            campusId: OTHER_SCHOOL_CAMPUS_ID,
          }),
        ).rejects.toThrow(BadRequestException);
      }),
    );

    it(
      "rejects enrollment when campusId does not exist",
      withTenant(async () => {
        const { kernel } = require("@saas/core-platform");
        kernel.db.school.findUnique.mockResolvedValueOnce({
          id: SCHOOL_ID,
          campuses: [{ id: CAMPUS_ID }],
        });
        kernel.db.campus.findUnique.mockResolvedValueOnce(null);
        repo.findStudent.mockResolvedValueOnce(activeStudent as any);
        repo.findAcademicYear.mockResolvedValueOnce(academicYear as any);
        repo.findClass.mockResolvedValueOnce(classEntity as any);
        repo.findActiveEnrollment.mockResolvedValueOnce(null);

        await expect(
          service.createEnrollment({
            studentId: "stu-1",
            academicYearId: "year-1",
            classId: "class-1",
            campusId: "ghost-campus",
          }),
        ).rejects.toThrow(BadRequestException);
      }),
    );
  });

  // ─── Test 5: Valid campus enrollment -> succeeds ──────────────────────────

  describe("Test 5 - Valid campus enrollment succeeds", () => {
    it(
      "creates enrollment when campusId belongs to the correct school",
      withTenant(async () => {
        const { kernel } = require("@saas/core-platform");
        kernel.db.school.findUnique.mockResolvedValueOnce({
          id: SCHOOL_ID,
          campuses: [{ id: CAMPUS_ID }],
        });
        kernel.db.campus.findUnique.mockResolvedValueOnce({
          id: CAMPUS_ID,
          schoolId: SCHOOL_ID,
        });
        repo.findStudent.mockResolvedValueOnce({
          id: "stu-1",
          tenantId: TENANT_ID,
          schoolId: SCHOOL_ID,
          status: "ACTIVE",
        } as any);
        repo.findAcademicYear.mockResolvedValueOnce({
          id: "year-1",
          tenantId: TENANT_ID,
          schoolId: SCHOOL_ID,
        } as any);
        repo.findClass.mockResolvedValueOnce({
          id: "class-1",
          tenantId: TENANT_ID,
          schoolId: SCHOOL_ID,
        } as any);
        repo.findActiveEnrollment.mockResolvedValueOnce(null);
        repo.createEnrollment.mockResolvedValueOnce({ id: "enr-1" } as any);

        const result = await service.createEnrollment({
          studentId: "stu-1",
          academicYearId: "year-1",
          classId: "class-1",
          campusId: CAMPUS_ID,
        });

        expect(result.id).toBe("enr-1");
        expect(repo.createEnrollment).toHaveBeenCalledWith(
          expect.objectContaining({ campusId: CAMPUS_ID }),
          undefined,
        );
      }),
    );

    it(
      "creates enrollment with null campusId in single-campus school (legacy path allowed)",
      withTenant(async () => {
        const { kernel } = require("@saas/core-platform");
        kernel.db.school.findUnique.mockResolvedValueOnce({
          id: SCHOOL_ID,
          campuses: [{ id: CAMPUS_ID }],
        });
        repo.findStudent.mockResolvedValueOnce({
          id: "stu-1",
          tenantId: TENANT_ID,
          schoolId: SCHOOL_ID,
          status: "ACTIVE",
        } as any);
        repo.findAcademicYear.mockResolvedValueOnce({
          id: "year-1",
          tenantId: TENANT_ID,
          schoolId: SCHOOL_ID,
        } as any);
        repo.findClass.mockResolvedValueOnce({
          id: "class-1",
          tenantId: TENANT_ID,
          schoolId: SCHOOL_ID,
        } as any);
        repo.findActiveEnrollment.mockResolvedValueOnce(null);
        repo.createEnrollment.mockResolvedValueOnce({ id: "enr-legacy" } as any);

        const result = await service.createEnrollment({
          studentId: "stu-1",
          academicYearId: "year-1",
          classId: "class-1",
          campusId: null as any,
        });

        expect(result.id).toBe("enr-legacy");
        expect(kernel.db.campus.findUnique).not.toHaveBeenCalled();
      }),
    );
  });
});
