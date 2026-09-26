import { Test, TestingModule } from "@nestjs/testing";
import { CBTService } from "./cbt.service";
import { ResultsService } from "../../academics/services/results.service";
import { kernel } from "@saas/core-platform";
import { NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";

describe("CBTService (Unit)", () => {
  let service: CBTService;
  let resultsService: jest.Mocked<ResultsService>;

  const mockResultsService = {
    recordScore: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CBTService,
        { provide: ResultsService, useValue: mockResultsService },
      ],
    }).compile();

    service = module.get<CBTService>(CBTService);
    resultsService = module.get(ResultsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("startAttempt", () => {
    it("enforces single attempt policy and validates active enrollment", async () => {
      const now = new Date();
      const from = new Date(now.getTime() - 3600000);
      const to = new Date(now.getTime() + 3600000);

      jest.spyOn(kernel.db.cBTExam, "findUnique").mockResolvedValue({
        id: "exam-1",
        tenantId: "tenant-1",
        schoolId: "school-1",
        status: "ACTIVE",
        availableFrom: from,
        availableTo: to,
        assessmentComponent: {
          academicYearId: "ay-1",
          classId: "c-1",
          armId: null,
        },
      } as any);

      jest.spyOn(kernel.db.enrollment, "findFirst").mockResolvedValue({
        id: "enr-1",
        tenantId: "tenant-1",
        studentId: "stu-1",
        status: "ACTIVE",
      } as any);

      jest.spyOn(kernel.db.cBTAttempt, "findUnique").mockResolvedValue(null);

      jest.spyOn(kernel.db.cBTAttempt, "create").mockResolvedValue({
        id: "att-1",
        tenantId: "tenant-1",
        schoolId: "school-1",
        examId: "exam-1",
        studentId: "stu-1",
        status: "IN_PROGRESS",
      } as any);

      const result = await service.startAttempt("tenant-1", "school-1", "stu-1", "exam-1");

      expect(result).toEqual({
        id: "att-1",
        tenantId: "tenant-1",
        schoolId: "school-1",
        examId: "exam-1",
        studentId: "stu-1",
        status: "IN_PROGRESS",
      });
    });

    it("rejects attempt if student has already attempted the exam", async () => {
      const now = new Date();

      jest.spyOn(kernel.db.cBTExam, "findUnique").mockResolvedValue({
        id: "exam-1",
        tenantId: "tenant-1",
        schoolId: "school-1",
        status: "ACTIVE",
        availableFrom: new Date(now.getTime() - 1000),
        availableTo: new Date(now.getTime() + 10000),
        assessmentComponent: { academicYearId: "ay-1", classId: "c-1" },
      } as any);

      jest.spyOn(kernel.db.enrollment, "findFirst").mockResolvedValue({ tenantId: "tenant-1" } as any);
      jest.spyOn(kernel.db.cBTAttempt, "findUnique").mockResolvedValue({ id: "existing-att" } as any);

      await expect(
        service.startAttempt("tenant-1", "school-1", "stu-1", "exam-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("submitAttempt", () => {
    it("auto-grades attempt and pushes score to ResultsService", async () => {
      const startTime = new Date();
      const availableTo = new Date(startTime.getTime() + 7200000);

      jest.spyOn(kernel.db.cBTAttempt, "findUnique").mockResolvedValue({
        id: "att-1",
        tenantId: "tenant-1",
        schoolId: "school-1",
        studentId: "stu-1",
        status: "IN_PROGRESS",
        startTime,
        exam: {
          durationMinutes: 60,
          availableTo,
          questions: [
            { id: "q-1", correctOption: 1, points: 10 },
            { id: "q-2", correctOption: 0, points: 10 },
          ],
          assessmentComponentId: "comp-1",
          assessmentComponent: {
            academicYearId: "ay-1",
            termId: "t-1",
            subjectId: "sub-1",
            maxScore: 20,
          },
        },
      } as any);

      jest.spyOn(kernel.db, "$transaction").mockImplementation(async (cb: any) => {
        return cb({
          cBTAttempt: {
            update: jest.fn().mockResolvedValue({ id: "att-1", status: "GRADED", totalScore: 20 }),
          },
          cBTAttemptAnswer: {
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        });
      });

      const result = await service.submitAttempt("tenant-1", "school-1", "stu-1", "exam-1", {
        answers: [
          { questionId: "q-1", selectedOption: 1 },
          { questionId: "q-2", selectedOption: 0 },
        ],
      });

      expect(mockResultsService.recordScore).toHaveBeenCalledWith("tenant-1", "school-1", {
        academicYearId: "ay-1",
        termId: "t-1",
        studentId: "stu-1",
        subjectId: "sub-1",
        type: "CBT",
        assessmentComponentId: "comp-1",
        maxScore: 20,
        score: 20,
      });

      expect(result).toEqual({ id: "att-1", status: "GRADED", totalScore: 20 });
    });
  });
});
