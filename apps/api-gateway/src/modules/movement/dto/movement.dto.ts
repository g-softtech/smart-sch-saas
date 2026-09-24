import { IsOptional, IsString, IsInt, Min, Max, Matches } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class MovementHistoryQueryDto {
  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 50;

  @ApiPropertyOptional({ example: "uuid-student" })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ example: "2026-09-01" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-09-30" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @ApiPropertyOptional({ example: "CAMERA" })
  @IsOptional()
  @IsString()
  source?: string;
  
  @ApiPropertyOptional({ example: "uuid-class" })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ example: "uuid-arm" })
  @IsOptional()
  @IsString()
  armId?: string;
}
