import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsISO8601,
  MaxLength,
  IsEmail,
  IsPhoneNumber,
  IsBoolean,
  IsInt,
  Min,
  Max,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// ─── Enums (mirror schema.prisma values) ────────────────────────────────────

export enum GenderEnumDto {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export enum StudentStatusDto {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  GRADUATED = "GRADUATED",
  WITHDRAWN = "WITHDRAWN",
  TRANSFERRED = "TRANSFERRED",
}

export enum GuardianRelationshipDto {
  FATHER = "FATHER",
  MOTHER = "MOTHER",
  GUARDIAN = "GUARDIAN",
  OTHER = "OTHER",
}

@ValidatorConstraint({ name: "isBeforeAdmissionDate", async: false })
export class IsBeforeAdmissionDateConstraint implements ValidatorConstraintInterface {
  validate(dateOfBirth: string, args: ValidationArguments) {
    if (!dateOfBirth) return true;
    const obj = args.object as any;
    if (!obj.admissionDate) return true;

    return new Date(dateOfBirth) < new Date(obj.admissionDate);
  }

  defaultMessage(args: ValidationArguments) {
    return "Date of birth must be earlier than admission date.";
  }
}

// ─── Student DTOs ────────────────────────────────────────────────────────────

export class CreateStudentDto {
  @ApiProperty({ example: "Ada" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: "Okonkwo" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ example: "Chisom" })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  middleName?: string;

  @ApiPropertyOptional({ example: "2010-05-15" })
  @IsISO8601()
  @IsOptional()
  @Validate(IsBeforeAdmissionDateConstraint)
  dateOfBirth?: string;

  @ApiProperty({ enum: GenderEnumDto })
  @IsEnum(GenderEnumDto)
  gender!: GenderEnumDto;

  @ApiPropertyOptional({ example: "Nigerian" })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  nationality?: string;

  @ApiProperty({ example: "2026-09-01" })
  @IsISO8601()
  admissionDate!: string;
}

// ─── Guardian DTOs ───────────────────────────────────────────────────────────

export class CreateGuardianDto {
  @ApiProperty({ example: "Emeka" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: "Okonkwo" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ example: "+2348012345678" })
  @IsString()
  @MaxLength(30)
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "emeka@example.com" })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: "12 Lagos Street, Abuja" })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: "Engineer" })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  occupation?: string;
}

export class LinkGuardianDto {
  @ApiProperty({ example: "uuid-of-guardian" })
  @IsUUID("all")
  guardianId!: string;

  @ApiProperty({ enum: GuardianRelationshipDto })
  @IsEnum(GuardianRelationshipDto)
  relationship!: GuardianRelationshipDto;

  @ApiPropertyOptional({
    description:
      "Set as the student's primary guardian (zero or one per student)",
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    description:
      "Mark as an emergency contact (separate from relationship type)",
  })
  @IsBoolean()
  @IsOptional()
  isEmergencyContact?: boolean;
}

// ─── Enrollment DTOs ─────────────────────────────────────────────────────────

export class CreateEnrollmentDto {
  @ApiProperty({ example: "uuid-of-academic-year" })
  @IsUUID("all")
  academicYearId!: string;

  @ApiProperty({ example: "uuid-of-class" })
  @IsUUID("all")
  classId!: string;

  @ApiProperty({ example: "uuid-of-campus" })
  @IsUUID("all")
  campusId!: string;

  @ApiPropertyOptional({ example: "uuid-of-arm" })
  @IsUUID("all")
  @IsOptional()
  armId?: string;
}

export class TransferEnrollmentDto {
  @ApiProperty({ example: "uuid-of-new-class" })
  @IsUUID("all")
  newClassId!: string;

  @ApiProperty({ example: "uuid-of-new-campus" })
  @IsUUID("all")
  newCampusId!: string;

  @ApiPropertyOptional({ example: "uuid-of-new-arm" })
  @IsUUID("all")
  @IsOptional()
  newArmId?: string;

  @ApiPropertyOptional({ example: "Student transferred to advanced class" })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}

export class WithdrawStudentDto {
  @ApiPropertyOptional({ example: "Student relocated to another city" })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}

// ─── Pagination DTO ──────────────────────────────────────────────────────────

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Filter by schoolId" })
  @IsUUID("all")
  @IsOptional()
  schoolId?: string;

  @ApiPropertyOptional({ description: "Search query for filtering results" })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;
}
