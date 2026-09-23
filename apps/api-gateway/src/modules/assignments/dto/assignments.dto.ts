import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsDateString, IsEnum } from "class-validator";

export class CreateAssignmentDto {
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
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @IsNumber()
  @Min(0)
  maxScore: number;
}

export class SubmitAssignmentDto {
  @IsString()
  @IsNotEmpty()
  textContent: string;
}

export class GradeSubmissionDto {
  @IsNumber()
  @Min(0)
  score: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}
