import { Test, TestingModule } from "@nestjs/testing";
import { StudentPortalService } from "./student-portal.service";
import { AssignmentsService } from "../../assignments/services/assignments.service";
import { CBTService } from "../../cbt/services/cbt.service";

jest.mock("@saas/core-platform", () => ({
  kernel: {
    db: {
      student: { findFirst: jest.fn().mockResolvedValue({ id: "student-1", tenantId: "t1", schoolId: "s1", enrollments: [{ classId: "class-1" }] }) },
      cBTAttempt: { findMany: jest.fn().mockResolvedValue([]) },
    }
  },
  tenantContext: {
    run: jest.fn((ctx, cb) => cb())
  }
}));

describe("StudentPortalService Read-Only BFF & Cleanup Verification", () => {
  let service: StudentPortalService;
  let cbtService: jest.Mocked<CBTService>;

  beforeEach(async () => {
    const assignmentsServiceMock = { getAssignmentsForClass: jest.fn() };
    const cbtServiceMock = {
      getExamsForClass: jest.fn().mockResolvedValue([{ id: "exam-1", title: "Mid-Term Exam" }]),
      getAttemptByStudentId: jest.fn().mockResolvedValue(null)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentPortalService,
        { provide: AssignmentsService, useValue: assignmentsServiceMock },
        { provide: CBTService, useValue: cbtServiceMock },
      ],
    }).compile();

    service = module.get<StudentPortalService>(StudentPortalService);
    cbtService = module.get(CBTService);
  });

  it("should verify existing read-only CBT dashboard/query behavior does not regress", async () => {
    const exams = await service.getCBTExams("user-1", "t1", "s1");
    expect(exams).toBeDefined();
    expect(exams.length).toBe(1);
    expect(exams[0].title).toBe("Mid-Term Exam");
    expect(cbtService.getExamsForClass).toHaveBeenCalled();
  });

  it("should prove legacy startCBTAttempt mutation wrapper is gone (inaccessible)", () => {
    expect((service as any).startCBTAttempt).toBeUndefined();
  });

  it("should prove legacy submitCBTAttempt mutation wrapper is gone (inaccessible)", () => {
    expect((service as any).submitCBTAttempt).toBeUndefined();
  });
});
