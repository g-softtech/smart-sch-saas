import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from "class-validator";
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

export class RecordScoreDto {
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @IsString()
  @IsNotEmpty()
  termId: string;

  @IsString()
  @IsNotEmpty()
  enrollmentId: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsNumber()
  @Min(0)
  maxScore: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  score?: number;
}
