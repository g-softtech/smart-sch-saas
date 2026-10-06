import { Test, TestingModule } from "@nestjs/testing";
import { AdminCBTService } from "./admin-cbt.service";
import { kernel, Prisma, QuestionType, CBTStatus } from "@saas/core-platform";
import { BadRequestException } from "@nestjs/common";

describe("AdminCBTService - Question Authoring & Publishing", () => {
  let service: AdminCBTService;
  
  const tenantId = "tenant-admin-test";
  const schoolId = "school-admin-test";
  const examId = "exam-admin-test";
  const componentId = "comp-admin-test";
  const staffId = "staff-admin-test";

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminCBTService, { provide: "AuditService", useValue: { log: jest.fn() } }],
    }).compile();
    service = module.get<AdminCBTService>(AdminCBTService);

    await kernel.db.cBTAttemptAnswer.deleteMany({ where: { attempt: { examId } } });
    await kernel.db.cBTAttempt.deleteMany({ where: { examId } });
    await kernel.db.cBTQuestion.deleteMany({ where: { examId } });
    await kernel.db.cBTExam.deleteMany({ where: { id: examId } });
    await kernel.db.assessmentComponent.deleteMany({ where: { id: componentId } });
    await kernel.db.assessmentType.deleteMany({ where: { id: "at1" } });
    await kernel.db.staffProfile.deleteMany({ where: { id: staffId } });

    await kernel.db.tenant.create({ data: { id: tenantId, name: "T", slug: "t" } }).catch(() => {});
    await kernel.db.school.create({ data: { id: schoolId, tenantId, name: "S" } }).catch(() => {});
    await kernel.db.academicYear.create({ data: { id: "y1", tenantId, schoolId, name: "Y", startDate: new Date(), endDate: new Date() } }).catch(() => {});
    await kernel.db.term.create({ data: { id: "t1", tenantId, name: "T", academicYearId: "y1", startDate: new Date(), endDate: new Date() } }).catch(() => {});
    await kernel.db.class.create({ data: { id: "c1", tenantId, schoolId, name: "C" } }).catch(() => {});
    await kernel.db.subject.create({ data: { id: "s1", tenantId, schoolId, name: "S" } }).catch(() => {});


    await kernel.db.staffProfile.create({
      data: { id: staffId, tenantId, schoolId, userId: "u", email: "a@a.com", firstName: "A", lastName: "A", status: "ACTIVE", staffNumber: "S123", joiningDate: new Date(), type: "TEACHING" }
    });

    await kernel.db.assessmentType.create({
      data: { id: "at1", tenantId, schoolId, name: "EXAM", code: "EX", description: "Exam" }
    });

    await kernel.db.assessmentComponent.create({
      data: {
        id: componentId, tenantId, schoolId, title: "Test Comp", assessmentTypeId: "at1", maxScore: 10, weight: 10,
        academicYearId: "y1", termId: "t1", classId: "c1", subjectId: "s1"
      }
    });

    await kernel.db.cBTExam.create({
      data: {
        id: examId, tenantId, schoolId, assessmentComponentId: componentId,
        teacherId: staffId, title: "Test Exam", durationMinutes: 60,
        availableFrom: new Date(), availableTo: new Date(), status: CBTStatus.DRAFT
      }
    });
  });

  afterAll(async () => {
    await kernel.db.cBTQuestion.deleteMany({ where: { examId } });
    await kernel.db.cBTExam.deleteMany({ where: { id: examId } });
    await kernel.db.assessmentComponent.deleteMany({ where: { id: componentId } });
    await kernel.db.assessmentType.deleteMany({ where: { id: "at1" } });
    await kernel.db.staffProfile.deleteMany({ where: { id: staffId } });
  });

  it("1. should support SINGLE_CHOICE with valid correctOption", async () => {
    await service.syncQuestions(tenantId, schoolId, examId, {
      questions: [{
        questionType: QuestionType.SINGLE_CHOICE,
        questionText: "What is 2+2?",
        points: 10,
        options: ["3", "4", "5"],
        correctOption: 1,
      }]
    });
    
    // Attempt publish to verify validation passes
    const res = await service.publishExam(tenantId, schoolId, examId, "user", "127.0.0.1");
    expect(res.success).toBe(true);

    // Verify snapshot
    const updatedExam = await kernel.db.cBTExam.findUnique({ where: { id: examId } });
    const grading = updatedExam!.publishedPayload as any;
    expect(grading.questions[0].correctOption).toBe(1);
    
    // Reset back to DRAFT for further tests
    await kernel.db.cBTExam.update({ where: { id: examId }, data: { status: CBTStatus.DRAFT } });
  });

  it("2. should support MULTIPLE_CHOICE with correctAnswerPayload", async () => {
    await service.syncQuestions(tenantId, schoolId, examId, {
      questions: [{
        questionType: QuestionType.MULTIPLE_CHOICE,
        questionText: "Which are prime?",
        points: 10,
        options: ["2", "3", "4", "5"],
        correctAnswerPayload: { correctOptions: [0, 1, 3] },
      }]
    });
    
    const res = await service.publishExam(tenantId, schoolId, examId, "user", "127.0.0.1");
    expect(res.success).toBe(true);

    const updatedExam = await kernel.db.cBTExam.findUnique({ where: { id: examId } });
    const grading = updatedExam!.publishedPayload as any;
    expect(grading.questions[0].correctAnswerPayload.correctOptions).toEqual([0, 1, 3]);

    await kernel.db.cBTExam.update({ where: { id: examId }, data: { status: CBTStatus.DRAFT } });
  });

  it("3. should support TRUE_FALSE with correctOption", async () => {
    await service.syncQuestions(tenantId, schoolId, examId, {
      questions: [{
        questionType: QuestionType.TRUE_FALSE,
        questionText: "Sky is blue",
        points: 10,
        options: ["True", "False"],
        correctOption: 0,
      }]
    });
    
    const res = await service.publishExam(tenantId, schoolId, examId, "user", "127.0.0.1");
    expect(res.success).toBe(true);
    await kernel.db.cBTExam.update({ where: { id: examId }, data: { status: CBTStatus.DRAFT } });
  });

  it("4. should support SUBJECTIVE without automatic answer key", async () => {
    await service.syncQuestions(tenantId, schoolId, examId, {
      questions: [{
        questionType: QuestionType.SUBJECTIVE,
        questionText: "Write an essay",
        points: 10,
      }]
    });
    
    const res = await service.publishExam(tenantId, schoolId, examId, "user", "127.0.0.1");
    expect(res.success).toBe(true);
    await kernel.db.cBTExam.update({ where: { id: examId }, data: { status: CBTStatus.DRAFT } });
  });

  it("5. should reject invalid MULTIPLE_CHOICE with no correct option array", async () => {
    await service.syncQuestions(tenantId, schoolId, examId, {
      questions: [{
        questionType: QuestionType.MULTIPLE_CHOICE,
        questionText: "Which are prime?",
        points: 10,
        options: ["2", "3", "4", "5"],
        // Missing correctAnswerPayload
      }]
    });
    
    await expect(service.publishExam(tenantId, schoolId, examId, "u", "ip")).rejects.toThrow(BadRequestException);
  });

  it("6. should reject invalid SINGLE_CHOICE missing correctOption", async () => {
    await service.syncQuestions(tenantId, schoolId, examId, {
      questions: [{
        questionType: QuestionType.SINGLE_CHOICE,
        questionText: "Q",
        points: 10,
        options: ["1", "2"],
      }]
    });
    
    await expect(service.publishExam(tenantId, schoolId, examId, "u", "ip")).rejects.toThrow(BadRequestException);
  });

  it("7. should reject invalid/missing points", async () => {
    await service.syncQuestions(tenantId, schoolId, examId, {
      questions: [{
        questionType: QuestionType.SUBJECTIVE,
        questionText: "Q",
        points: 0, // Invalid point
      }]
    });
    
    await expect(service.publishExam(tenantId, schoolId, examId, "u", "ip")).rejects.toThrow(BadRequestException);
  });

  it("8. should reject if sum of points mismatch AssessmentComponent maxScore", async () => {
    await service.syncQuestions(tenantId, schoolId, examId, {
      questions: [{
        questionType: QuestionType.SUBJECTIVE,
        questionText: "Q",
        points: 5, // maxScore is 10
      }]
    });
    
    await expect(service.publishExam(tenantId, schoolId, examId, "u", "ip")).rejects.toThrow(BadRequestException);
  });

  it("9. published snapshot contains keys, presentation snapshot does not", async () => {
    await service.syncQuestions(tenantId, schoolId, examId, {
      questions: [{
        questionType: QuestionType.SINGLE_CHOICE,
        questionText: "Q",
        points: 10,
        options: ["A", "B"],
        correctOption: 0
      }]
    });
    
    await service.publishExam(tenantId, schoolId, examId, "user", "127.0.0.1");

    const exam = await kernel.db.cBTExam.findUnique({ where: { id: examId } });
    const grading = exam!.publishedPayload as any;
    const presentation = exam!.presentationPayload as any;

    expect(grading.questions[0].correctOption).toBeDefined();
    expect(presentation.questions[0].correctOption).toBeUndefined();
    expect(presentation.questions[0].correctAnswerPayload).toBeUndefined();
  });
});
