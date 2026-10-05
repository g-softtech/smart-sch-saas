import { ResultsEngineService } from '../../academics/services/results-engine.service';
﻿import { Test, TestingModule } from "@nestjs/testing";
import { CBTCompilerService } from "./cbt-compiler.service";
import { TeacherAssignmentsService } from "../../academics/services/teacher-assignments.service";
import { ConflictException, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { WorkflowStatus, ScoreProvenance, ResultStatus, CBTAttemptStatus, QuestionType } from "@saas/core-platform";

// Mocking kernel to avoid actual DB hits and avoid ESM issues
const txMock = {
  gradebookSubmission: { findFirst: jest.fn(), create: jest.fn() },
  enrollment: { findFirst: jest.fn() },
  subjectResult: { findFirst: jest.fn(), create: jest.fn() },
  assessmentScore: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  scoreAuditLog: { create: jest.fn() },
  cBTAttempt: { update: jest.fn() },
  cBTAttemptAnswer: { update: jest.fn() }
};

jest.mock("@saas/core-platform", () => ({
  kernel: {
    db: {
      cBTExam: { findFirst: jest.fn(), findUnique: jest.fn() },
      cBTAttempt: { findMany: jest.fn(), findUnique: jest.fn() },
      teacherSubjectAssignment: { findFirst: jest.fn() },
      $transaction: jest.fn((cb) => cb(txMock))
    }
  },
  tenantContext: { run: jest.fn((ctx, cb) => cb()) },
  WorkflowStatus: { DRAFT: "DRAFT", SUBMITTED: "SUBMITTED", APPROVED: "APPROVED", PUBLISHED: "PUBLISHED" },
  ScoreProvenance: { MANUAL: "MANUAL", CBT_MANUAL_OVERRIDE: "CBT_MANUAL_OVERRIDE", CBT: "CBT" },
  ResultStatus: { DRAFT: "DRAFT", PUBLISHED: "PUBLISHED" },
  CBTAttemptStatus: { IN_PROGRESS: "IN_PROGRESS", SUBMITTED: "SUBMITTED", PENDING_REVIEW: "PENDING_REVIEW", GRADED: "GRADED" },
  QuestionType: { SUBJECTIVE: "SUBJECTIVE", MULTIPLE_CHOICE: "MULTIPLE_CHOICE" }
}));

const { kernel } = require("@saas/core-platform");

describe("CBTCompilerService & Authorization", () => {
  let compiler: CBTCompilerService;
  let assignmentService: jest.Mocked<TeacherAssignmentsService>;

  beforeEach(async () => {
    const assignMock = {
      checkTeacherGradingAuthority: jest.fn()
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CBTCompilerService, { provide: ResultsEngineService, useValue: { recalculateSubjectResult: jest.fn() } },
        { provide: TeacherAssignmentsService, useValue: assignMock }
      ]
    }).compile();

    compiler = module.get(CBTCompilerService);
    assignmentService = module.get(TeacherAssignmentsService);

    jest.clearAllMocks();
  });

  describe("Teacher Authorization (Phase 5G)", () => {
    const mockComponent = { academicYearId: "y1", termId: "t1", classId: "c1", subjectId: "sub1", armId: null, maxScore: 100 };
    beforeEach(() => {
      kernel.db.cBTExam.findUnique.mockResolvedValue({ id: "ex1", status: "CLOSED", assessmentComponent: mockComponent });
    });

    it("should reject teacher without matching TeacherSubjectAssignment", async () => {
      assignmentService.checkTeacherGradingAuthority.mockResolvedValue({ hasAuthority: false, isPrimary: false, reason: "Unauthorized" } as any);
      await expect(compiler.compileToGradebook("tenant1", "school1", "ex1", "teacher-1")).rejects.toThrow(ForbiddenException);
    });

    it("should accept valid TeacherSubjectAssignment authority", async () => {
      assignmentService.checkTeacherGradingAuthority.mockResolvedValue({ hasAuthority: true, isPrimary: true, scope: "CLASS_WIDE" as any, assignmentId: "a1" });
      kernel.db.cBTAttempt.findMany.mockResolvedValue([]); // return 0 attempts to end early
      const res = await compiler.compileToGradebook("tenant1", "school1", "ex1", "teacher-1");
      expect(res.success).toBe(true);
      expect(assignmentService.checkTeacherGradingAuthority).toHaveBeenCalledWith({
        tenantId: "tenant1", schoolId: "school1", teacherId: "teacher-1",
        academicYearId: "y1", termId: "t1", classId: "c1", subjectId: "sub1", armId: null
      });
    });
  });

  describe("Compilation Rules", () => {
    const mockComponent = { id: "comp1", academicYearId: "y1", termId: "t1", classId: "c1", subjectId: "sub1", maxScore: 100 };
    
    beforeEach(() => {
      assignmentService.checkTeacherGradingAuthority.mockResolvedValue({ hasAuthority: true, isPrimary: true, scope: "CLASS_WIDE" as any, assignmentId: "a1" });
    });

    it("should reject compilation if exam is OPEN/PUBLISHED", async () => {
      kernel.db.cBTExam.findUnique.mockResolvedValue({ id: "ex1", status: "PUBLISHED", assessmentComponent: mockComponent });
      await expect(compiler.compileToGradebook("t1", "s1", "ex1", "teacher")).rejects.toThrow(ConflictException);
    });

    it("should compile only GRADED attempts", async () => {
      kernel.db.cBTExam.findUnique.mockResolvedValue({ id: "ex1", status: "CLOSED", assessmentComponent: mockComponent });
      kernel.db.cBTAttempt.findMany.mockResolvedValue([]);
      
      await compiler.compileToGradebook("t1", "s1", "ex1", "teacher");
      
      expect(kernel.db.cBTAttempt.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: "GRADED" })
      });
    });
  });

  describe("Gradebook Integration & Idempotency", () => {
    const mockComponent = { id: "comp1", academicYearId: "y1", termId: "t1", classId: "c1", subjectId: "sub1", maxScore: 100 };
    
    beforeEach(() => {
      assignmentService.checkTeacherGradingAuthority.mockResolvedValue({ hasAuthority: true, isPrimary: true, scope: "CLASS_WIDE" as any, assignmentId: "a1" });
      kernel.db.cBTExam.findUnique.mockResolvedValue({ id: "ex1", status: "CLOSED", assessmentComponent: mockComponent });
      kernel.db.cBTAttempt.findMany.mockResolvedValue([{ id: "att1", studentId: "st1", totalScore: 85 }]);
      
      txMock.enrollment.findFirst.mockResolvedValue({ id: "enr1" });
      txMock.subjectResult.findFirst.mockResolvedValue({ id: "res1", status: "DRAFT" });
    });

    it("should reject compilation if GradebookSubmission is SUBMITTED/APPROVED", async () => {
      txMock.gradebookSubmission.findFirst.mockResolvedValue({ status: "SUBMITTED" });
      await expect(compiler.compileToGradebook("t1", "s1", "ex1", "teacher")).rejects.toThrow(ConflictException);
    });

    it("should create EXACTLY ONE AssessmentScore for a missing score, with provenance CBT", async () => {
      txMock.gradebookSubmission.findFirst.mockResolvedValue({ id: "subm1", status: "DRAFT" });
      txMock.assessmentScore.findFirst.mockResolvedValue(null); // missing
      txMock.assessmentScore.create.mockResolvedValue({ id: "score1" });

      const res = await compiler.compileToGradebook("t1", "s1", "ex1", "teacher");

      expect(res.compiledCount).toBe(1);
      expect(txMock.assessmentScore.create).toHaveBeenCalledWith(expect.objectContaining({
         data: expect.objectContaining({ provenance: "CBT", score: 85, assessmentComponentId: "comp1" })
      }));
    });

    it("should preserve existing MANUAL score", async () => {
      txMock.gradebookSubmission.findFirst.mockResolvedValue({ id: "subm1", status: "DRAFT" });
      txMock.assessmentScore.findFirst.mockResolvedValue({ id: "score1", score: 90, provenance: "MANUAL" });
      
      const res = await compiler.compileToGradebook("t1", "s1", "ex1", "teacher");

      expect(res.skippedCount).toBe(1);
      expect(res.compiledCount).toBe(0);
      expect(txMock.assessmentScore.update).not.toHaveBeenCalled();
    });

    it("should preserve existing CBT_MANUAL_OVERRIDE score", async () => {
      txMock.gradebookSubmission.findFirst.mockResolvedValue({ id: "subm1", status: "DRAFT" });
      txMock.assessmentScore.findFirst.mockResolvedValue({ id: "score1", score: 95, provenance: "CBT_MANUAL_OVERRIDE" });
      
      const res = await compiler.compileToGradebook("t1", "s1", "ex1", "teacher");

      expect(res.skippedCount).toBe(1);
      expect(txMock.assessmentScore.update).not.toHaveBeenCalled();
    });

    it("should overwrite/update existing CBT score (idempotent)", async () => {
      txMock.gradebookSubmission.findFirst.mockResolvedValue({ id: "subm1", status: "DRAFT" });
      txMock.assessmentScore.findFirst.mockResolvedValue({ id: "score1", score: 80, provenance: "CBT" });
      
      const res = await compiler.compileToGradebook("t1", "s1", "ex1", "teacher");

      expect(res.compiledCount).toBe(1);
      expect(txMock.assessmentScore.update).toHaveBeenCalledWith(expect.objectContaining({
         where: { id: "score1" },
         data: expect.objectContaining({ score: 85, provenance: "CBT" })
      }));
    });
  });
});
