import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Matches,
  IsInt,
  Min,
  Max,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { AttendanceStatus } from "@saas/core-platform";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AttendanceRecordDto {
  @ApiProperty({ example: "uuid-student-1" })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.PRESENT })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ example: "Sick leave" })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ example: "Called in sick" })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkCreateAttendanceRegisterDto {
  @ApiProperty({ example: "uuid-academic-year" })
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({ example: "uuid-term" })
  @IsString()
  @IsNotEmpty()
  termId: string;

  @ApiProperty({ example: "uuid-class" })
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiPropertyOptional({ example: "uuid-arm" })
  @IsString()
  @IsOptional()
  armId?: string;

  @ApiProperty({ example: "2026-09-01", description: "Format: YYYY-MM-DD" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "date must be in strictly YYYY-MM-DD format",
  })
  date: string;

  @ApiProperty({ type: [AttendanceRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}

export class AttendancePaginationQueryDto {
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
}

export class AttendanceFilterQueryDto extends AttendancePaginationQueryDto {
  @ApiPropertyOptional({
    example: "2026-09-01",
    description: "Format: YYYY-MM-DD",
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "startDate must be in strictly YYYY-MM-DD format",
  })
  startDate?: string;

  @ApiPropertyOptional({
    example: "2026-09-30",
    description: "Format: YYYY-MM-DD",
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "endDate must be in strictly YYYY-MM-DD format",
  })
  endDate?: string;
}

export class AttendanceRecordResponseDto {
  @ApiProperty({ example: "uuid-record-1" })
  id: string;

  @ApiProperty({ example: "uuid-student-1" })
  studentId: string;

  @ApiProperty({ example: "uuid-enrollment-1" })
  enrollmentId: string;

  @ApiProperty({ enum: AttendanceStatus })
  status: AttendanceStatus;

  @ApiPropertyOptional({ example: "Sick" })
  reason: string | null;

  @ApiPropertyOptional({ example: "Left early" })
  notes: string | null;

  constructor(partial: Partial<AttendanceRecordResponseDto>) {
    Object.assign(this, partial);
  }

  static fromEntity(entity: any): AttendanceRecordResponseDto {
    return new AttendanceRecordResponseDto({
      id: entity.id,
      studentId: entity.studentId,
      enrollmentId: entity.enrollmentId,
      status: entity.status,
      reason: entity.reason,
      notes: entity.notes,
    });
  }
}

export class AttendanceRegisterResponseDto {
  @ApiProperty({ example: "uuid-register-1" })
  id: string;

  @ApiProperty({ example: "uuid-academic-year" })
  academicYearId: string;

  @ApiProperty({ example: "uuid-term" })
  termId: string;

  @ApiProperty({ example: "uuid-class" })
  classId: string;

  @ApiPropertyOptional({ example: "uuid-arm" })
  armId: string | null;

  @ApiProperty({ example: "2026-09-01T00:00:00.000Z" })
  date: Date;

  @ApiProperty({ example: false })
  isFinalized: boolean;

  @ApiPropertyOptional({ type: [AttendanceRecordResponseDto] })
  records?: AttendanceRecordResponseDto[];

  constructor(partial: Partial<AttendanceRegisterResponseDto>) {
    Object.assign(this, partial);
  }

  static fromEntity(entity: any): AttendanceRegisterResponseDto {
    const dto = new AttendanceRegisterResponseDto({
      id: entity.id,
      academicYearId: entity.academicYearId,
      termId: entity.termId,
      classId: entity.classId,
      armId: entity.armId,
      date: entity.date,
      isFinalized: entity.isFinalized,
    });

    if (entity.records) {
      dto.records = entity.records.map((r: any) =>
        AttendanceRecordResponseDto.fromEntity(r),
      );
    }

    return dto;
  }
}
