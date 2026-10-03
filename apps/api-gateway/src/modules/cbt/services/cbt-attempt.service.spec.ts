import { Test, TestingModule } from "@nestjs/testing";
import { CBTAttemptService } from "./cbt-attempt.service";
import { kernel, tenantContext, CBTAttemptStatus, QuestionType } from "@saas/core-platform";
import { ForbiddenException, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";

jest.mock("@saas/core-platform", () => ({
  kernel: {
    db: {
      student: { findFirst: jest.fn() },
      cBTExam: { findFirst: jest.fn() },
      cBTAttempt: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
      cBTAttemptAnswer: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn((cb) => cb(kernel.db))
    }
  },
  tenantContext: {
    run: jest.fn((ctx, cb) => cb())
  },
  CBTAttemptStatus: { IN_PROGRESS: "IN_PROGRESS", GRADED: "GRADED", PENDING_REVIEW: "PENDING_REVIEW", SUBMITTED: "SUBMITTED" },
  QuestionType: { SINGLE_CHOICE: "SINGLE_CHOICE", MULTIPLE_CHOICE: "MULTIPLE_CHOICE", SUBJECTIVE: "SUBJECTIVE" }
}));

describe("CBTAttemptService Remediation Tests (Pass 2)", () => {
  let service: CBTAttemptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({ providers: [CBTAttemptService] }).compile();
    service = module.get<CBTAttemptService>(CBTAttemptService);
    jest.clearAllMocks();
  });

  describe("startAttempt Isolation & Integrity", () => {
    it("should reject access if exam belongs to a different school (School Isolation)", async () => {
      const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1", academicYearId: "ay-1" }] };
      (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (kernel.db.cBTExam.findFirst as jest.Mock).mockResolvedValue(null);
      
      await expect(service.startAttempt("t1", "s-wrong", "user-1", "exam-1")).rejects.toThrow(NotFoundException);
      expect(kernel.db.cBTAttempt.create).not.toHaveBeenCalled();
    });

    it("should sanitize presentationPayload and hide correct answers", async () => {
      const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1", academicYearId: "ay-1" }] };
      (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (kernel.db.cBTExam.findFirst as jest.Mock).mockResolvedValue({
        id: "exam-1", status: "PUBLISHED",
        assessmentComponent: { classId: "class-1", academicYearId: "ay-1" },
        presentationPayload: { 
          questions: [
            { id: "q1", text: "Q1", correctOption: 1, correctAnswerPayload: { foo: "bar" }, gradingSnapshot: {}, awardedScore: 5 }
          ]
        }
      });
      (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({ id: "att-1" });

      const res = await service.startAttempt("t1", "s1", "user-1", "exam-1");
      const question = (res.examPayload as any).questions[0];
      expect(question.text).toBe("Q1");
      expect(question.correctOption).toBeUndefined();
      expect(question.correctAnswerPayload).toBeUndefined();
      expect(question.gradingSnapshot).toBeUndefined();
      expect(question.awardedScore).toBeUndefined();
      expect((res.examPayload as any).correctOption).toBeUndefined(); // ensure top-level strip
    });
  });

  describe("saveAnswer & True Atomic CAS", () => {
    it("should process safe expiry using min(availableTo, startTime + duration) with availableTo=null", async () => {
       const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
       (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
       (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({
         id: "att-1", status: "IN_PROGRESS", startTime: new Date(Date.now() - 4000000), // 66 mins ago
         exam: { availableTo: null, durationMinutes: 60, publishedPayload: { questions: [] } },
         answers: []
       });
       (kernel.db.cBTAttempt.findUnique as jest.Mock).mockResolvedValue({ id: "att-1", status: "IN_PROGRESS", exam: { publishedPayload: { questions: [] } }, answers: [] });
       (kernel.db.cBTAttempt.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
       (kernel.db.cBTAttempt.update as jest.Mock).mockResolvedValue({ status: "SUBMITTED" });

       await expect(service.saveAnswer("t1", "s1", "user-1", "exam-1", { questionId: "q1", answerPayload: {} }))
          .rejects.toThrow(ForbiddenException);
       expect(kernel.db.cBTAttempt.updateMany).toHaveBeenCalledWith(expect.objectContaining({
          where: expect.objectContaining({ id: "att-1", status: "IN_PROGRESS" }),
          data: expect.objectContaining({ status: "SUBMITTED" })
       }));
    });

    it("should reject saving an answer if expectedVersion is stale (Atomic CAS updateMany count 0)", async () => {
       const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
       (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
       (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({
         id: "att-1", status: "IN_PROGRESS", startTime: new Date(),
         exam: { availableTo: null, durationMinutes: 60, publishedPayload: { questions: [{ id: "q1", questionType: "SUBJECTIVE" }] } }
       });
       (kernel.db.cBTAttemptAnswer.findUnique as jest.Mock).mockResolvedValue({ id: "ans-1", version: 5 });
       
       // Simulate atomic CAS failure (0 rows updated)
       (kernel.db.cBTAttemptAnswer.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

       await expect(service.saveAnswer("t1", "s1", "user-1", "exam-1", { questionId: "q1", expectedVersion: 4, answerPayload: { text: "hello" } }))
          .rejects.toThrow(ConflictException);
    });

    it("should successfully update and increment version if CAS updateMany count is 1", async () => {
       const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
       (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
       (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({
         id: "att-1", status: "IN_PROGRESS", startTime: new Date(),
         exam: { availableTo: null, durationMinutes: 60, publishedPayload: { questions: [{ id: "q1", questionType: "SUBJECTIVE" }] } }
       });
       (kernel.db.cBTAttemptAnswer.findUnique as jest.Mock).mockResolvedValue({ id: "ans-1", version: 5 });
       
       (kernel.db.cBTAttemptAnswer.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

       const res = await service.saveAnswer("t1", "s1", "user-1", "exam-1", { questionId: "q1", expectedVersion: 5, answerPayload: { text: "hello" } });
       expect(res.newVersion).toBe(6);
       expect(kernel.db.cBTAttemptAnswer.updateMany).toHaveBeenCalledWith(expect.objectContaining({
           where: { id: "ans-1", version: 5 }
       }));
    });
  });

  describe("submitAttempt & Attempt Lifecycle", () => {
     it("should correctly grade MULTIPLE_CHOICE from correctAnswerPayload and prevent duplicate state transition", async () => {
        const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
        (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
        (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({ id: "att-1" });
        (kernel.db.cBTAttempt.findUnique as jest.Mock).mockResolvedValue({
          id: "att-1", status: "IN_PROGRESS",
          exam: { publishedPayload: { questions: [{ id: "q1", questionType: "MULTIPLE_CHOICE", correctAnswerPayload: { correctOptions: ["A", "C"] }, points: 5 }] } },
          answers: [{ id: "ans-1", questionId: "q1", answerPayload: { selectedOptions: ["C", "A"] } }]
        });
        
        (kernel.db.cBTAttempt.updateMany as jest.Mock).mockResolvedValue({ count: 1 }); // Atomic state transition succeeds
        (kernel.db.cBTAttempt.update as jest.Mock).mockResolvedValue({ status: "GRADED", totalScore: 5 });

        const res = await service.submitAttempt("t1", "s1", "user-1", "exam-1");
        expect(res.status).toBe("GRADED");
        expect(res.totalScore).toBe(5);
     });
     
     it("should be idempotent if updateMany fails due to concurrent submission", async () => {
        const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
        (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
        (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({ id: "att-1" });
        
        // Initial load inside tx says IN_PROGRESS
        (kernel.db.cBTAttempt.findUnique as jest.Mock)
            .mockResolvedValueOnce({ id: "att-1", status: "IN_PROGRESS" }) // Inside processSubmission
            .mockResolvedValueOnce({ id: "att-1", status: "GRADED", totalScore: 10 }); // After updateMany count 0
            
        (kernel.db.cBTAttempt.updateMany as jest.Mock).mockResolvedValue({ count: 0 }); // Concurrent submission won the race

        const res = await service.submitAttempt("t1", "s1", "user-1", "exam-1");
        expect(res.status).toBe("GRADED");
        expect(res.totalScore).toBe(10);
        expect(kernel.db.cBTAttempt.update).not.toHaveBeenCalled(); // Skipping objective re-evaluation
     });
  });
});
