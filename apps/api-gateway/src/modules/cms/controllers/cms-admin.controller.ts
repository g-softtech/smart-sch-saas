import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/security/jwt-auth.guard';

import { WorkspaceContextInterceptor } from '../../identity/interceptors/workspace-context.interceptor';
import { UseInterceptors } from '@nestjs/common';
import { CmsAdminService } from '../services/cms-admin.service';
import { UpdateSiteConfigDto, CreateCmsPageDto, UpdateCmsPageDto, CreateCmsAnnouncementDto, UpdateCmsAnnouncementDto, SyncNavigationDto } from '../dto/cms.dto';

@Controller('v1/cms/admin')
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class CmsAdminController {
  constructor(private service: CmsAdminService) {}

  @Get('config')
  
  async getConfig(@Req() req: any) {
    return this.service.getSiteConfig(req.workspace.tenantId, req.workspace.schoolId, req.user.id);
  }

  @Put('config')
  
  async updateConfig(@Req() req: any, @Body() dto: UpdateSiteConfigDto) {
    return this.service.updateSiteConfig(req.workspace.tenantId, req.workspace.schoolId, req.user.id, dto);
  }

  @Get('pages')
  
  async getPages(@Req() req: any) {
    return this.service.getPages(req.workspace.tenantId, req.workspace.schoolId);
  }

  @Post('pages')
  
  async createPage(@Req() req: any, @Body() dto: CreateCmsPageDto) {
    return this.service.createPage(req.workspace.tenantId, req.workspace.schoolId, req.user.id, dto);
  }

  @Put('pages/:id')
  
  async updatePage(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCmsPageDto) {
    return this.service.updatePage(req.workspace.tenantId, req.workspace.schoolId, id, req.user.id, dto);
  }

  @Delete('pages/:id')
  
  async deletePage(@Req() req: any, @Param('id') id: string) {
    return this.service.deletePage(req.workspace.tenantId, req.workspace.schoolId, id, req.user.id);
  }

  @Put('navigation')
  
  async syncNavigation(@Req() req: any, @Body() dto: SyncNavigationDto) {
    return this.service.syncNavigation(req.workspace.tenantId, req.workspace.schoolId, req.user.id, dto);
  }

  @Get('announcements')
  
  async getAnnouncements(@Req() req: any) {
    return this.service.getAnnouncements(req.workspace.tenantId, req.workspace.schoolId);
  }

  @Post('announcements')
  
  async createAnnouncement(@Req() req: any, @Body() dto: CreateCmsAnnouncementDto) {
    return this.service.createAnnouncement(req.workspace.tenantId, req.workspace.schoolId, req.user.id, dto);
  }

  @Put('announcements/:id')
  
  async updateAnnouncement(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCmsAnnouncementDto) {
    return this.service.updateAnnouncement(req.workspace.tenantId, req.workspace.schoolId, id, req.user.id, dto);
  }

  @Delete('announcements/:id')
  
  async deleteAnnouncement(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteAnnouncement(req.workspace.tenantId, req.workspace.schoolId, id, req.user.id);
  }
}