import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsDateString, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class CreateCBTExamDto {
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
  @IsOptional()
  instructions?: string;

  @IsDateString()
  @IsNotEmpty()
  availableFrom: string;

  @IsDateString()
  @IsNotEmpty()
  availableTo: string;

  @IsNumber()
  @Min(1)
  durationMinutes: number;

  @IsNumber()
  @Min(0)
  maxScore: number;
}

export class CreateCBTQuestionDto {
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsArray()
  @IsString({ each: true })
  options: string[];

  @IsNumber()
  @Min(0)
  correctOption: number;

  @IsNumber()
  @Min(0)
  points: number;
}

export class SubmitCBTAnswerDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsNumber()
  @Min(0)
  selectedOption: number;
}

export class SubmitCBTAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitCBTAnswerDto)
  answers: SubmitCBTAnswerDto[];
}
