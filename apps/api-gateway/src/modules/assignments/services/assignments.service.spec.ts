import { Test, TestingModule } from "@nestjs/testing";
import { AssignmentsService } from "./assignments.service";
import { ResultsService } from "../../academics/services/results.service";
import { kernel } from "@saas/core-platform";
import { NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";

describe("AssignmentsService (Unit)", () => {
  let service: AssignmentsService;
  let resultsService: jest.Mocked<ResultsService>;

  const mockResultsService = {
    recordScore: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: ResultsService, useValue: mockResultsService },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
    resultsService = module.get(ResultsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("createAssignment", () => {
    it("creates an assessment component and assignment transactionally", async () => {
      jest.spyOn(kernel.db.academicYear, "findUnique").mockResolvedValue({ id: "ay-1", tenantId: "tenant-1", schoolId: "school-1" } as any);
      jest.spyOn(kernel.db.term, "findUnique").mockResolvedValue({ id: "t-1", tenantId: "tenant-1", academicYearId: "ay-1" } as any);
      jest.spyOn(kernel.db.class, "findUnique").mockResolvedValue({ id: "c-1", tenantId: "tenant-1", schoolId: "school-1" } as any);
      jest.spyOn(kernel.db.subject, "findUnique").mockResolvedValue({ id: "sub-1", tenantId: "tenant-1", schoolId: "school-1" } as any);
      jest.spyOn(kernel.db.staffProfile, "findUnique").mockResolvedValue({ id: "stf-1", tenantId: "tenant-1", schoolId: "school-1" } as any);

      jest.spyOn(kernel.db, "$transaction").mockImplementation(async (cb: any) => {
        return cb({
          assessmentComponent: {
            create: jest.fn().mockResolvedValue({ id: "comp-1" }),
          },
          assignment: {
            create: jest.fn().mockResolvedValue({ id: "asg-1", title: "Math Homework", status: "DRAFT" }),
          },
        });
      });

      const result = await service.createAssignment("tenant-1", "school-1", "stf-1", {
        academicYearId: "ay-1",
        termId: "t-1",
        classId: "c-1",
        subjectId: "sub-1",
        title: "Math Homework",
        description: "Solve problems 1-10",
        dueDate: "2026-10-01T12:00:00.000Z",
        maxScore: 100,
      });

      expect(result).toEqual({ id: "asg-1", title: "Math Homework", status: "DRAFT" });
    });
  });

  describe("gradeSubmission", () => {
    it("grades a submission and records score in ResultsService", async () => {
      jest.spyOn(kernel.db.assignment, "findUnique").mockResolvedValue({
        id: "asg-1",
        tenantId: "tenant-1",
        schoolId: "school-1",
        status: "PUBLISHED",
        assessmentComponentId: "comp-1",
        assessmentComponent: {
          academicYearId: "ay-1",
          termId: "t-1",
          classId: "c-1",
          subjectId: "sub-1",
          maxScore: 100,
        },
      } as any);

      jest.spyOn(kernel.db.assignmentSubmission, "findUnique").mockResolvedValue({
        id: "subm-1",
        studentId: "stu-1",
        assignmentId: "asg-1",
      } as any);

      jest.spyOn(kernel.db.enrollment, "findFirst").mockResolvedValue({
        id: "enr-1",
        studentId: "stu-1",
        status: "ACTIVE",
      } as any);

      jest.spyOn(kernel.db.assignmentSubmission, "update").mockResolvedValue({
        id: "subm-1",
        score: 85,
        status: "GRADED",
      } as any);

      const result = await service.gradeSubmission(
        "tenant-1",
        "school-1",
        "stf-1",
        "asg-1",
        "stu-1",
        { score: 85, feedback: "Great work!" },
      );

      expect(mockResultsService.recordScore).toHaveBeenCalledWith("tenant-1", "school-1", {
        academicYearId: "ay-1",
        termId: "t-1",
        studentId: "stu-1",
        subjectId: "sub-1",
        type: "ASSIGNMENT",
        assessmentComponentId: "comp-1",
        maxScore: 100,
        score: 85,
      });

      expect(result).toEqual({ id: "subm-1", score: 85, status: "GRADED" });
    });
  });
});
