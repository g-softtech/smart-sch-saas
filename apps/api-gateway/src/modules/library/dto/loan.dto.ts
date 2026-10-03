import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";
import { BorrowerTypeDto } from "./policy.dto";

export class IssueLoanDto {
  @IsString()
  @IsNotEmpty()
  bookItemId!: string;

  @IsEnum(BorrowerTypeDto)
  borrowerType!: BorrowerTypeDto;

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsString()
  @IsOptional()
  staffProfileId?: string;

  @IsString()
  @IsOptional()
  campusId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReturnLoanDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class MarkLostDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  replacementFee!: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  academicYearId?: string;

  @IsString()
  @IsOptional()
  termId?: string;
}

export class BillFineDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fineAmount!: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  academicYearId?: string;

  @IsString()
  @IsOptional()
  termId?: string;
}

export class QueryLoanDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  borrowerType?: string;

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsString()
  @IsOptional()
  staffProfileId?: string;

  @IsString()
  @IsOptional()
  campusId?: string;
}
