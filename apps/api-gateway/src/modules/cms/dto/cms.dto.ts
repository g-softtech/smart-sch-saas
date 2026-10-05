import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, IsEmail, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CmsPublicationStatus } from '@saas/core-platform';

export class UpdateSiteConfigDto {
  @IsEnum(CmsPublicationStatus)
  status: CmsPublicationStatus;

  @IsOptional() @IsString()
  publicSlug?: string;

  @IsOptional() @IsString()
  publishAction?: 'DRAFT' | 'PUBLISH';

  @IsNumber()
  expectedVersion: number;

  @IsOptional() @IsString()
  logoMediaId?: string;

  @IsOptional() @IsString()
  faviconMediaId?: string;

  @IsOptional()
  themePayload?: any;

  @IsOptional() @IsString()
  primaryColor?: string;

  @IsOptional() @IsString()
  secondaryColor?: string;

  @IsOptional() @IsEmail()
  contactEmail?: string;

  @IsOptional() @IsString()
  contactPhone?: string;

  @IsBoolean()
  enableAdmissionsCta: boolean;
}

export class CreateCmsPageDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsString()
  content: string;
}

export class UpdateCmsPageDto {
  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  slug?: string;

  @IsOptional() @IsString()
  content?: string;

  @IsOptional() @IsEnum(CmsPublicationStatus)
  status?: CmsPublicationStatus;

  @IsNumber()
  expectedVersion: number;
}

export class CreateCmsAnnouncementDto {
  @IsString()
  title: string;

  @IsString()
  content: string;
}

export class UpdateCmsAnnouncementDto {
  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  content?: string;

  @IsOptional() @IsEnum(CmsPublicationStatus)
  status?: CmsPublicationStatus;

  @IsNumber()
  expectedVersion: number;
}

export class SyncNavigationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NavigationItemDto)
  items: NavigationItemDto[];
}

export class NavigationItemDto {
  @IsOptional() @IsString()
  id?: string;

  @IsString()
  label: string;

  @IsString()
  targetUrl: string;

  @IsNumber()
  orderIndex: number;

  @IsBoolean()
  isActive: boolean;
}