import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from "class-validator";
import { ResultStatus } from "@saas/core-platform";

export class CreateGradingScaleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateGradeBoundaryDto {
  @IsString()
  @IsNotEmpty()
  gradingScaleId: string;

  @IsNumber()
  @Min(0)
  minScore: number;

  @IsString()
  @IsNotEmpty()
  grade: string;

  @IsString()
  @IsOptional()
  remark?: string;
}

export class SetAcademicGradingConfigDto {
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @IsString()
  @IsNotEmpty()
  termId: string;

  @IsString()
  @IsNotEmpty()
  gradingScaleId: string;
}

export class CreateAssessmentTypeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateAssessmentComponentDto {
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
  @IsNotEmpty()
  assessmentTypeId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @Min(0.01)
  maxScore: number;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  weight: number;
}

export class RecordScoreDto {
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @IsString()
  @IsNotEmpty()
  termId: string;

  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsNotEmpty()
  assessmentComponentId: string;

  @IsNumber()
  @Min(0)
  maxScore: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  score?: number;
}
