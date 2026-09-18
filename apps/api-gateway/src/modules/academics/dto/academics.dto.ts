import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCampusDto {
  @IsString()
  @IsNotEmpty()
  schoolId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}


export class CreateAcademicYearDto {
  @IsString()
  @IsNotEmpty()
  schoolId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateTermDto {
  @IsString()
  @IsNotEmpty()
  academicYearId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  schoolId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  schoolId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateArmDto {
  @IsString()
  @IsNotEmpty()
  classId!: string;

  @IsString()
  @IsNotEmpty()
  campusId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateSubjectGroupDto {
  @IsString()
  @IsNotEmpty()
  schoolId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  schoolId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  subjectGroupId?: string;
}

import { IsInt, Min } from 'class-validator';
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

export class UpdateAcademicYearDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateClassDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateArmDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateTermDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateCampusDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateSubjectGroupDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateSubjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  subjectGroupId?: string;
}
