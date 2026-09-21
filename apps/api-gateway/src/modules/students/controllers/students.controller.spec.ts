import { Test, TestingModule } from "@nestjs/testing";
import { StudentsController } from "./students.controller";
import { StudentsService } from "../services/students.service";
import { BadRequestException } from "@nestjs/common";
import { CreateStudentDto } from "../dto/students.dto";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";

describe("StudentsController Security", () => {
  let controller: StudentsController;
  let service: jest.Mocked<StudentsService>;

  beforeEach(async () => {
    const mockService = {
      createStudent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentsController],
      providers: [{ provide: StudentsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideInterceptor(WorkspaceContextInterceptor)
      .useValue({ intercept: jest.fn((context, next) => next.handle()) })
      .compile();

    controller = module.get<StudentsController>(StudentsController);
    service = module.get(StudentsService) as jest.Mocked<StudentsService>;
  });

  afterEach(() => jest.clearAllMocks());

  describe("createStudent schoolId security", () => {
    const validDto = {
      firstName: "Ada",
      lastName: "Okonkwo",
      gender: "FEMALE" as any,
      admissionDate: "2026-09-01",
    };

    it("valid workspace -> student creation succeeds using workspace schoolId", async () => {
      const req = { workspace: { tenantId: "tenant-1", schoolId: "school-1" } };
      service.createStudent.mockResolvedValueOnce({ id: "stu-1" } as any);

      const result = await controller.createStudent(
        req,
        validDto as CreateStudentDto,
      );

      expect(result.success).toBe(true);
      expect(service.createStudent).toHaveBeenCalledWith(
        expect.objectContaining({
          schoolId: "school-1",
          firstName: "Ada",
        }),
      );
    });

    it("client-supplied schoolId cannot override workspace schoolId", async () => {
      const req = {
        workspace: { tenantId: "tenant-1", schoolId: "school-workspace" },
      };
      // Simulate malicious client injecting schoolId into DTO payload
      const maliciousDto = { ...validDto, schoolId: "school-malicious" };

      service.createStudent.mockResolvedValueOnce({ id: "stu-1" } as any);

      await controller.createStudent(req, maliciousDto as CreateStudentDto);

      // Must use the workspace schoolId, ignoring the DTO completely
      expect(service.createStudent).toHaveBeenCalledWith(
        expect.objectContaining({
          schoolId: "school-workspace",
        }),
      );
    });

    it("missing/invalid workspace school context is rejected appropriately", async () => {
      const req = { workspace: { tenantId: "tenant-1" } }; // missing schoolId

      await expect(
        controller.createStudent(req, validDto as CreateStudentDto),
      ).rejects.toThrow(BadRequestException);

      expect(service.createStudent).not.toHaveBeenCalled();
    });
  });
});
