import { Test, TestingModule } from "@nestjs/testing";
import { MovementHistoryService } from "./movement-history.service";
import { kernel } from "@saas/core-platform";

// Mock the kernel
jest.mock("@saas/core-platform", () => ({
  kernel: {
    db: {
      studentArrival: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      studentDeparture: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    },
  },
}));

describe("MovementHistoryService", () => {
  let service: MovementHistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MovementHistoryService],
    }).compile();

    service = module.get<MovementHistoryService>(MovementHistoryService);
    jest.clearAllMocks();
  });

  it("should retrieve arrivals with isolation", async () => {
    (kernel.db.studentArrival.findMany as jest.Mock).mockResolvedValue([]);
    (kernel.db.studentArrival.count as jest.Mock).mockResolvedValue(0);

    const result = await service.getArrivals("tenant-1", "school-1", undefined, { skip: 0, take: 10 });
    
    expect(kernel.db.studentArrival.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
          schoolId: "school-1",
        }),
      })
    );
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("should retrieve departures with isolation", async () => {
    (kernel.db.studentDeparture.findMany as jest.Mock).mockResolvedValue([]);
    (kernel.db.studentDeparture.count as jest.Mock).mockResolvedValue(0);

    const result = await service.getDepartures("tenant-2", "school-2", undefined, { skip: 0, take: 10 });
    
    expect(kernel.db.studentDeparture.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-2",
          schoolId: "school-2",
        }),
      })
    );
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("should apply date filters", async () => {
    (kernel.db.studentArrival.findMany as jest.Mock).mockResolvedValue([]);
    (kernel.db.studentArrival.count as jest.Mock).mockResolvedValue(0);

    await service.getArrivals("tenant-1", "school-1", undefined, { startDate: "2026-09-01", endDate: "2026-09-30" });
    
    expect(kernel.db.studentArrival.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          operationalDate: {
            gte: "2026-09-01",
            lte: "2026-09-30"
          }
        }),
      })
    );
  });
});
