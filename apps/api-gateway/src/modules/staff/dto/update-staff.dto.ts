import { IsString, IsOptional, IsEmail, IsEnum } from "class-validator";
import { GenderEnum, StaffType } from "@saas/core-platform";

export class UpdateStaffDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(GenderEnum)
  @IsOptional()
  gender?: GenderEnum;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsEnum(StaffType)
  @IsOptional()
  type?: StaffType;

  @IsString()
  @IsOptional()
  departmentId?: string;
}
