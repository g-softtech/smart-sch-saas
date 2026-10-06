// @ts-nocheck
jest.mock("@saas/core-platform", () => ({
  kernel: { db: {} },
  tenantContext: { run: jest.fn((ctx, fn) => fn()) }
}));

import { TeacherCBTService } from "./teacher-cbt.service";
import { ForbiddenException, NotFoundException } from "@nestjs/common";

describe("TeacherCBTService - Security Boundary Tests", () => {
  let service: TeacherCBTService;
  let mockDb: any;
  let mockTenantContext: any;

  beforeEach(() => {
    mockDb = {
      staffProfile: { findFirst: jest.fn() },
      teacherSubjectAssignment: { findMany: jest.fn(), findFirst: jest.fn() },
      cBTExam: { findMany: jest.fn(), findUnique: jest.fn() },
      cBTAttempt: { findMany: jest.fn() }
    };
    (global as any).kernel = { db: mockDb };
    mockTenantContext = {
      run: jest.fn((ctx, fn) => fn())
    };
    (global as any).kernel = { db: mockDb };
    const corePlatform = require("@saas/core-platform");
    corePlatform.kernel.db = mockDb;
    corePlatform.tenantContext.run.mockImplementation((ctx: any, fn: any) => fn());
    service = new TeacherCBTService();
  });

  const validTenant = "tenant-A";
  const validSchool = "school-1";
  const validUser = "user-123";

  it("should fail if staff profile not found", async () => {
    mockDb.staffProfile.findFirst.mockResolvedValueOnce(null);
    await expect(service.getTeacherExams(validTenant, validSchool, validUser)).rejects.toThrow(ForbiddenException);
  });

  it("should return empty if no active assignments", async () => {
    mockDb.staffProfile.findFirst.mockResolvedValueOnce({ id: "staff-1" });
    mockDb.teacherSubjectAssignment.findMany.mockResolvedValueOnce([]);
    const result = await service.getTeacherExams(validTenant, validSchool, validUser);
    expect(result).toEqual([]);
  });

  it("1-7. should enforce tenant, school, class, subject, and arm boundaries in exam listing", async () => {
    mockDb.staffProfile.findFirst.mockResolvedValueOnce({ id: "staff-1" });
    mockDb.teacherSubjectAssignment.findMany.mockResolvedValueOnce([
      { academicYearId: "y1", termId: "t1", classId: "c1", subjectId: "s1", scope: "ALL_ARMS" },
      { academicYearId: "y1", termId: "t1", classId: "c2", subjectId: "s2", scope: "ARM_SPECIFIC", armId: "arm-X" }
    ]);
    mockDb.cBTExam.findMany.mockResolvedValueOnce([]);

    await service.getTeacherExams(validTenant, validSchool, validUser);

    expect(mockDb.cBTExam.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: validTenant,
          schoolId: validSchool,
          assessmentComponent: {
            OR: [
              { academicYearId: "y1", termId: "t1", classId: "c1", subjectId: "s1" },
              { academicYearId: "y1", termId: "t1", classId: "c2", subjectId: "s2", armId: "arm-X" }
            ]
          }
        })
      })
    );
  });

  it("8. should prevent arbitrary examId lookup without matching assignment", async () => {
    mockDb.cBTExam.findUnique.mockResolvedValueOnce({
      id: "exam-999",
      assessmentComponent: { classId: "other-class" }
    });
    mockDb.staffProfile.findFirst.mockResolvedValueOnce({ id: "staff-1" });
    mockDb.teacherSubjectAssignment.findFirst.mockResolvedValueOnce(null);

    await expect(service.getTeacherExamDetails(validTenant, validSchool, validUser, "exam-999"))
      .rejects.toThrow(ForbiddenException);
  });

  it("10. should scope attempts strictly to the authorized exam", async () => {
    mockDb.cBTExam.findUnique.mockResolvedValueOnce({
      id: "exam-777",
      assessmentComponent: { classId: "c1" }
    });
    mockDb.staffProfile.findFirst.mockResolvedValueOnce({ id: "staff-1" });
    mockDb.teacherSubjectAssignment.findFirst.mockResolvedValueOnce({ id: "assign-1" });
    mockDb.cBTAttempt.findMany.mockResolvedValueOnce([]);

    await service.getTeacherExamAttempts(validTenant, validSchool, validUser, "exam-777");

    expect(mockDb.cBTAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          examId: "exam-777",
          tenantId: validTenant,
          schoolId: validSchool
        })
      })
    );
  });

  it("11. should not expose answer keys in exam details", async () => {
    mockDb.cBTExam.findUnique.mockResolvedValueOnce({
      id: "exam-1",
      publishedPayload: { answerKey: "SECRET" },
      assessmentComponent: { classId: "c1" }
    });
    mockDb.staffProfile.findFirst.mockResolvedValueOnce({ id: "staff-1" });
    mockDb.teacherSubjectAssignment.findFirst.mockResolvedValueOnce({ id: "assign-1" });

    const result = await service.getTeacherExamDetails(validTenant, validSchool, validUser, "exam-1");
    expect((result as any).publishedPayload).toBeUndefined();
    expect((result as any).answerKey).toBeUndefined();
  });
});
