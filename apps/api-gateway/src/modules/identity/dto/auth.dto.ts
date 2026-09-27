import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterUserDto {
  @ApiProperty({ example: "admin@school.edu" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "StrongPass123!" })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @IsOptional()
  password?: string;

  @ApiProperty({ example: "John" })
  @IsString()
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  lastName: string;
}

export class LoginDto {
  @ApiProperty({ example: "admin@school.edu" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "StrongPass123!" })
  @IsString()
  password?: string;
}

export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data?: T;

  @ApiProperty()
  meta?: any;

  @ApiProperty()
  errors?: any[];
}

export class ForgotPasswordDto {
  @ApiProperty({ example: "user@school.edu" })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  newPassword: string;
}
