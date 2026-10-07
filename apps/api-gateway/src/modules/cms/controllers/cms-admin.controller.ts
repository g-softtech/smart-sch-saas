import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, Res, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/security/jwt-auth.guard';
import { PoliciesGuard } from '../../identity/security/policies.guard';
import { RequirePermission } from '../../identity/security/require-permission.decorator';
import { WorkspaceContextInterceptor } from '../../identity/interceptors/workspace-context.interceptor';
import { UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CmsAdminService } from '../services/cms-admin.service';
import { UpdateSiteConfigDto, CreateCmsPageDto, UpdateCmsPageDto, CreateCmsAnnouncementDto, UpdateCmsAnnouncementDto, SyncNavigationDto } from '../dto/cms.dto';

@Controller('v1/cms/admin')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class CmsAdminController {
  constructor(private service: CmsAdminService) {}

  @Get('config')
  @RequirePermission('website:manage_config')
  async getConfig(@Req() req: any) {
    return this.service.getSiteConfig(req.workspace.tenantId, req.workspace.schoolId, req.user.id);
  }

  @Put('config')
  @RequirePermission('website:manage_config')
  async updateConfig(@Req() req: any, @Body() dto: UpdateSiteConfigDto) {
    return this.service.updateSiteConfig(req.workspace.tenantId, req.workspace.schoolId, req.user.id, dto);
  }

  @Get('pages')
  @RequirePermission('website:manage_content')
  async getPages(@Req() req: any) {
    return this.service.getPages(req.workspace.tenantId, req.workspace.schoolId);
  }

  @Post('pages')
  @RequirePermission('website:manage_content')
  async createPage(@Req() req: any, @Body() dto: CreateCmsPageDto) {
    return this.service.createPage(req.workspace.tenantId, req.workspace.schoolId, req.user.id, dto);
  }

  @Put('pages/:id')
  @RequirePermission('website:manage_content')
  async updatePage(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCmsPageDto) {
    return this.service.updatePage(req.workspace.tenantId, req.workspace.schoolId, id, req.user.id, dto);
  }

  @Delete('pages/:id')
  @RequirePermission('website:manage_content')
  async deletePage(@Req() req: any, @Param('id') id: string) {
    return this.service.deletePage(req.workspace.tenantId, req.workspace.schoolId, id, req.user.id);
  }

  @Put('navigation')
  @RequirePermission('website:manage_content')
  async syncNavigation(@Req() req: any, @Body() dto: SyncNavigationDto) {
    return this.service.syncNavigation(req.workspace.tenantId, req.workspace.schoolId, req.user.id, dto);
  }

  @Get('announcements')
  @RequirePermission('website:manage_content')
  async getAnnouncements(@Req() req: any) {
    return this.service.getAnnouncements(req.workspace.tenantId, req.workspace.schoolId);
  }

  @Post('announcements')
  @RequirePermission('website:manage_content')
  async createAnnouncement(@Req() req: any, @Body() dto: CreateCmsAnnouncementDto) {
    return this.service.createAnnouncement(req.workspace.tenantId, req.workspace.schoolId, req.user.id, dto);
  }

  @Put('announcements/:id')
  @RequirePermission('website:manage_content')
  async updateAnnouncement(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCmsAnnouncementDto) {
    return this.service.updateAnnouncement(req.workspace.tenantId, req.workspace.schoolId, id, req.user.id, dto);
  }

  @Delete('announcements/:id')
  @RequirePermission('website:manage_content')
  async deleteAnnouncement(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteAnnouncement(req.workspace.tenantId, req.workspace.schoolId, id, req.user.id);
  }

  // ─── CMS Media Upload Endpoints ──────────────────────────────────────────────

  @Post('media/upload')
  @RequirePermission('website:manage_config')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException('School context required');
    const media = await this.service.uploadMedia(tenantId, schoolId, req.user.sub, file);
    return { id: media.id, filename: media.filename, mimeType: media.mimeType, serveUrl: `/api/v1/cms/admin/media/${media.id}/serve` };
  }

  @Get('media/:id/serve')
  @RequirePermission('website:manage_config')
  async serveMedia(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const media = await this.service.getMedia(req.workspace.tenantId, req.workspace.schoolId, id);
    if (!media) throw new NotFoundException('Media not found');
    res.set({ 'Content-Type': media.mimeType, 'Content-Disposition': 'inline', 'Cache-Control': 'private, max-age=3600' });
    res.send(media.data);
  }

  @Delete('media/:id')
  @RequirePermission('website:manage_config')
  async deleteMedia(@Req() req: any, @Param('id') id: string) {
    await this.service.deleteMedia(req.workspace.tenantId, req.workspace.schoolId, id, req.user.id);
    return { success: true };
  }
}