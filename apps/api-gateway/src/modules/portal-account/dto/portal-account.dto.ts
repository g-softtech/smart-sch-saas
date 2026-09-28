import { IsString, IsOptional, IsEmail, IsNotEmpty, MinLength } from "class-validator";

export class ProvisionStudentPortalDto {
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class ProvisionGuardianPortalDto {
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class ProvisionStaffPortalDto {
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class ActivateAccountDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password: string;
}
