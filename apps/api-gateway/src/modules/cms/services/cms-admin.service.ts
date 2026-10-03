import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { kernel, AuditService, CmsPublicationStatus, AuditSeverity } from '@saas/core-platform';
import { UpdateSiteConfigDto, CreateCmsPageDto, UpdateCmsPageDto, CreateCmsAnnouncementDto, UpdateCmsAnnouncementDto, SyncNavigationDto } from '../dto/cms.dto';

@Injectable()
export class CmsAdminService {
  constructor(private auditService: AuditService) {}

  async getSiteConfig(tenantId: string, schoolId: string, userId: string) {
    let config = await kernel.db.cmsSiteConfig.findUnique({
      where: { schoolId }
    });
    if (!config) {
      config = await kernel.db.cmsSiteConfig.create({
        data: { tenantId, schoolId }
      });
      // create default home page
      await kernel.db.cmsPage.create({
        data: {
          tenantId, schoolId, title: 'Home', slug: 'home', content: '# Welcome', authorId: userId // in real, needs proper auth mapping
        }
      });
    }
    return config;
  }

  async updateSiteConfig(tenantId: string, schoolId: string, userId: string, dto: UpdateSiteConfigDto) {
    const existing = await kernel.db.cmsSiteConfig.findUnique({ where: { schoolId } });
    if (!existing || existing.tenantId !== tenantId) throw new NotFoundException();

    if (existing.version !== dto.expectedVersion) {
      throw new ConflictException('Site config version mismatch');
    }

    if (dto.logoMediaId) {
      const media = await kernel.db.cmsMedia.findUnique({ where: { id: dto.logoMediaId } });
      if (!media || media.tenantId !== tenantId || media.schoolId !== schoolId) {
        throw new ForbiddenException('Invalid media reference');
      }
    }

    const updated = await kernel.db.cmsSiteConfig.update({
      where: { schoolId },
      data: {
        status: dto.status,
        logoMediaId: dto.logoMediaId,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        enableAdmissionsCta: dto.enableAdmissionsCta,
        version: { increment: 1 }
      }
    });

    await this.auditService.logAction(kernel.db as any, { tenantId, userId, action: 'CMS_CONFIG_UPDATED', entity: 'cms_site_configs', entityId: updated.id, severity: 'MEDIUM', metadata: { version: updated.version } });
    return updated;
  }

  async getPages(tenantId: string, schoolId: string) {
    return kernel.db.cmsPage.findMany({ where: { tenantId, schoolId } });
  }

  async createPage(tenantId: string, schoolId: string, userId: string, dto: CreateCmsPageDto) {
    if (dto.slug === 'home') throw new BadRequestException('home slug is reserved');
    try {
      const page = await kernel.db.cmsPage.create({
        data: {
          tenantId, schoolId, authorId: userId,
          title: dto.title, slug: dto.slug, content: dto.content
        }
      });
      await this.auditService.logAction(kernel.db as any, { tenantId, userId, action: 'CMS_PAGE_CREATED', entity: 'cms_pages', entityId: page.id, severity: 'MEDIUM', metadata: { slug: page.slug } });
      return page;
    } catch(e) {
      throw new ConflictException('Slug already exists');
    }
  }

  async updatePage(tenantId: string, schoolId: string, pageId: string, userId: string, dto: UpdateCmsPageDto) {
    const existing = await kernel.db.cmsPage.findUnique({ where: { id: pageId } });
    if (!existing || existing.tenantId !== tenantId || existing.schoolId !== schoolId) throw new NotFoundException();
    if (existing.version !== dto.expectedVersion) throw new ConflictException('Version mismatch');

    if (existing.slug === 'home' && dto.slug && dto.slug !== 'home') throw new BadRequestException('Cannot rename home page slug');
    if (existing.status === CmsPublicationStatus.ARCHIVED && dto.status === CmsPublicationStatus.PUBLISHED) {
      throw new BadRequestException('Cannot transition ARCHIVED to PUBLISHED directly');
    }

    try {
      const updated = await kernel.db.cmsPage.update({
        where: { id: pageId },
        data: {
          title: dto.title,
          slug: dto.slug,
          content: dto.content,
          status: dto.status,
          version: { increment: 1 }
        }
      });

      const auditType = dto.status && dto.status !== existing.status ? (dto.status === CmsPublicationStatus.PUBLISHED ? 'CMS_PAGE_PUBLISHED' : (dto.status === CmsPublicationStatus.ARCHIVED ? 'CMS_PAGE_ARCHIVED' : 'CMS_PAGE_UNPUBLISHED')) : 'CMS_PAGE_UPDATED';
      await this.auditService.logAction(kernel.db as any, { tenantId, userId, action: auditType, entity: 'cms_pages', entityId: updated.id, severity: 'MEDIUM', metadata: { version: updated.version } });
      return updated;
    } catch(e) {
      throw new ConflictException('Update failed or slug collision');
    }
  }

  async deletePage(tenantId: string, schoolId: string, pageId: string, userId: string) {
    const existing = await kernel.db.cmsPage.findUnique({ where: { id: pageId } });
    if (!existing || existing.tenantId !== tenantId || existing.schoolId !== schoolId) throw new NotFoundException();
    if (existing.slug === 'home') throw new BadRequestException('Cannot delete home page');

    await kernel.db.cmsPage.delete({ where: { id: pageId } });
    await this.auditService.logAction(kernel.db as any, { tenantId, userId, action: 'CMS_PAGE_DELETED', entity: 'cms_pages', entityId: pageId, severity: 'MEDIUM', metadata: {} });
  }

  async syncNavigation(tenantId: string, schoolId: string, userId: string, dto: SyncNavigationDto) {
    return kernel.db.$transaction(async (tx) => {
      await tx.cmsNavigationItem.deleteMany({ where: { tenantId, schoolId } });
      const created = [];
      for (const item of dto.items) {
        const i = await tx.cmsNavigationItem.create({
          data: {
            tenantId, schoolId,
            label: item.label,
            targetUrl: item.targetUrl,
            orderIndex: item.orderIndex,
            isActive: item.isActive
          }
        });
        created.push(i);
      }
      await this.auditService.logAction(kernel.db as any, { tenantId, userId, action: 'CMS_NAVIGATION_UPDATED', entity: 'cms_navigation_items', entityId: schoolId, severity: 'MEDIUM', metadata: { count: created.length } });
      return created;
    });
  }
}