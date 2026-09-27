import { Test, TestingModule } from "@nestjs/testing";
import { ParentPortalService } from "./parent-portal.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

describe("ParentPortalService", () => {
  let service: ParentPortalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParentPortalService],
    }).compile();

    service = module.get<ParentPortalService>(ParentPortalService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
