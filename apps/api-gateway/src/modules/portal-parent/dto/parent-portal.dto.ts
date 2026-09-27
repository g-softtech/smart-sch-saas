import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive } from "class-validator";

export class CreateParentPickupAuthorizationDto {
  @IsString()
  @IsNotEmpty()
  authorizedPersonName: string;

  @IsString()
  @IsNotEmpty()
  relationship: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class PayInvoiceDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsString()
  @IsOptional()
  reference?: string;
}
