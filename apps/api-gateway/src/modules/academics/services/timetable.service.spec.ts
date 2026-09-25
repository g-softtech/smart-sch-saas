import { Test, TestingModule } from "@nestjs/testing";
import { TimetableService } from "./timetable.service";
import { kernel } from "@saas/core-platform";

describe("TimetableService (Unit / Mocked)", () => {
  let service: TimetableService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TimetableService],
    }).compile();

    service = module.get<TimetableService>(TimetableService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("listClassTimetable", () => {
    it("includes both arm-specific and class-wide entries when armId is specified", async () => {
      const mockFindMany = jest.spyOn(kernel.db.timetableEntry, "findMany").mockResolvedValueOnce([
        { id: "entry-1", classId: "class-1", armId: "arm-1", subjectId: "sub-1" },
        { id: "entry-2", classId: "class-1", armId: null, subjectId: "sub-2" },
      ] as any);

      const result = await service.listClassTimetable(
        "tenant-1",
        "school-1",
        "year-1",
        "term-1",
        "class-1",
        "arm-1"
      );

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          tenantId: "tenant-1",
          schoolId: "school-1",
          academicYearId: "year-1",
          termId: "term-1",
          classId: "class-1",
          OR: [{ armId: "arm-1" }, { armId: null }],
        },
        include: {
          period: true,
          subject: true,
          teacher: true,
        },
      });
      expect(result).toHaveLength(2);
    });

    it("returns all entries for class when armId is not specified", async () => {
      const mockFindMany = jest.spyOn(kernel.db.timetableEntry, "findMany").mockResolvedValueOnce([
        { id: "entry-1", classId: "class-1", armId: "arm-1" },
        { id: "entry-2", classId: "class-1", armId: null },
      ] as any);

      const result = await service.listClassTimetable(
        "tenant-1",
        "school-1",
        "year-1",
        "term-1",
        "class-1"
      );

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          tenantId: "tenant-1",
          schoolId: "school-1",
          academicYearId: "year-1",
          termId: "term-1",
          classId: "class-1",
          OR: undefined,
        },
        include: {
          period: true,
          subject: true,
          teacher: true,
        },
      });
      expect(result).toHaveLength(2);
    });
  });
});
