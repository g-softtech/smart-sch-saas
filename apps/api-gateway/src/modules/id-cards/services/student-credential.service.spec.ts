import { Test, TestingModule } from "@nestjs/testing";
import { StudentCredentialService } from "./student-credential.service";
import { StudentCredentialRepository } from "../repositories/student-credential.repository";
import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "crypto";

describe("StudentCredentialService", () => {
  let service: StudentCredentialService;
  let repository: StudentCredentialRepository;

  const mockRepository = {
    create: jest.fn(),
    findActiveByStudent: jest.fn(),
    revoke: jest.fn(),
    findAllByStudent: jest.fn(),
    findByHashAndWorkspace: jest.fn(),
  };

  // Setup globals for mocking the audit log which relies on imported kernel
  jest.mock("@saas/core-platform", () => ({
    kernel: {
      db: {
        auditLog: {
          create: jest.fn(),
        },
      },
    },
    CredentialStatus: {
      ISSUED: "ISSUED",
      ACTIVE: "ACTIVE",
      REVOKED: "REVOKED",
      REPLACED: "REPLACED"
    }
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentCredentialService,
        {
          provide: StudentCredentialRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<StudentCredentialService>(StudentCredentialService);
    repository = module.get<StudentCredentialRepository>(StudentCredentialRepository);
    
    // Clear mocks before each test
    jest.clearAllMocks();
  });

  describe("verifyCredential", () => {
    const tenantId = "tenant-1";
    const schoolId = "school-1";
    const operatorId = "operator-1";
    const rawToken = "raw-token-123";

    it("should succeed for a valid ACTIVE credential", async () => {
      mockRepository.findByHashAndWorkspace.mockResolvedValue({
        id: "cred-1",
        tenantId,
        schoolId,
        status: "ACTIVE",
        student: {
          id: "student-1",
          firstName: "John",
          lastName: "Doe",
          studentNumber: "STU-1",
          status: "ENROLLED"
        }
      });

      const result = await service.verifyCredential(tenantId, schoolId, operatorId, rawToken, "CAMERA");
      expect(result.success).toBe(true);
      expect(result.student).toEqual({
        id: "student-1",
        firstName: "John",
        lastName: "Doe",
        studentNumber: "STU-1",
        status: "ENROLLED"
      });
      // The raw token and hash must NOT be in the response
      expect((result as any).credentialHash).toBeUndefined();
      expect((result as any).token).toBeUndefined();
    });

    it("should fail generically for REVOKED credential", async () => {
      mockRepository.findByHashAndWorkspace.mockResolvedValue({
        id: "cred-1",
        tenantId,
        schoolId,
        status: "REVOKED",
        student: { id: "student-1" }
      });

      await expect(service.verifyCredential(tenantId, schoolId, operatorId, rawToken, "EXTERNAL"))
        .rejects
        .toThrow(new BadRequestException("Credential could not be verified"));
    });

    it("should fail generically for REPLACED credential", async () => {
      mockRepository.findByHashAndWorkspace.mockResolvedValue({
        id: "cred-1",
        tenantId,
        schoolId,
        status: "REPLACED",
        student: { id: "student-1" }
      });

      await expect(service.verifyCredential(tenantId, schoolId, operatorId, rawToken, "CAMERA"))
        .rejects
        .toThrow(new BadRequestException("Credential could not be verified"));
    });

    it("should fail generically when credential is not found (cross-workspace isolation)", async () => {
      // simulate repository returning null because tenantId/schoolId don't match the credential's hash
      mockRepository.findByHashAndWorkspace.mockResolvedValue(null);

      await expect(service.verifyCredential("tenant-2", "school-2", operatorId, rawToken, "EXTERNAL"))
        .rejects
        .toThrow(new BadRequestException("Credential could not be verified"));
    });
  });
});
