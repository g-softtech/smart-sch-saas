import { IsString, IsEnum } from "class-validator";
import { TransportRouteDirection } from "@saas/core-platform";

export class CreateSubscriptionDto {
  @IsString()
  studentId!: string;

  @IsString()
  academicYearId!: string;

  @IsString()
  termId!: string;

  @IsString()
  routeAllocationId!: string;

  @IsString()
  stopId!: string;

  @IsEnum(TransportRouteDirection)
  direction!: TransportRouteDirection;
}
