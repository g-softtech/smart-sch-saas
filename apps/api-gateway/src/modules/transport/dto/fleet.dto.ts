import { IsString, IsInt, IsOptional, IsEnum, Min } from "class-validator";
import { TransportVehicleStatus } from "@saas/core-platform";

export class CreateVehicleDto {
  @IsString()
  registrationNumber!: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsOptional()
  @IsString()
  campusId?: string;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsEnum(TransportVehicleStatus)
  status?: TransportVehicleStatus;
}

