import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNotEmpty,
} from "class-validator";
import { AssignmentScope } from "@saas/core-platform";

export class CreateTeacherSubjectAssignmentDto {
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

  @IsString()
  @IsNotEmpty()
  teacherId!: string;

  @IsEnum(AssignmentScope)
  scope!: AssignmentScope;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class QueryTeacherSubjectAssignmentDto {
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

  @IsEnum(AssignmentScope)
  @IsOptional()
  scope?: AssignmentScope;

  @IsString()
  @IsOptional()
  status?: string;
}

export class CreateClassTeacherAssignmentDto {
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
  teacherId!: string;

  @IsEnum(AssignmentScope)
  scope!: AssignmentScope;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class QueryClassTeacherAssignmentDto {
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
  teacherId?: string;

  @IsEnum(AssignmentScope)
  @IsOptional()
  scope?: AssignmentScope;
}
