import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/security/jwt-auth.guard';
import { PoliciesGuard } from '../../identity/security/policies.guard';
import { RequirePermission } from '../../identity/security/require-permission.decorator';
import { WorkspaceContextInterceptor } from '../../identity/interceptors/workspace-context.interceptor';
import { UseInterceptors } from '@nestjs/common';
import { CmsBuilderService } from '../services/cms-builder.service';
import { CreateCmsEventDto, UpdateCmsEventDto, CreateCmsGalleryItemDto, UpdateCmsGalleryItemDto, CreateCmsPublicStaffDto, UpdateCmsPublicStaffDto, CreateCmsBlogPostDto, UpdateCmsBlogPostDto } from '../dto/cms-v2.dto';

@Controller('v1/cms/builder')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class CmsBuilderController {
  constructor(private service: CmsBuilderService) {}

  // --- Events ---
  @Get('events')
  @RequirePermission('website:manage_content')
  async getEvents(@Req() req: any) {
    return this.service.getEvents(req.workspace.tenantId, req.workspace.schoolId);
  }

  @Post('events')
  @RequirePermission('website:manage_content')
  async createEvent(@Req() req: any, @Body() dto: CreateCmsEventDto) {
    return this.service.createEvent(req.workspace.tenantId, req.workspace.schoolId, dto);
  }

  @Put('events/:id')
  @RequirePermission('website:manage_content')
  async updateEvent(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCmsEventDto) {
    return this.service.updateEvent(req.workspace.tenantId, req.workspace.schoolId, id, dto);
  }

  @Delete('events/:id')
  @RequirePermission('website:manage_content')
  async deleteEvent(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteEvent(req.workspace.tenantId, req.workspace.schoolId, id);
  }

  // --- Gallery ---
  @Get('gallery')
  @RequirePermission('website:manage_content')
  async getGallery(@Req() req: any) {
    return this.service.getGalleryItems(req.workspace.tenantId, req.workspace.schoolId);
  }

  @Post('gallery')
  @RequirePermission('website:manage_content')
  async createGalleryItem(@Req() req: any, @Body() dto: CreateCmsGalleryItemDto) {
    return this.service.createGalleryItem(req.workspace.tenantId, req.workspace.schoolId, dto);
  }

  @Put('gallery/:id')
  @RequirePermission('website:manage_content')
  async updateGalleryItem(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCmsGalleryItemDto) {
    return this.service.updateGalleryItem(req.workspace.tenantId, req.workspace.schoolId, id, dto);
  }

  @Delete('gallery/:id')
  @RequirePermission('website:manage_content')
  async deleteGalleryItem(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteGalleryItem(req.workspace.tenantId, req.workspace.schoolId, id);
  }

  // --- Public Staff ---
  @Get('staff')
  @RequirePermission('website:manage_content')
  async getStaff(@Req() req: any) {
    return this.service.getPublicStaff(req.workspace.tenantId, req.workspace.schoolId);
  }

  @Post('staff')
  @RequirePermission('website:manage_content')
  async createStaff(@Req() req: any, @Body() dto: CreateCmsPublicStaffDto) {
    return this.service.createPublicStaff(req.workspace.tenantId, req.workspace.schoolId, dto);
  }

  @Put('staff/:id')
  @RequirePermission('website:manage_content')
  async updateStaff(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCmsPublicStaffDto) {
    return this.service.updatePublicStaff(req.workspace.tenantId, req.workspace.schoolId, id, dto);
  }

  @Delete('staff/:id')
  @RequirePermission('website:manage_content')
  async deleteStaff(@Req() req: any, @Param('id') id: string) {
    return this.service.deletePublicStaff(req.workspace.tenantId, req.workspace.schoolId, id);
  }

  // --- Blog Posts ---
  @Get('blog')
  @RequirePermission('website:manage_content')
  async getBlogPosts(@Req() req: any) {
    return this.service.getBlogPosts(req.workspace.tenantId, req.workspace.schoolId);
  }

  @Post('blog')
  @RequirePermission('website:manage_content')
  async createBlogPost(@Req() req: any, @Body() dto: CreateCmsBlogPostDto) {
    return this.service.createBlogPost(req.workspace.tenantId, req.workspace.schoolId, req.user.sub, dto);
  }

  @Put('blog/:id')
  @RequirePermission('website:manage_content')
  async updateBlogPost(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCmsBlogPostDto) {
    return this.service.updateBlogPost(req.workspace.tenantId, req.workspace.schoolId, id, dto);
  }

  @Delete('blog/:id')
  @RequirePermission('website:manage_content')
  async deleteBlogPost(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteBlogPost(req.workspace.tenantId, req.workspace.schoolId, id);
  }
}
