import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsIn } from "class-validator";
import { Type } from "class-transformer";

export class AddBookItemDto {
  @IsString()
  @IsNotEmpty()
  bookId!: string;

  @IsString()
  @IsOptional()
  campusId?: string;

  @IsString()
  @IsNotEmpty()
  assetTag!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  copyNumber!: number;

  @IsString()
  @IsOptional()
  location?: string;
}

export class UpdateBookItemStatusDto {
  @IsString()
  @IsIn(["AVAILABLE", "MAINTENANCE"])
  status!: "AVAILABLE" | "MAINTENANCE";

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
