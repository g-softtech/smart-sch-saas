import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsBoolean, IsNumber, IsIn, Min } from "class-validator";
import { Type } from "class-transformer";

export class FeeItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;
}

export class CreateFeeStructureDto {
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @IsString()
  @IsNotEmpty()
  termId: string;

  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsOptional()
  armId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeItemDto)
  items: FeeItemDto[];
}

export class GenerateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @IsString()
  @IsNotEmpty()
  termId: string;

  @IsString()
  @IsOptional()
  feeStructureId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeItemDto)
  @IsOptional() // if feeStructureId is provided, items can be omitted
  customItems?: FeeItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsNotEmpty()
  dueDate: string;
}

export class RecordPaymentDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  reference: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsIn(["CASH", "TRANSFER", "POS", "ONLINE"])
  method: "CASH" | "TRANSFER" | "POS" | "ONLINE";

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  invoiceIds?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}
