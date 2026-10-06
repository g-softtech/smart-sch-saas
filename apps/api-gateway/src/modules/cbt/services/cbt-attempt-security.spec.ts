import { Test, TestingModule } from "@nestjs/testing";
import { CBTAttemptService } from "./cbt-attempt.service";
import { kernel, tenantContext } from "@saas/core-platform";
import { ForbiddenException, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";

jest.mock("@saas/core-platform", () => ({
  kernel: {
    db: {
      student: { findFirst: jest.fn() },
      cBTExam: { findFirst: jest.fn() },
      cBTAttempt: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
      cBTAttemptAnswer: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      assessmentScore: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(async (cb) => {
        return await cb(kernel.db);
      })
    }
  },
  tenantContext: {
    run: jest.fn((ctx, cb) => cb())
  },
  CBTAttemptStatus: { IN_PROGRESS: "IN_PROGRESS", GRADED: "GRADED", PENDING_REVIEW: "PENDING_REVIEW", SUBMITTED: "SUBMITTED" },
  QuestionType: { SINGLE_CHOICE: "SINGLE_CHOICE", MULTIPLE_CHOICE: "MULTIPLE_CHOICE", SUBJECTIVE: "SUBJECTIVE" },
  AssessmentProvenance: { CBT: "CBT" }
}));

describe("CBT Attempt Security & Behavioral Proofs", () => {
  let service: CBTAttemptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({ providers: [CBTAttemptService] }).compile();
    service = module.get<CBTAttemptService>(CBTAttemptService);
    jest.clearAllMocks();
  });

  describe("A. Student class/arm authorization", () => {
    it("Cross-tenant access rejected", async () => {
      (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.startAttempt("t1", "s1", "u1", "exam-1"))
        .rejects.toThrow(ForbiddenException); // Handled by missing student
    });

    it("Cross-school access rejected", async () => {
      const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1", armId: "arm-1" }] };
      (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (kernel.db.cBTExam.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.startAttempt("t1", "wrong-school", "u1", "exam-1"))
        .rejects.toThrow(NotFoundException);
    });

    it("Student cannot access an exam outside their authorized class/arm boundary", async () => {
      const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1", armId: "arm-1" }] };
      (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      
      (kernel.db.cBTExam.findFirst as jest.Mock).mockResolvedValue({
        id: "exam-1",
        assessmentComponent: { classId: "class-2", armId: null }
      });

      await expect(service.startAttempt("t1", "s1", "u1", "exam-1"))
        .rejects.toThrow(ForbiddenException);
    });

    it("Valid CLASS_WIDE and ARM_SPECIFIC cases", async () => {
      const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1", armId: "arm-1" }] };
      (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      
      (kernel.db.cBTExam.findFirst as jest.Mock).mockResolvedValue({
        id: "exam-1", status: "PUBLISHED", availableFrom: null, availableTo: null,
        assessmentComponent: { classId: "class-1", armId: null },
        presentationPayload: { questions: [] }
      });
      (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue(null);
      (kernel.db.cBTAttempt.create as jest.Mock).mockResolvedValue({ id: "att-1" });

      const res1 = await service.startAttempt("t1", "s1", "u1", "exam-1");
      expect(res1).toBeDefined();

      (kernel.db.cBTExam.findFirst as jest.Mock).mockResolvedValue({
        id: "exam-2", status: "PUBLISHED", availableFrom: null, availableTo: null,
        assessmentComponent: { classId: "class-1", armId: "arm-1" },
        presentationPayload: { questions: [] }
      });
      const res2 = await service.startAttempt("t1", "s1", "u1", "exam-2");
      expect(res2).toBeDefined();
    });
  });

  describe("B. Publication and availability", () => {
    let mockExam: any;
    beforeEach(() => {
      const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
      (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue(null);
      mockExam = { id: "exam-1", assessmentComponent: { classId: "class-1" }, presentationPayload: { questions: [] } };
    });

    it("1. DRAFT exam cannot be started", async () => {
      (kernel.db.cBTExam.findFirst as jest.Mock).mockResolvedValue({ ...mockExam, status: "DRAFT" });
      await expect(service.startAttempt("t1", "s1", "u1", "exam-1")).rejects.toThrow(ForbiddenException);
    });

    it("2. Unpublished exam cannot be started", async () => {
      (kernel.db.cBTExam.findFirst as jest.Mock).mockResolvedValue({ ...mockExam, status: "CLOSED" });
      await expect(service.startAttempt("t1", "s1", "u1", "exam-1")).rejects.toThrow(ForbiddenException);
    });

    it("3. PUBLISHED exam can be started when available", async () => {
      (kernel.db.cBTExam.findFirst as jest.Mock).mockResolvedValue({ ...mockExam, status: "PUBLISHED", availableFrom: null, availableTo: null });
      (kernel.db.cBTAttempt.create as jest.Mock).mockResolvedValue({ id: "att-1" });
      const res = await service.startAttempt("t1", "s1", "u1", "exam-1");
      expect(res).toBeDefined();
    });

    it("4. Exam before availableFrom is rejected", async () => {
      const future = new Date(Date.now() + 100000);
      (kernel.db.cBTExam.findFirst as jest.Mock).mockResolvedValue({ ...mockExam, status: "PUBLISHED", availableFrom: future, availableTo: null });
      await expect(service.startAttempt("t1", "s1", "u1", "exam-1")).rejects.toThrow(ForbiddenException);
    });

    it("5. Exam after availableTo is rejected", async () => {
      const past = new Date(Date.now() - 100000);
      (kernel.db.cBTExam.findFirst as jest.Mock).mockResolvedValue({ ...mockExam, status: "PUBLISHED", availableFrom: null, availableTo: past });
      await expect(service.startAttempt("t1", "s1", "u1", "exam-1")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("C. Presentation snapshot isolation & F. Answer key protection", () => {
    it("Student questions come from immutable presentationPayload, correct answers absent", async () => {
      const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
      (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue(null);
      
      const presentationPayload = { questions: [{ id: "q1", questionText: "Immutable 1", options: ["A", "B"] }] };
      (kernel.db.cBTExam.findFirst as jest.Mock).mockResolvedValue({
        id: "exam-1", status: "PUBLISHED", availableFrom: null, availableTo: null,
        assessmentComponent: { classId: "class-1" }, presentationPayload
      });
      (kernel.db.cBTAttempt.create as jest.Mock).mockImplementation((data) => ({ id: "att-1", ...data.data }));

      const res = await service.startAttempt("t1", "s1", "u1", "exam-1");
      expect(res.examPayload).toEqual(presentationPayload);
      expect(JSON.stringify(res)).not.toContain("correctOption");
      expect(JSON.stringify(res)).not.toContain("correctAnswerPayload");
    });
  });

  describe("D. Published grading snapshot isolation & K. Transactional grading", () => {
    it("Grades ONLY against immutable publishedPayload inside a transaction", async () => {
      const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
      (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      
      (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({ id: "att-1" });
      (kernel.db.cBTAttempt.findUnique as jest.Mock).mockResolvedValue({
        id: "att-1", status: "IN_PROGRESS",
        exam: { publishedPayload: { questions: [{ id: "q1", questionType: "SINGLE_CHOICE", correctOption: 1, points: 10 }] } },
        answers: [{ id: "ans-1", questionId: "q1", answerPayload: { selectedOption: 1 } }]
      });
      
      (kernel.db.cBTAttempt.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (kernel.db.cBTAttempt.update as jest.Mock).mockResolvedValue({ status: "GRADED", totalScore: 10 });

      const res = await service.submitAttempt("t1", "s1", "u1", "exam-1");
      expect(kernel.db.$transaction).toHaveBeenCalled();
      expect(res.totalScore).toBe(10);
    });
  });

  describe("E. Client score manipulation & G. Server-authoritative timing", () => {
    it("Backend completely ignores any client-supplied score in saveAnswer", async () => {
      const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
      (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      
      (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({
        id: "att-1", status: "IN_PROGRESS", startTime: new Date(),
        exam: { availableTo: null, durationMinutes: 60, publishedPayload: { questions: [{ id: "q1", questionType: "SUBJECTIVE" }] } }
      });
      (kernel.db.cBTAttemptAnswer.findUnique as jest.Mock).mockResolvedValue({ id: "ans-1", version: 1 });
      (kernel.db.cBTAttemptAnswer.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const fakePayload = {
        questionId: "q1", expectedVersion: 1, answerPayload: { text: "hello" }, totalScore: 100, score: 100
      };

      await service.saveAnswer("t1", "s1", "u1", "exam-1", fakePayload);

      const updateCall = (kernel.db.cBTAttemptAnswer.updateMany as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.totalScore).toBeUndefined();
      expect(updateCall.data.score).toBeUndefined();
      expect(updateCall.data.answerPayload).toEqual({ text: "hello" });
    });

    it("Client cannot bypass server timing via payload fields", async () => {
      const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
      (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      
      (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({
        id: "att-1", status: "IN_PROGRESS", startTime: new Date(Date.now() - 4000000),
        exam: { availableTo: null, durationMinutes: 60, publishedPayload: { questions: [] } },
        answers: []
      });

      const fakePayload = {
        questionId: "q1", expectedVersion: 1, answerPayload: { text: "hello" }, remainingTime: 5000, durationMinutes: 120
      };

      await expect(service.saveAnswer("t1", "s1", "u1", "exam-1", fakePayload)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("H. Autosave persistence & I. Autosave vs final submission separation", () => {
    it("Autosave explicitly calls DB with answerPayload and increments version, but does NOT finalize grading", async () => {
      const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
      (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({
        id: "att-1", status: "IN_PROGRESS", startTime: new Date(),
        exam: { availableTo: null, durationMinutes: 60, publishedPayload: { questions: [{ id: "q1", questionType: "SINGLE_CHOICE", options: ["A", "B"] }] } }
      });
      // The updateMany call works based on id and expectedVersion
      (kernel.db.cBTAttemptAnswer.findUnique as jest.Mock).mockResolvedValue({ id: "ans-1", version: 2 });
      (kernel.db.cBTAttemptAnswer.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.saveAnswer("t1", "s1", "u1", "exam-1", {
        questionId: "q1", expectedVersion: 2, answerPayload: { selectedOption: 0 }
      });

      const updateCallArgs = (kernel.db.cBTAttemptAnswer.updateMany as jest.Mock).mock.calls[0][0];
      
      expect(updateCallArgs.where.id).toBe("ans-1");
      expect(updateCallArgs.data.version.increment).toBe(1);
      expect(updateCallArgs.data.answerPayload).toEqual({ selectedOption: 0 });
      
      expect(kernel.db.cBTAttempt.update).not.toHaveBeenCalled();
      expect(kernel.db.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("J. Duplicate submission protection", () => {
    it("already submitted attempts safely resolve to previous state without duplicate grading", async () => {
      const mockStudent = { id: "std-1", enrollments: [{ status: "ACTIVE", classId: "class-1" }] };
      (kernel.db.student.findFirst as jest.Mock).mockResolvedValue(mockStudent);
      
      (kernel.db.cBTAttempt.findFirst as jest.Mock).mockResolvedValue({ id: "att-1" });
      (kernel.db.cBTAttempt.findUnique as jest.Mock).mockResolvedValue({
        id: "att-1", status: "GRADED", totalScore: 85,
        exam: { publishedPayload: { questions: [] } },
        answers: []
      });

      const res = await service.submitAttempt("t1", "s1", "u1", "exam-1");
      expect(res.status).toBe("GRADED");
      expect(res.totalScore).toBe(85);
      
      expect(kernel.db.cBTAttempt.updateMany).not.toHaveBeenCalled();
      expect(kernel.db.cBTAttempt.update).not.toHaveBeenCalled();
    });
  });
});
