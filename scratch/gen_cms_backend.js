const fs = require('fs');
const path = require('path');

const dtoContent = 
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
;

fs.writeFileSync('apps/api-gateway/src/modules/cms/dto/cms-v2.dto.ts', dtoContent);
