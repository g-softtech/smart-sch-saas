import { Controller, Get, Param } from '@nestjs/common';
import { CmsPublicService } from '../services/cms-public.service';

@Controller('v1/public/cms')
export class CmsPublicController {
  constructor(private service: CmsPublicService) {}

  @Get(':slug/resolve')
  async resolveSchool(@Param('slug') slug: string) {
    return this.service.resolveSchool(slug);
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
}