import { Test, TestingModule } from "@nestjs/testing";
import { ArrivalService } from "./arrival.service";
import { StudentCredentialService } from "../../id-cards/services/student-credential.service";
import { IdempotencyService } from "@saas/core-platform";
import { BadRequestException, ConflictException } from "@nestjs/common";

const mockTransaction = jest.fn();

jest.mock("@saas/core-platform", () => ({
  kernel: {
    db: {
      $transaction: (cb: any) => cb({
        studentArrival: { create: mockTransaction },
        domainEventLog: { create: mockTransaction },
        outboxQueue: { create: mockTransaction },
        auditLog: { create: mockTransaction },
      }),
    },
  },
  OutboxStatus: {
    PENDING: "PENDING",
  }
}));

describe("ArrivalService", () => {
  let arrivalService: ArrivalService;
  let credentialService: jest.Mocked<StudentCredentialService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArrivalService,
        {
          provide: StudentCredentialService,
          useValue: {
            verifyCredential: jest.fn(),
          },
        },
        {
          provide: IdempotencyService,
          useValue: {
            withIdempotency: jest.fn().mockImplementation(async (db, name, opId, cb) => cb(db)),
          },
        },
      ],
    }).compile();

    arrivalService = module.get<ArrivalService>(ArrivalService);
    credentialService = module.get(StudentCredentialService);

    jest.clearAllMocks();
  });

  describe("recordArrival", () => {
    const tenantId = "tenant-1";
    const schoolId = "school-1";
    const operatorId = "operator-1";
    const rawToken = "raw-token";

    it("should successfully record arrival and outbox events in a single transaction", async () => {
      // Mock successful verification
      credentialService.verifyCredential.mockResolvedValue({
        success: true,
        student: {
          id: "student-1",
          firstName: "John",
          lastName: "Doe",
          studentNumber: "STU-1",
          status: "ENROLLED"
        }
      });

      mockTransaction.mockResolvedValue({ id: "arrival-id-1" });

      const result = await arrivalService.recordArrival(tenantId, schoolId, operatorId, rawToken, "CAMERA");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Arrival Recorded");
      expect(credentialService.verifyCredential).toHaveBeenCalledWith(
        tenantId,
        schoolId,
        operatorId,
        rawToken,
        "CAMERA"
      );
      
      // Ensure transaction created 4 records (arrival, event, outbox, audit)
      expect(mockTransaction).toHaveBeenCalledTimes(4);

      // Verify the raw token is ABSENT from the domain event log
      const eventCall = mockTransaction.mock.calls.find(c => c[0].data?.eventType === "StudentArrivalEvent");
      expect(eventCall).toBeDefined();
      expect(eventCall[0].data.payload.token).toBeUndefined();
      expect(eventCall[0].data.payload.studentId).toBe("student-1");
    });

    it("should handle duplicate arrival via Prisma unique constraint P2002", async () => {
      credentialService.verifyCredential.mockResolvedValue({
        success: true,
        student: { id: "student-1" } as any
      });

      // Simulate a unique constraint failure when creating StudentArrival
      mockTransaction.mockRejectedValueOnce({ code: "P2002" });

      await expect(arrivalService.recordArrival(tenantId, schoolId, operatorId, rawToken, "CAMERA"))
        .rejects
        .toThrow(new ConflictException("Already Arrived"));
    });

    it("should fail generically for invalid or revoked credential (delegated to credentialService)", async () => {
      // credentialService throws BadRequestException for revoked
      credentialService.verifyCredential.mockRejectedValue(new BadRequestException("Credential could not be verified"));

      await expect(arrivalService.recordArrival(tenantId, schoolId, operatorId, rawToken, "EXTERNAL"))
        .rejects
        .toThrow(new BadRequestException("Credential could not be verified"));
      
      // Transaction should not have been initiated
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it("should safely rollback and throw if outbox creation fails", async () => {
      credentialService.verifyCredential.mockResolvedValue({
        success: true,
        student: { id: "student-1" } as any
      });

      // Transaction throws non-P2002 error
      const err = new Error("Database connection lost");
      mockTransaction.mockRejectedValue(err);

      await expect(arrivalService.recordArrival(tenantId, schoolId, operatorId, rawToken, "EXTERNAL"))
        .rejects
        .toThrow(err);
    });
  });
});
