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

describe("CBTAttemptService Remediation Tests (Pass 3)", () => {
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
  });

  describe("saveAnswer & True Atomic CAS (Unit-level tests)", () => {
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
    });

    it("should reject saving an answer if expectedVersion is stale (Unit-level Atomic CAS simulation)", async () => {
       const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
       (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
       (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({
         id: "att-1", status: "IN_PROGRESS", startTime: new Date(),
         exam: { availableTo: null, durationMinutes: 60, publishedPayload: { questions: [{ id: "q1", questionType: "SUBJECTIVE" }] } }
       });
       (kernel.db.cBTAttemptAnswer.findUnique as jest.Mock).mockResolvedValue({ id: "ans-1", version: 5 });
       
       (kernel.db.cBTAttemptAnswer.updateMany as jest.Mock).mockResolvedValue({ count: 0 }); // Simulate concurrent miss

       await expect(service.saveAnswer("t1", "s1", "user-1", "exam-1", { questionId: "q1", expectedVersion: 4, answerPayload: { text: "hello" } }))
          .rejects.toThrow(ConflictException);
    });
  });

  describe("Strict Option Validation", () => {
     let setupExam = (questions: any[]) => {
       const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
       (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
       (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({
         id: "att-1", status: "IN_PROGRESS", startTime: new Date(),
         exam: { availableTo: null, durationMinutes: 60, publishedPayload: { questions } }
       });
       (kernel.db.cBTAttemptAnswer.findUnique as jest.Mock).mockResolvedValue(null);
       (kernel.db.cBTAttemptAnswer.create as jest.Mock).mockResolvedValue({ version: 1, updatedAt: new Date() });
     };

     it("SINGLE_CHOICE: should accept a valid string option", async () => {
        setupExam([{ id: "q1", questionType: "SINGLE_CHOICE", options: ["A", "B", "C"] }]);
        const res = await service.saveAnswer("t1", "s1", "u1", "exam-1", { questionId: "q1", answerPayload: { selectedOption: "B" } });
        expect(res.success).toBe(true);
     });

     it("SINGLE_CHOICE: should reject an unknown string option", async () => {
        setupExam([{ id: "q1", questionType: "SINGLE_CHOICE", options: ["A", "B", "C"] }]);
        await expect(service.saveAnswer("t1", "s1", "u1", "exam-1", { questionId: "q1", answerPayload: { selectedOption: "NOT_AN_OPTION" } }))
          .rejects.toThrow(BadRequestException);
     });

     it("SINGLE_CHOICE: should accept a valid numeric option (if index allowed)", async () => {
        setupExam([{ id: "q1", questionType: "SINGLE_CHOICE", options: ["A", "B", "C"] }]);
        const res = await service.saveAnswer("t1", "s1", "u1", "exam-1", { questionId: "q1", answerPayload: { selectedOption: 1 } });
        expect(res.success).toBe(true);
     });

     it("SINGLE_CHOICE: should reject an invalid numeric option", async () => {
        setupExam([{ id: "q1", questionType: "SINGLE_CHOICE", options: ["A", "B", "C"] }]);
        await expect(service.saveAnswer("t1", "s1", "u1", "exam-1", { questionId: "q1", answerPayload: { selectedOption: 5 } }))
          .rejects.toThrow(BadRequestException);
     });

     it("MULTIPLE_CHOICE: should reject if any selected option is unknown", async () => {
        setupExam([{ id: "q1", questionType: "MULTIPLE_CHOICE", options: ["A", "B", "C"] }]);
        await expect(service.saveAnswer("t1", "s1", "u1", "exam-1", { questionId: "q1", answerPayload: { selectedOptions: ["A", "INVALID"] } }))
          .rejects.toThrow(BadRequestException);
     });
  });

  describe("submitAttempt & Attempt Lifecycle", () => {
     it("should route fully objective exams directly to GRADED", async () => {
        const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
        (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
        (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({ id: "att-1" });
        (kernel.db.cBTAttempt.findUnique as jest.Mock).mockResolvedValue({
          id: "att-1", status: "IN_PROGRESS",
          exam: { publishedPayload: { questions: [{ id: "q1", questionType: "MULTIPLE_CHOICE", correctAnswerPayload: { correctOptions: ["A", "C"] }, points: 5 }] } },
          answers: [{ id: "ans-1", questionId: "q1", answerPayload: { selectedOptions: ["A", "C"] } }]
        });
        
        (kernel.db.cBTAttempt.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
        (kernel.db.cBTAttempt.update as jest.Mock).mockResolvedValue({ status: "GRADED", totalScore: 5 });

        const res = await service.submitAttempt("t1", "s1", "user-1", "exam-1");
        expect(res.status).toBe("GRADED"); // Bypassed PENDING_REVIEW correctly
        expect(res.totalScore).toBe(5);
     });

     it("should route exams containing subjective questions to PENDING_REVIEW", async () => {
        const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
        (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
        (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({ id: "att-1" });
        (kernel.db.cBTAttempt.findUnique as jest.Mock).mockResolvedValue({
          id: "att-1", status: "IN_PROGRESS",
          exam: { publishedPayload: { questions: [{ id: "q1", questionType: "SUBJECTIVE", points: 5 }] } },
          answers: [{ id: "ans-1", questionId: "q1", answerPayload: { text: "Answer" } }]
        });
        
        (kernel.db.cBTAttempt.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
        (kernel.db.cBTAttempt.update as jest.Mock).mockResolvedValue({ status: "PENDING_REVIEW", totalScore: 0 });

        const res = await service.submitAttempt("t1", "s1", "user-1", "exam-1");
        expect(res.status).toBe("PENDING_REVIEW"); // Subjective question forces review
     });
  });
});
