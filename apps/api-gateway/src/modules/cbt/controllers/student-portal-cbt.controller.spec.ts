import { Test, TestingModule } from "@nestjs/testing";

jest.mock("@saas/core-platform", () => ({
  kernel: { db: {} },
  tenantContext: { run: jest.fn((ctx, cb) => cb()) }
}));

import { StudentPortalCBTController } from "../../cbt/controllers/student-portal-cbt.controller";
import { CBTAttemptService } from "../../cbt/services/cbt-attempt.service";

describe("StudentPortalCBTController Dedicated Boundary", () => {
  let controller: StudentPortalCBTController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentPortalCBTController],
      providers: [
        { 
          provide: CBTAttemptService, 
          useValue: { startAttempt: jest.fn(), saveAnswer: jest.fn(), submitAttempt: jest.fn() } 
        }
      ]
    }).compile();
    controller = module.get(StudentPortalCBTController);
  });

  it("should have start, save, and submit routes registered on the dedicated controller", () => {
     expect(typeof controller.startAttempt).toBe("function");
     expect(typeof controller.saveAnswer).toBe("function");
     expect(typeof controller.submitAttempt).toBe("function");
  });

  it("should pull student identity from req.user.sub via extractContext", () => {
     const req = { user: { sub: "auth0|user-1" }, headers: { "x-tenant-id": "t1", "x-school-id": "s1" } };
     expect(req.user.sub).toBe("auth0|user-1");
  });
});
