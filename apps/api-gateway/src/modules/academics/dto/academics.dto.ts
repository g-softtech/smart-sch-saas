export class CreateCampusDto {
  schoolId!: string;
  name!: string;
}

import { IsString, IsNotEmpty } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString()
  @IsNotEmpty()
  schoolId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateTermDto {
  academicYearId!: string;
  name!: string;
}

export class CreateDepartmentDto {
  schoolId!: string;
  name!: string;
}

export class CreateClassDto {
  schoolId!: string;
  name!: string;
}

export class CreateArmDto {
  classId!: string;
  campusId!: string;
  name!: string;
}

export class CreateSubjectGroupDto {
  schoolId!: string;
  name!: string;
}

export class CreateSubjectDto {
  schoolId!: string;
  name!: string;
  subjectGroupId?: string;
}

import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AcademicsPaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number = 50;
}
