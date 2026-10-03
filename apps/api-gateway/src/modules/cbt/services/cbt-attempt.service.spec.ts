import { Test, TestingModule } from "@nestjs/testing";
import { CBTAttemptService } from "./cbt-attempt.service";
import { kernel, tenantContext, CBTAttemptStatus, QuestionType } from "@saas/core-platform";
import { ForbiddenException, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";

jest.mock("@saas/core-platform", () => ({
  kernel: {
    db: {
      student: { findFirst: jest.fn() },
      cBTExam: { findFirst: jest.fn() },
      cBTAttempt: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      cBTAttemptAnswer: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((cb) => cb(kernel.db))
    }
  },
  tenantContext: {
    run: jest.fn((ctx, cb) => cb())
  },
  CBTAttemptStatus: { IN_PROGRESS: "IN_PROGRESS", GRADED: "GRADED", PENDING_REVIEW: "PENDING_REVIEW", SUBMITTED: "SUBMITTED" },
  QuestionType: { SINGLE_CHOICE: "SINGLE_CHOICE", MULTIPLE_CHOICE: "MULTIPLE_CHOICE", SUBJECTIVE: "SUBJECTIVE" }
}));

describe("CBTAttemptService Remediation Tests", () => {
  let service: CBTAttemptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({ providers: [CBTAttemptService] }).compile();
    service = module.get<CBTAttemptService>(CBTAttemptService);
    jest.clearAllMocks();
  });

  describe("startAttempt Isolation & Integrity", () => {
    it("should reject access and NOT create attempt if exam belongs to a different tenant", async () => {
      const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1", academicYearId: "ay-1" }] };
      (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (kernel.db.cBTExam.findFirst as jest.Mock).mockResolvedValue(null);
      
      await expect(service.startAttempt("t1", "s1", "user-1", "exam-1")).rejects.toThrow(NotFoundException);
      expect(kernel.db.cBTAttempt.create).not.toHaveBeenCalled();
    });

    it("should handle duplicate/concurrent attempt creation by returning the existing attempt", async () => {
      const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1", academicYearId: "ay-1" }] };
      (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (kernel.db.cBTExam.findFirst as jest.Mock).mockResolvedValue({
        id: "exam-1", status: "PUBLISHED",
        assessmentComponent: { classId: "class-1", academicYearId: "ay-1" },
        presentationPayload: { questions: [{ id: "q1", text: "Q1" }] }
      });
      
      (kernel.db.cBTAttempt.findFirst as jest.Mock)
         .mockResolvedValueOnce(null)
         .mockResolvedValueOnce({ id: "att-1" });
      (kernel.db.cBTAttempt.create as jest.Mock).mockRejectedValue({ code: 'P2002' });

      const res = await service.startAttempt("t1", "s1", "user-1", "exam-1");
      expect(res.attempt.id).toBe("att-1");
      expect((res.examPayload as any).questions[0].text).toBe("Q1");
      expect((res.examPayload as any).correctAnswers).toBeUndefined();
    });
  });

  describe("saveAnswer & Expiry", () => {
    it("should process safe expiry using min(availableTo, startTime + duration)", async () => {
       const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
       (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
       
       (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({
         id: "att-1", status: "IN_PROGRESS", startTime: new Date(Date.now() - 4000000),
         exam: { availableTo: null, durationMinutes: 60, publishedPayload: { questions: [] } },
         answers: []
       });
       (kernel.db.cBTAttempt.findUnique as jest.Mock).mockResolvedValue({
         id: "att-1", status: "IN_PROGRESS", exam: { publishedPayload: { questions: [] } }, answers: []
       });
       (kernel.db.cBTAttempt.update as jest.Mock).mockResolvedValue({ status: "SUBMITTED", totalScore: 0 });

       await expect(service.saveAnswer("t1", "s1", "user-1", "exam-1", { questionId: "q1", answerPayload: {} }))
          .rejects.toThrow(ForbiddenException);
       expect(kernel.db.cBTAttempt.update).toHaveBeenCalledWith(expect.objectContaining({
          data: expect.objectContaining({ status: "SUBMITTED" })
       }));
    });

    it("should reject answers if questionId is not in published snapshot", async () => {
       const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
       (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
       (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({
         id: "att-1", status: "IN_PROGRESS", startTime: new Date(),
         exam: { availableTo: null, durationMinutes: 60, publishedPayload: { questions: [{ id: "q_old", questionType: "SINGLE_CHOICE" }] } }
       });

       await expect(service.saveAnswer("t1", "s1", "user-1", "exam-1", { questionId: "q_new", answerPayload: { selectedOption: "A" } }))
          .rejects.toThrow(BadRequestException);
    });
  });

  describe("submitAttempt & MULTIPLE_CHOICE Grading", () => {
     it("should correctly grade MULTIPLE_CHOICE questions idempotently", async () => {
        const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
        (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
        (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({ id: "att-1" });
        (kernel.db.cBTAttempt.findUnique as jest.Mock).mockResolvedValue({
          id: "att-1", status: "IN_PROGRESS",
          exam: { publishedPayload: { questions: [{ id: "q1", questionType: "MULTIPLE_CHOICE", correctOptions: ["A", "C"], points: 5 }] } },
          answers: [{ id: "ans-1", questionId: "q1", answerPayload: { selectedOptions: ["C", "A"] } }]
        });
        (kernel.db.cBTAttempt.update as jest.Mock).mockResolvedValue({ status: "GRADED", totalScore: 5 });

        const res = await service.submitAttempt("t1", "s1", "user-1", "exam-1");
        expect(res.status).toBe("GRADED");
        expect(res.totalScore).toBe(5);
     });
  });
});
