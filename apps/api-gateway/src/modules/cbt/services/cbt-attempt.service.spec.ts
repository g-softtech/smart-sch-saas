import { Test, TestingModule } from "@nestjs/testing";
import { CBTAttemptService } from "./cbt-attempt.service";
import { kernel } from "@saas/core-platform";

jest.mock("@saas/core-platform", () => ({
  kernel: {
    db: {
      student: { findFirst: jest.fn() },
      cBTExam: { findFirst: jest.fn() },
      cBTAttempt: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      cBTAttemptAnswer: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((cb) => cb(kernel.db))
    }
  },
  tenantContext: {
    run: jest.fn((ctx, cb) => cb())
  },
  CBTAttemptStatus: {
    IN_PROGRESS: "IN_PROGRESS",
    GRADED: "GRADED",
    PENDING_REVIEW: "PENDING_REVIEW"
  },
  QuestionType: {
    SINGLE_CHOICE: "SINGLE_CHOICE",
    SUBJECTIVE: "SUBJECTIVE"
  }
}));

describe("CBTAttemptService (Step 2.3A)", () => {
  let service: CBTAttemptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CBTAttemptService]
    }).compile();

    service = module.get<CBTAttemptService>(CBTAttemptService);
    jest.clearAllMocks();
  });

  describe("startAttempt", () => {
    it("should enforce tenant and school isolation on startAttempt", async () => {
      const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1", academicYearId: "ay-1" }] };
      (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      
      (kernel.db.cBTExam.findFirst as jest.Mock).mockResolvedValue({
        id: "exam-1", status: "PUBLISHED",
        assessmentComponent: { classId: "class-1", academicYearId: "ay-1" },
        availableFrom: new Date(Date.now() - 1000),
        availableTo: new Date(Date.now() + 100000)
      });
      
      (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue(null);
      (kernel.db.cBTAttempt.create as jest.Mock).mockResolvedValue({ id: "att-1", examPayload: {} });

      await service.startAttempt("t-wrong", "s1", "user-1", "exam-1");
      
      expect(kernel.db.cBTAttempt.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ tenantId: "t-wrong", schoolId: "s1" })
      }));
    });
  });
});
