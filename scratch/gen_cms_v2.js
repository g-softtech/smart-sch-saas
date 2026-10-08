const fs = require('fs');

const serviceContent = 
import { Injectable, NotFoundException } from '@nestjs/common';
import { kernel } from '@saas/core-platform';
import { CreateCmsEventDto, UpdateCmsEventDto, CreateCmsGalleryItemDto, UpdateCmsGalleryItemDto, CreateCmsPublicStaffDto, UpdateCmsPublicStaffDto, CreateCmsBlogPostDto, UpdateCmsBlogPostDto } from '../dto/cms-v2.dto';

@Injectable()
export class CmsBuilderService {
  async createEvent(tenantId: string, schoolId: string, dto: CreateCmsEventDto) {
    return kernel.db.cmsEvent.create({ data: { ...dto, tenantId, schoolId } });
  }

  async getEvents(tenantId: string, schoolId: string) {
    return kernel.db.cmsEvent.findMany({ where: { tenantId, schoolId }, orderBy: { orderIndex: 'asc' } });
  }

  async createGalleryItem(tenantId: string, schoolId: string, dto: CreateCmsGalleryItemDto) {
    return kernel.db.cmsGalleryItem.create({ data: { ...dto, tenantId, schoolId } });
  }

  async getGalleryItems(tenantId: string, schoolId: string) {
    return kernel.db.cmsGalleryItem.findMany({ where: { tenantId, schoolId }, orderBy: { orderIndex: 'asc' } });
  }

  async createPublicStaff(tenantId: string, schoolId: string, dto: CreateCmsPublicStaffDto) {
    return kernel.db.cmsPublicStaff.create({ data: { ...dto, tenantId, schoolId } });
  }

  async getPublicStaff(tenantId: string, schoolId: string) {
    return kernel.db.cmsPublicStaff.findMany({ where: { tenantId, schoolId }, orderBy: { orderIndex: 'asc' } });
  }

  async createBlogPost(tenantId: string, schoolId: string, authorId: string, dto: CreateCmsBlogPostDto) {
    return kernel.db.cmsBlogPost.create({ data: { ...dto, tenantId, schoolId, authorId } });
  }

  async getBlogPosts(tenantId: string, schoolId: string) {
    return kernel.db.cmsBlogPost.findMany({ where: { tenantId, schoolId }, orderBy: { createdAt: 'desc' } });
  }
}
;

const controllerContent = 
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/security/jwt-auth.guard';
import { PoliciesGuard } from '../../identity/security/policies.guard';
import { RequirePermission } from '../../identity/security/require-permission.decorator';
import { WorkspaceContextInterceptor } from '../../identity/interceptors/workspace-context.interceptor';
import { UseInterceptors } from '@nestjs/common';
import { CmsBuilderService } from '../services/cms-builder.service';
import { CreateCmsEventDto, CreateCmsGalleryItemDto, CreateCmsPublicStaffDto, CreateCmsBlogPostDto } from '../dto/cms-v2.dto';

@Controller('v1/cms/builder')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class CmsBuilderController {
  constructor(private service: CmsBuilderService) {}

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
}
;

fs.writeFileSync('apps/api-gateway/src/modules/cms/services/cms-builder.service.ts', serviceContent);
fs.writeFileSync('apps/api-gateway/src/modules/cms/controllers/cms-builder.controller.ts', controllerContent);
