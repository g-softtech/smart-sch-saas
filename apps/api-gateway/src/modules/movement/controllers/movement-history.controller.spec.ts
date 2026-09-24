import { Test, TestingModule } from "@nestjs/testing";
import { MovementHistoryController } from "./movement-history.controller";
import { MovementHistoryService } from "../services/movement-history.service";

describe("MovementHistoryController", () => {
  let controller: MovementHistoryController;
  let service: MovementHistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovementHistoryController],
      providers: [
        {
          provide: MovementHistoryService,
          useValue: {
            getArrivals: jest.fn().mockResolvedValue({ items: [], total: 0 }),
            getDepartures: jest.fn().mockResolvedValue({ items: [], total: 0 }),
          },
        },
      ],
    }).compile();

    controller = module.get<MovementHistoryController>(MovementHistoryController);
    service = module.get<MovementHistoryService>(MovementHistoryService);
  });

  it("should return arrivals", async () => {
    const req = { workspace: { tenantId: "tenant-1", schoolId: "school-1" } };
    const query = { skip: 0, take: 10 };
    
    await controller.getArrivals(req, query);
    
    expect(service.getArrivals).toHaveBeenCalledWith("tenant-1", "school-1", query);
  });

  it("should return departures", async () => {
    const req = { workspace: { tenantId: "tenant-2", schoolId: "school-2" } };
    const query = { skip: 10, take: 20 };
    
    await controller.getDepartures(req, query);
    
    expect(service.getDepartures).toHaveBeenCalledWith("tenant-2", "school-2", query);
  });
});
