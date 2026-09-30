import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class GetTeacherScopeQueryDto {
  @IsString()
  @IsNotEmpty()
  academicYearId!: string;

  @IsString()
  @IsNotEmpty()
  termId!: string;
}

export class GetGradebookQueryDto {
  @IsString()
  @IsNotEmpty()
  academicYearId!: string;

  @IsString()
  @IsNotEmpty()
  termId!: string;

  @IsString()
  @IsNotEmpty()
  classId!: string;

  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @IsString()
  @IsOptional()
  armId?: string;
}

export class ScoreEntryItemDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  assessmentComponentId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  score?: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  maxScore!: number;

  @IsBoolean()
  @IsOptional()
  isAbsent?: boolean;
}

export class StudentGradebookEntryDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreEntryItemDto)
  scores!: ScoreEntryItemDto[];
}

export class SaveGradebookDraftDto {
  @IsString()
  @IsNotEmpty()
  academicYearId!: string;

  @IsString()
  @IsNotEmpty()
  termId!: string;

  @IsString()
  @IsNotEmpty()
  classId!: string;

  @IsString()
  @IsOptional()
  armId?: string;

  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentGradebookEntryDto)
  entries!: StudentGradebookEntryDto[];
}

export class SubmitGradebookDto {
  @IsString()
  @IsNotEmpty()
  academicYearId!: string;

  @IsString()
  @IsNotEmpty()
  termId!: string;

  @IsString()
  @IsNotEmpty()
  classId!: string;

  @IsString()
  @IsOptional()
  armId?: string;

  @IsString()
  @IsNotEmpty()
  subjectId!: string;
}
