import { Test, TestingModule } from "@nestjs/testing";
import { AttendanceRepository } from "./attendance.repository";
import { kernel } from "@saas/core-platform";

describe("AttendanceRepository (Unit)", () => {
  let repository: AttendanceRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttendanceRepository],
    }).compile();

    repository = module.get<AttendanceRepository>(AttendanceRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getEligibleEnrollments", () => {
    it("includes all active students enrolled up to the end of the specified register date", async () => {
      const mockFindMany = jest.spyOn(kernel.db.enrollment, "findMany").mockResolvedValueOnce([
        { id: "enr-1", studentId: "stu-1", enrolledAt: new Date("2026-09-25T10:00:00.000Z") },
        { id: "enr-2", studentId: "stu-2", enrolledAt: new Date("2026-09-26T10:00:00.000Z") },
        { id: "enr-3", studentId: "stu-3", enrolledAt: new Date("2026-09-26T11:00:00.000Z") },
        { id: "enr-4", studentId: "stu-4", enrolledAt: new Date("2026-09-26T12:00:00.000Z") },
      ] as any);

      const registerDate = new Date("2026-09-26");
      registerDate.setUTCHours(0, 0, 0, 0);

      const result = await repository.getEligibleEnrollments(
        "tenant-1",
        "school-1",
        "campus-1",
        "class-1b",
        null,
        registerDate,
      );

      const expectedEndOfDay = new Date("2026-09-26T23:59:59.999Z");

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          tenantId: "tenant-1",
          schoolId: "school-1",
          campusId: "campus-1",
          classId: "class-1b",
          status: "ACTIVE",
          enrolledAt: { lte: expectedEndOfDay },
        },
        include: {
          student: true,
        },
      });

      expect(result).toHaveLength(4);
    });
  });
});
