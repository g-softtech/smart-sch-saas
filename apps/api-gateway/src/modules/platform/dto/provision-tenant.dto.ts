import { IsEmail, IsNotEmpty, IsString, Matches, MinLength, MaxLength } from 'class-validator';

export class ProvisionTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tenantName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Tenant slug can only contain lowercase letters, numbers, and hyphens',
  })
  @MaxLength(60)
  tenantSlug: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  schoolName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  adminFirstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  adminLastName: string;

  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  adminPassword: string;
}
