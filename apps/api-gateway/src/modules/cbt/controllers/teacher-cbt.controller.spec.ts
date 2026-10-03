import { Test, TestingModule } from "@nestjs/testing";

jest.mock("@nestjs/event-emitter", () => ({
  EventEmitter2: class {},
  OnEvent: jest.fn()
}));

import { TeacherCBTController } from "./teacher-cbt.controller";
import { CBTCompilerService } from "../services/cbt-compiler.service";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { PoliciesGuard } from "../../identity/security/policies.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { UseGuards, UseInterceptors } from "@nestjs/common";

describe("TeacherCBTController Security & Boundary", () => {
  let controller: TeacherCBTController;
  let compilerService: jest.Mocked<CBTCompilerService>;

  beforeEach(async () => {
    const compilerServiceMock = {
      reviewAttempt: jest.fn(),
      compileToGradebook: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeacherCBTController],
      providers: [
        { provide: CBTCompilerService, useValue: compilerServiceMock },
      ]
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: jest.fn(() => true) })
    .overrideGuard(PoliciesGuard).useValue({ canActivate: jest.fn(() => true) })
    .overrideInterceptor(WorkspaceContextInterceptor).useValue({ intercept: jest.fn((ctx, next) => next.handle()) })
    .compile();

    controller = module.get(TeacherCBTController);
    compilerService = module.get(CBTCompilerService);
  });

  describe("Structural Verification (Metadata)", () => {
    it("should be decorated with JwtAuthGuard and PoliciesGuard", () => {
      const guards = Reflect.getMetadata("__guards__", TeacherCBTController);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(PoliciesGuard);
    });
    it("should be decorated with WorkspaceContextInterceptor", () => {
      const interceptors = Reflect.getMetadata("__interceptors__", TeacherCBTController);
      expect(interceptors).toContain(WorkspaceContextInterceptor);
    });
  });

  describe("Behavioral Boundary", () => {
    it("should pull teacher identity from req.user.sub for compilation", async () => {
      const req = { user: { sub: "auth0|teacher-1" }, workspace: { tenantId: "t1", schoolId: "s1" } };
      await controller.compileExam(req, "exam-1");
      expect(compilerService.compileToGradebook).toHaveBeenCalledWith("t1", "s1", "exam-1", "auth0|teacher-1");
    });
    it("should pull teacher identity from req.user.sub for subjective review", async () => {
      const req = { user: { sub: "auth0|teacher-1" }, workspace: { tenantId: "t1", schoolId: "s1" } };
      const dto = { answers: [{ answerId: "a1", awardedScore: 5 }] };
      await controller.reviewAttempt(req, "attempt-1", dto);
      expect(compilerService.reviewAttempt).toHaveBeenCalledWith("t1", "s1", "auth0|teacher-1", "attempt-1", dto);
    });
  });
});
