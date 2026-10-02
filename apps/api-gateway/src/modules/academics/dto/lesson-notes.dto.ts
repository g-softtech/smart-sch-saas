import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsArray, IsEnum } from "class-validator";
import { LessonNoteStatus } from "@saas/core-platform";

export class CreateLessonNoteDto {
  @IsString()
  @IsNotEmpty()
  assignmentId: string;

  @IsInt()
  @Min(1)
  weekNumber: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsString()
  @IsOptional()
  subtopic?: string;

  @IsNotEmpty()
  objectives: any;

  @IsString()
  @IsOptional()
  materials?: string;

  @IsString()
  @IsOptional()
  introduction?: string;

  @IsNotEmpty()
  presentationSteps: any;

  @IsString()
  @IsOptional()
  evaluation?: string;

  @IsString()
  @IsOptional()
  assignment?: string;
}

export class UpdateLessonNoteDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  weekNumber?: number;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsString()
  @IsOptional()
  subtopic?: string;

  @IsOptional()
  objectives?: any;

  @IsString()
  @IsOptional()
  materials?: string;

  @IsString()
  @IsOptional()
  introduction?: string;

  @IsOptional()
  presentationSteps?: any;

  @IsString()
  @IsOptional()
  evaluation?: string;

  @IsString()
  @IsOptional()
  assignment?: string;
}

export class RejectLessonNoteDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class QueryLessonNotesDto {
  @IsString()
  @IsOptional()
  academicYearId?: string;

  @IsString()
  @IsOptional()
  termId?: string;

  @IsString()
  @IsOptional()
  classId?: string;

  @IsString()
  @IsOptional()
  armId?: string;

  @IsString()
  @IsOptional()
  subjectId?: string;

  @IsString()
  @IsOptional()
  teacherId?: string;

  @IsEnum(LessonNoteStatus)
  @IsOptional()
  status?: LessonNoteStatus;
}
