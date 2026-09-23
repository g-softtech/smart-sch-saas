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
  
  @IsString()
  @IsOptional()
  financialPeriodId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeItemDto)
  @IsOptional()
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

  @IsString()
  @IsOptional()
  financialAccountId?: string;

  @IsString()
  @IsOptional()
  financialPeriodId?: string;
}

export class ApplyAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @IsString()
  @IsIn(["SCHOLARSHIP", "DISCOUNT", "WAIVER"])
  type: "SCHOLARSHIP" | "DISCOUNT" | "WAIVER";

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  financialPeriodId?: string;
}

export class RefundPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsIn(["ORIGINAL_GATEWAY", "WALLET_CREDIT"])
  refundMethod: "ORIGINAL_GATEWAY" | "WALLET_CREDIT";

  @IsString()
  @IsOptional()
  financialPeriodId?: string;
}
