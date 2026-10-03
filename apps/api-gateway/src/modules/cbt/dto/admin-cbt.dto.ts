import { Type } from "class-transformer";
import { IsString, IsNotEmpty, IsDate, IsNumber, IsEnum, ValidateNested, IsOptional, IsArray, Min, ArrayMinSize, ValidateIf } from "class-validator";
import { QuestionType } from "@saas/core-platform";

export class CreateCBTExamDto {
  @IsString() @IsNotEmpty() assessmentComponentId: string;
  @IsString() @IsNotEmpty() teacherId: string;
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsOptional() instructions?: string;
  @Type(() => Date) @IsDate() availableFrom: Date;
  @Type(() => Date) @IsDate() availableTo: Date;
  @IsNumber() @Min(1) durationMinutes: number;
}

export class UpdateCBTExamDto {
  @IsString() @IsOptional() teacherId?: string;
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() instructions?: string;
  @Type(() => Date) @IsOptional() availableFrom?: Date;
  @Type(() => Date) @IsOptional() availableTo?: Date;
  @IsNumber() @Min(1) @IsOptional() durationMinutes?: number;
}

export class CBTQuestionDto {
  @IsEnum(QuestionType) questionType: QuestionType;
  @IsString() @IsNotEmpty() questionText: string;
  @IsNumber() @Min(0.01) points: number;
  @IsArray() @IsOptional() options?: any[];
  @IsNumber() @IsOptional() correctOption?: number;
  @IsOptional() correctAnswerPayload?: any;
}

export class SyncQuestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CBTQuestionDto)
  questions: CBTQuestionDto[];
}
