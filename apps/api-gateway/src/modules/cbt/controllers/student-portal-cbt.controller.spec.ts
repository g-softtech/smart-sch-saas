import { Test, TestingModule } from "@nestjs/testing";

// Prevent ESM loader crash caused by underlying dependencies in the monorepo
jest.mock("@nestjs/event-emitter", () => ({
  EventEmitter2: class {},
  OnEvent: jest.fn()
}));

import { StudentPortalCBTController } from "./student-portal-cbt.controller";
import { CBTAttemptService } from "../services/cbt-attempt.service";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { PoliciesGuard } from "../../identity/security/policies.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { UseGuards, UseInterceptors } from "@nestjs/common";

describe("StudentPortalCBTController Dedicated Boundary", () => {
  let controller: StudentPortalCBTController;
  let attemptService: jest.Mocked<CBTAttemptService>;

  beforeEach(async () => {
    const attemptServiceMock = {
      startAttempt: jest.fn().mockResolvedValue({ status: "IN_PROGRESS" }),
      saveAnswer: jest.fn().mockResolvedValue({ success: true }),
      submitAttempt: jest.fn().mockResolvedValue({ status: "SUBMITTED" })
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentPortalCBTController],
      providers: [
        { provide: CBTAttemptService, useValue: attemptServiceMock },
      ]
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: jest.fn(() => true) })
    .overrideGuard(PoliciesGuard).useValue({ canActivate: jest.fn(() => true) })
    .overrideInterceptor(WorkspaceContextInterceptor).useValue({ intercept: jest.fn((ctx, next) => next.handle()) })
    .compile();

    controller = module.get(StudentPortalCBTController);
    attemptService = module.get(CBTAttemptService);
  });

  describe("Structural Verification (Metadata)", () => {
    it("should be decorated with JwtAuthGuard and PoliciesGuard", () => {
      const guards = Reflect.getMetadata("__guards__", StudentPortalCBTController);
      expect(guards).toBeDefined();
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(PoliciesGuard);
    });

    it("should be decorated with WorkspaceContextInterceptor", () => {
      const interceptors = Reflect.getMetadata("__interceptors__", StudentPortalCBTController);
      expect(interceptors).toBeDefined();
      expect(interceptors).toContain(WorkspaceContextInterceptor);
    });
  });

  describe("Behavioral Boundary Enforcement", () => {
    it("should pull student identity from req.user.sub and ignore body.studentId", async () => {
      const req = { 
        user: { sub: "auth0|valid-user" }, 
        workspace: { tenantId: "t1", schoolId: "s1" } 
      };
      const examId = "exam-123";
      
      await controller.startAttempt(req, examId);

      expect(attemptService.startAttempt).toHaveBeenCalledWith(
        "t1", 
        "s1", 
        "auth0|valid-user", 
        examId
      );

      expect(attemptService.startAttempt).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        "attacker-student-id",
        expect.anything()
      );
    });

    it("should save answer using req.user.sub, ignoring injected IDs", async () => {
      const req = { user: { sub: "auth0|valid-user" }, workspace: { tenantId: "t1", schoolId: "s1" } };
      const dto = { answerPayload: { selectedOption: "A" }, studentId: "attacker" };
      
      await controller.saveAnswer(req, "exam-1", dto);
      
      expect(attemptService.saveAnswer).toHaveBeenCalledWith(
        "t1", "s1", "auth0|valid-user", "exam-1", dto
      );
    });
    
    it("should submit attempt using req.user.sub", async () => {
      const req = { user: { sub: "auth0|valid-user" }, workspace: { tenantId: "t1", schoolId: "s1" } };
      
      await controller.submitAttempt(req, "exam-1");
      
      expect(attemptService.submitAttempt).toHaveBeenCalledWith(
        "t1", "s1", "auth0|valid-user", "exam-1"
      );
    });
  });
});
