import { IsString, IsNotEmpty, IsOptional, IsEnum, MinLength } from "class-validator";
import { WorkflowStatus } from "@saas/core-platform";

export class ListSubmissionsDto {
  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  armId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;
}

export class ApproveGradebookDto {
  @IsString()
  @IsNotEmpty()
  submissionId!: string;
}

export class RejectGradebookDto {
  @IsString()
  @IsNotEmpty()
  submissionId!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: "Rejection reason must be at least 3 characters long" })
  reason!: string;
}

export class PublishGradebookDto {
  @IsString()
  @IsNotEmpty()
  submissionId!: string;
}

export class ReopenGradebookDto {
  @IsString()
  @IsNotEmpty()
  submissionId!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: "Reopen reason must be at least 3 characters long" })
  reason!: string;
}
