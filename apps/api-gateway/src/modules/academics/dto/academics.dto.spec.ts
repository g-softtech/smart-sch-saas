import "reflect-metadata";
import { validate } from "class-validator";
import { CreateTermDto, CreateClassDto } from "./academics.dto";

describe("CreateTermDto", () => {
  it("should pass with valid academicYearId and name", async () => {
    const dto = new CreateTermDto();
    dto.academicYearId = "year-1";
    dto.name = "Fall Term";
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("should fail when academicYearId is missing", async () => {
    const dto = new CreateTermDto();
    dto.name = "Fall Term";
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("academicYearId");
  });

  it("should fail when name is missing", async () => {
    const dto = new CreateTermDto();
    dto.academicYearId = "year-1";
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("name");
  });
});

describe("CreateClassDto", () => {
  it("should pass with valid schoolId and name", async () => {
    const dto = new CreateClassDto();
    dto.schoolId = "school-1";
    dto.name = "Year 1";
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it("should fail when schoolId is missing", async () => {
    const dto = new CreateClassDto();
    dto.name = "Year 1";
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("schoolId");
  });

  it("should fail when name is missing", async () => {
    const dto = new CreateClassDto();
    dto.schoolId = "school-1";
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("name");
  });
});
