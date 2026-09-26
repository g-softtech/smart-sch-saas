import { Test, TestingModule } from "@nestjs/testing";
import { AttendanceService } from "./attendance.service";
import { AttendanceRepository } from "../repositories/attendance.repository";
import { OutboxService } from "@saas/core-platform";
import { BadRequestException } from "@nestjs/common";

describe("AttendanceService (Unit)", () => {
  let service: AttendanceService;
  let repository: jest.Mocked<AttendanceRepository>;

  const mockRepo = {
    getEligibleEnrollments: jest.fn(),
    findRegisterById: jest.fn(),
    getRegisters: jest.fn(),
    upsertRegisterWithRecords: jest.fn(),
  };

  const mockOutbox = {
    appendEvent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: AttendanceRepository, useValue: mockRepo },
        { provide: OutboxService, useValue: mockOutbox },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    repository = module.get(AttendanceRepository);
  });

  describe("getEligibleStudents", () => {
    it("converts YYYY-MM-DD string to date object and maps returned enrollments", async () => {
      mockRepo.getEligibleEnrollments.mockResolvedValueOnce([
        {
          id: "enr-1",
          studentId: "stu-1",
          student: { firstName: "Student1", lastName: "Test", studentNumber: "STU-001" },
        },
        {
          id: "enr-2",
          studentId: "stu-2",
          student: { firstName: "Student2", lastName: "Test", studentNumber: "STU-002" },
        },
        {
          id: "enr-3",
          studentId: "stu-3",
          student: { firstName: "Student3", lastName: "Test", studentNumber: "STU-003" },
        },
        {
          id: "enr-4",
          studentId: "stu-4",
          student: { firstName: "Student4", lastName: "Test", studentNumber: "STU-004" },
        },
      ] as any);

      const result = await service.getEligibleStudents(
        "tenant-1",
        "school-1",
        undefined,
        "class-1b",
        null,
        "2026-09-26",
      );

      expect(mockRepo.getEligibleEnrollments).toHaveBeenCalledWith(
        "tenant-1",
        "school-1",
        undefined,
        "class-1b",
        null,
        new Date("2026-09-26T00:00:00.000Z"),
      );

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        studentId: "stu-1",
        enrollmentId: "enr-1",
        firstName: "Student1",
        lastName: "Test",
        studentNumber: "STU-001",
      });
    });

    it("throws BadRequestException for invalid date string format", async () => {
      await expect(
        service.getEligibleStudents(
          "tenant-1",
          "school-1",
          undefined,
          "class-1b",
          null,
          "invalid-date",
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
