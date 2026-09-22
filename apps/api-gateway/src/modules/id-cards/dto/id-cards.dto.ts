import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";
import { CredentialStatus } from "@saas/core-platform";

export class IssueStudentCredentialDto {
  @ApiProperty({ description: "Student ID to issue credential for" })
  @IsString()
  @IsNotEmpty()
  studentId: string;
}

export class RevokeStudentCredentialDto {
  @ApiProperty({ description: "Reason for revocation" })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class StudentCredentialResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  studentId: string;

  @ApiProperty({ enum: CredentialStatus })
  status: CredentialStatus;

  @ApiProperty()
  issuedAt: Date;

  @ApiProperty()
  revokedAt: Date | null;
  
  @ApiProperty()
  revocationReason: string | null;

  static fromEntity(entity: any): StudentCredentialResponseDto {
    const dto = new StudentCredentialResponseDto();
    dto.id = entity.id;
    dto.studentId = entity.studentId;
    dto.status = entity.status;
    dto.issuedAt = entity.issuedAt;
    dto.revokedAt = entity.revokedAt;
    dto.revocationReason = entity.revocationReason;
    return dto;
  }
}

export class IssuedCredentialResponseDto extends StudentCredentialResponseDto {
  @ApiProperty({ description: "The raw QR token. ONLY returned during issuance." })
  token: string;

  static fromEntityWithToken(entity: any, token: string): IssuedCredentialResponseDto {
    const dto = new IssuedCredentialResponseDto();
    dto.id = entity.id;
    dto.studentId = entity.studentId;
    dto.status = entity.status;
    dto.issuedAt = entity.issuedAt;
    dto.revokedAt = entity.revokedAt;
    dto.revocationReason = entity.revocationReason;
    dto.token = token;
    return dto;
  }
}

export class ScanCredentialDto {
  @ApiProperty({ description: "Raw credential token" })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: "Source of the scan", enum: ["CAMERA", "EXTERNAL"] })
  @IsEnum(["CAMERA", "EXTERNAL"])
  source: "CAMERA" | "EXTERNAL";
}
