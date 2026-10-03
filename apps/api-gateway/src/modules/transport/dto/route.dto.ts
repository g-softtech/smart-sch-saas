import { IsString, IsOptional, IsEnum, IsArray, ValidateNested, IsNumber } from "class-validator";
import { Type } from "class-transformer";
import { TransportRouteDirection, TransportRouteStatus } from "@saas/core-platform";

export class CreateRouteDto {
  @IsString()
  name!: string;

  @IsEnum(TransportRouteDirection)
  direction!: TransportRouteDirection;

  @IsOptional()
  @IsString()
  campusId?: string;
}

export class RouteStopDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  estimatedTime?: string;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsNumber()
  orderIndex!: number;
}

export class SyncRouteStopsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteStopDto)
  stops!: RouteStopDto[];
}

export class CreateAllocationDto {
  @IsString()
  academicYearId!: string;

  @IsString()
  termId!: string;

  @IsString()
  vehicleId!: string;

  @IsString()
  driverId!: string;
}

