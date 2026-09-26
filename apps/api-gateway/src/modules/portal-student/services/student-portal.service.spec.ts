import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { StudentPortalService } from "./student-portal.service";
import { AssignmentsService } from "../../assignments/services/assignments.service";
import { CBTService } from "../../cbt/services/cbt.service";
import { kernel } from "@saas/core-platform";

describe("StudentPortalService Security & BFF Unit Tests", () => {
  let service: StudentPortalService;
  let assignmentsService: jest.Mocked<AssignmentsService>;
  let cbtService: jest.Mocked<CBTService>;

  const tenantId = "tenant-123";
  const schoolId = "school-456";
  const userId = "user-789";
  const studentId = "student-111";

  const mockStudent = {
    id: studentId,
    tenantId,
    schoolId,
    userId,
    studentNumber: "STU-0001",
    firstName: "Alex",
    lastName: "Smith",
    middleName: null,
    gender: "MALE",
    admissionDate: new Date("2026-01-01"),
    status: "ACTIVE",
    enrollments: [
      {
        id: "enrollment-1",
        academicYearId: "year-1",
        classId: "class-1",
        armId: "arm-1",
        academicYear: { name: "2026/2027" },
        class: { name: "Grade 1B" },
        arm: { name: "Blue" },
      },
    ],
  };

  beforeEach(async () => {
    const assignmentsServiceMock = {
      getAssignmentsForClass: jest.fn().mockResolvedValue([
        {
          id: "asg-1",
          title: "Math Homework 1",
          status: "PUBLISHED",
          dueDate: new Date(),
          assessmentComponent: { maxScore: 100 },
        },
      ]),
      submitAssignment: jest.fn().mockResolvedValue({ id: "sub-1", status: "SUBMITTED" }),
    };

    const cbtServiceMock = {
      getCBTExamsForClass: jest.fn().mockResolvedValue([
        {
          id: "exam-1",
          title: "Mid-Term Exam",
          durationMinutes: 60,
          maxScore: 50,
          status: "ACTIVE",
          availableFrom: new Date(),
          availableTo: new Date(),
        },
      ]),
      startAttempt: jest.fn().mockResolvedValue({ id: "att-1", status: "IN_PROGRESS" }),
      submitAttempt: jest.fn().mockResolvedValue({ id: "att-1", status: "GRADED", totalScore: 45 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentPortalService,
        { provide: AssignmentsService, useValue: assignmentsServiceMock },
        { provide: CBTService, useValue: cbtServiceMock },
      ],
    }).compile();

    service = module.get<StudentPortalService>(StudentPortalService);
    assignmentsService = module.get(AssignmentsService);
    cbtService = module.get(CBTService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("resolveStudent Strategy", () => {
    it("should resolve student profile matching authenticated userId and workspace context", async () => {
      jest.spyOn(kernel.db.student, "findFirst").mockResolvedValueOnce(mockStudent as any);

      const result = await service.getProfile(userId, tenantId, schoolId);

      expect(result.id).toBe(studentId);
      expect(result.studentNumber).toBe("STU-0001");
      expect(result.firstName).toBe("Alex");
      expect(result.activeEnrollment?.className).toBe("Grade 1B");
    });

    it("should reject safely with ForbiddenException if no student profile matches userId", async () => {
      jest.spyOn(kernel.db.student, "findFirst").mockResolvedValue(null as any);
      jest.spyOn(kernel.db.user, "findUnique").mockResolvedValue(null as any);

      await expect(service.getProfile("unlinked-user", tenantId, schoolId)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe("Student Self-Isolation & Submissions", () => {
    it("should process assignment submission using resolved student identity rather than client parameter", async () => {
      jest.spyOn(kernel.db.student, "findFirst").mockResolvedValueOnce(mockStudent as any);

      const result = await service.submitAssignment(userId, tenantId, schoolId, "asg-1", {
        textContent: "Solution text",
      });

      expect(assignmentsService.submitAssignment).toHaveBeenCalledWith(
        tenantId,
        schoolId,
        studentId, // Verified resolved studentId passed
        "asg-1",
        { textContent: "Solution text" }
      );
      expect(result.status).toBe("SUBMITTED");
    });

    it("should start CBT attempt using resolved student identity", async () => {
      jest.spyOn(kernel.db.student, "findFirst").mockResolvedValueOnce(mockStudent as any);

      const result = await service.startCBTAttempt(userId, tenantId, schoolId, "exam-1");

      expect(cbtService.startAttempt).toHaveBeenCalledWith(
        tenantId,
        schoolId,
        studentId, // Verified resolved studentId
        "exam-1"
      );
      expect(result.status).toBe("IN_PROGRESS");
    });
  });

  describe("Digital Credentials & Results", () => {
    it("should throw NotFoundException if no active digital credential exists for student", async () => {
      jest.spyOn(kernel.db.student, "findFirst").mockResolvedValueOnce(mockStudent as any);
      jest.spyOn(kernel.db.studentCredential, "findFirst").mockResolvedValueOnce(null as any);

      await expect(service.getCredential(userId, tenantId, schoolId)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
