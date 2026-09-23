import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsEnum, Matches } from "class-validator";
import { DayOfWeek } from "@saas/core-platform";

export class CreateTimetablePeriodDto {
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "startTime must be in HH:mm format" })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "endTime must be in HH:mm format" })
  endTime: string;

  @IsBoolean()
  @IsOptional()
  isBreak?: boolean;
}

export class CreateTimetableEntryDto {
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @IsString()
  @IsNotEmpty()
  termId: string;

  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsOptional()
  armId?: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsOptional()
  teacherId?: string;

  @IsString()
  @IsNotEmpty()
  periodId: string;

  @IsEnum(DayOfWeek)
  @IsNotEmpty()
  dayOfWeek: DayOfWeek;
}
