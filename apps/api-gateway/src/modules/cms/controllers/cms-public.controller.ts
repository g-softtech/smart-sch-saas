import { Controller, Get, Param, Query, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { CmsPublicService } from '../services/cms-public.service';

@Controller('v1/public/cms')
export class CmsPublicController {
  constructor(private service: CmsPublicService) {}

  @Get(':slug/resolve')
  async resolveSchool(@Param('slug') slug: string, @Query('preview') preview?: string) {
    return this.service.resolveSchool(slug, preview === 'true');
  }

  @Get(':slug/pages/:pageSlug')
  async getPage(@Param('slug') slug: string, @Param('pageSlug') pageSlug: string) {
    const resolved = await this.service.resolveSchool(slug);
    return this.service.getPage(resolved.school.tenantId, resolved.school.id, pageSlug);
  }

  @Get(':slug/navigation')
  async getNavigation(@Param('slug') slug: string) {
    const resolved = await this.service.resolveSchool(slug);
    return this.service.getNavigation(resolved.school.tenantId, resolved.school.id);
  }

  @Get(':slug/announcements')
  async getAnnouncements(@Param('slug') slug: string) {
    const resolved = await this.service.resolveSchool(slug);
    return this.service.getAnnouncements(resolved.school.tenantId, resolved.school.id);
  }

  // Unauthenticated public media serve endpoint — validates media belongs to this school
  @Get(':slug/media/:mediaId')
  async servePublicMedia(
    @Param('slug') slug: string,
    @Param('mediaId') mediaId: string,
    @Res() res: Response,
  ) {
    // Resolve school server-side — slug is the authority
    const resolved = await this.service.resolveSchool(slug, false).catch(() => null);
    if (!resolved) throw new NotFoundException('School not found');

    const media = await this.service.getPublicMedia(resolved.school.id, mediaId);
    if (!media) throw new NotFoundException('Media not found');

    res.set({
      'Content-Type': media.mimeType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.send(media.data);
  }
}