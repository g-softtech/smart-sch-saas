import { IsString, IsNotEmpty, IsEnum, IsInt, Min, IsNumber } from "class-validator";
import { Type } from "class-transformer";

export enum BorrowerTypeDto {
  STUDENT = "STUDENT",
  STAFF = "STAFF",
}

export class UpsertPolicyDto {
  @IsEnum(BorrowerTypeDto)
  borrowerType!: BorrowerTypeDto;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxBooksAllowed!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  loanDurationDays!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  gracePeriodDays!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  finePerDay!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxFineAmount!: number;
}
