import { IsString, Matches, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Springfield High' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'springfield-high' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug: string;

  @ApiProperty({ example: 'uuid-plan-id' })
  @IsUUID()
  planId: string;
}
