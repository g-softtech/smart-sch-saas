import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, IsEmail, Min, Max, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { CmsPublicationStatus } from '@saas/core-platform';

export class CreateCmsEventDto {
  @IsString() title: string;
  @IsString() description: string;
  @IsDateString() eventDate: string;
  @IsOptional() @IsString() startTime?: string;
  @IsOptional() @IsString() endTime?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() featuredMediaId?: string;
}

export class UpdateCmsEventDto extends CreateCmsEventDto {
  @IsOptional() @IsEnum(CmsPublicationStatus) status?: CmsPublicationStatus;
  @IsOptional() @IsNumber() orderIndex?: number;
}

export class CreateCmsGalleryItemDto {
  @IsString() mediaId: string;
  @IsOptional() @IsString() caption?: string;
  @IsOptional() @IsString() altText?: string;
}

export class UpdateCmsGalleryItemDto extends CreateCmsGalleryItemDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() orderIndex?: number;
}

export class CreateCmsPublicStaffDto {
  @IsString() name: string;
  @IsString() role: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() photoMediaId?: string;
  @IsOptional() @IsString() staffProfileId?: string;
}

export class UpdateCmsPublicStaffDto extends CreateCmsPublicStaffDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() orderIndex?: number;
}

export class CreateCmsBlogPostDto {
  @IsString() title: string;
  @IsString() slug: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsString() content: string;
  @IsOptional() @IsString() featuredMediaId?: string;
}

export class UpdateCmsBlogPostDto extends CreateCmsBlogPostDto {
  @IsOptional() @IsEnum(CmsPublicationStatus) status?: CmsPublicationStatus;
}

export class CmsLayoutSectionDto {
  @IsString() id: string;
  @IsBoolean() enabled: boolean;
  @IsNumber() order: number;
}

export class CmsLayoutConfigDto {
  @ValidateNested() @Type(() => CmsLayoutSectionDto) hero: CmsLayoutSectionDto;
  @ValidateNested() @Type(() => CmsLayoutSectionDto) about: CmsLayoutSectionDto;
  @ValidateNested() @Type(() => CmsLayoutSectionDto) events: CmsLayoutSectionDto;
  @ValidateNested() @Type(() => CmsLayoutSectionDto) gallery: CmsLayoutSectionDto;
  @ValidateNested() @Type(() => CmsLayoutSectionDto) leadership: CmsLayoutSectionDto;
  @ValidateNested() @Type(() => CmsLayoutSectionDto) blog: CmsLayoutSectionDto;
  @ValidateNested() @Type(() => CmsLayoutSectionDto) announcements: CmsLayoutSectionDto;
  @ValidateNested() @Type(() => CmsLayoutSectionDto) contact: CmsLayoutSectionDto;
  @ValidateNested() @Type(() => CmsLayoutSectionDto) footer: CmsLayoutSectionDto;
}

export class CmsThemeConfigDto {
  @IsString() fontFamily: string;
  @IsString() headingFontFamily: string;
  @IsString() baseFontSize: string;
  @IsString() primaryColor: string;
  @IsString() secondaryColor: string;
  @IsString() backgroundColor: string;
  @IsString() textColor: string;
}

export class UpdateCmsSiteConfigDto {
  @IsOptional() @IsString() siteName?: string;
  @IsOptional() @IsString() siteDescription?: string;
  @IsOptional() @IsString() logoMediaId?: string;
  @IsOptional() @IsString() faviconMediaId?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @ValidateNested() @Type(() => CmsLayoutConfigDto) layoutPayload?: CmsLayoutConfigDto;
  @IsOptional() @ValidateNested() @Type(() => CmsThemeConfigDto) themePayload?: CmsThemeConfigDto;
}
