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
        data: { tenantId, schoolId, themePayload: {} }
      });
      // create default home page
      await kernel.db.cmsPage.create({
        data: {
          tenantId, schoolId, title: 'Home', slug: 'home', content: '# Welcome', authorId: userId
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
        throw new ForbiddenException('Invalid logo media reference');
      }
    }

    if (dto.faviconMediaId) {
      const media = await kernel.db.cmsMedia.findUnique({ where: { id: dto.faviconMediaId } });
      if (!media || media.tenantId !== tenantId || media.schoolId !== schoolId) {
        throw new ForbiddenException('Invalid favicon media reference');
      }
    }

    // 1. Slug Validation & Update
    if (dto.publicSlug) {
      const slug = dto.publicSlug.trim().toLowerCase();
      if (!/^[a-z0-9-]+$/.test(slug)) {
        throw new BadRequestException('Slug can only contain lowercase letters, numbers, and hyphens');
      }
      const reserved = ['api', 'admin', 'dashboard', 'portal', 'auth', 'webhook'];
      if (reserved.includes(slug)) {
        throw new BadRequestException('This slug is reserved and cannot be used');
      }

      // Check for uniqueness across all tenants (slugs are globally unique for the public renderer)
      const existingSchool = await kernel.db.school.findFirst({
        where: { publicSlug: slug, NOT: { id: schoolId } }
      });
      if (existingSchool) {
        throw new ConflictException('This public slug is already taken by another school');
      }

      // Update the school record directly
      await kernel.db.school.update({
        where: { id: schoolId },
        data: { publicSlug: slug }
      });
    }

    // 2. Draft/Publish Logic
    let updateData: any = { version: { increment: 1 } };
    let themePayload = (existing.themePayload as any) || {};

    if (dto.publishAction === 'DRAFT') {
      // Store all UI fields in workingDraft
      updateData.themePayload = {
        ...themePayload,
        workingDraft: {
          primaryColor: dto.primaryColor,
          secondaryColor: dto.secondaryColor,
          logoMediaId: dto.logoMediaId,
          faviconMediaId: dto.faviconMediaId,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          enableAdmissionsCta: dto.enableAdmissionsCta,
          themePayload: dto.themePayload,
        }
      };
      // Do not update root fields, keep existing status
    } else {
      // PUBLISH action
      // Clear workingDraft and promote fields to root
      const { workingDraft, ...restThemePayload } = themePayload;
      updateData.themePayload = {
        ...restThemePayload,
        ...dto.themePayload,
      };
      updateData.status = CmsPublicationStatus.PUBLISHED; // Force status to PUBLISHED regardless of UI state
      updateData.primaryColor = dto.primaryColor;
      updateData.secondaryColor = dto.secondaryColor;
      updateData.logoMediaId = dto.logoMediaId;
      updateData.faviconMediaId = dto.faviconMediaId;
      updateData.contactEmail = dto.contactEmail;
      updateData.contactPhone = dto.contactPhone;
      updateData.enableAdmissionsCta = dto.enableAdmissionsCta;
    }

    const updated = await kernel.db.cmsSiteConfig.update({
      where: { schoolId },
      data: updateData
    });

    await this.auditService.logAction(kernel.db as any, { tenantId, userId, action: 'CMS_CONFIG_UPDATED', entity: 'cms_site_configs', entityId: updated.id, severity: 'MEDIUM', metadata: { version: updated.version, publishAction: dto.publishAction } });
    return updated;
  }

  async getPages(tenantId: string, schoolId: string) {
    return kernel.db.cmsPage.findMany({ where: { tenantId, schoolId } });
  }

  
  private sanitizeContent(content: string | undefined | null): any {
    if (!content) return content as any;
    const dangerous = new RegExp("<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>|javascript:", "gi");
    if (dangerous.test(content)) {
      throw new BadRequestException("Unsafe HTML or JavaScript detected");
    }
    return content;
  }

  async createPage(tenantId: string, schoolId: string, userId: string, dto: CreateCmsPageDto) {
    if (dto.slug === 'home') throw new BadRequestException('home slug is reserved');
    const safeContent = this.sanitizeContent(dto.content);
    try {
      const page = await kernel.db.cmsPage.create({
        data: {
          tenantId, schoolId, authorId: userId,
          title: dto.title, slug: dto.slug, content: safeContent
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
          content: this.sanitizeContent(dto.content) ? this.sanitizeContent(dto.content) : dto.content,
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

  async getAnnouncements(tenantId: string, schoolId: string) {
    return kernel.db.cmsAnnouncement.findMany({ where: { tenantId, schoolId }, orderBy: { createdAt: 'desc' } });
  }

  async createAnnouncement(tenantId: string, schoolId: string, userId: string, dto: CreateCmsAnnouncementDto) {
    const announcement = await kernel.db.cmsAnnouncement.create({
      data: {
        tenantId, schoolId, authorId: userId,
        title: dto.title, content: dto.content ? this.sanitizeContent(dto.content) : dto.content
      }
    });
    await this.auditService.logAction(kernel.db as any, { tenantId, userId, action: 'CMS_ANNOUNCEMENT_CREATED', entity: 'cms_announcements', entityId: announcement.id, severity: 'MEDIUM', metadata: {} });
    return announcement;
  }

  async updateAnnouncement(tenantId: string, schoolId: string, id: string, userId: string, dto: UpdateCmsAnnouncementDto) {
    const existing = await kernel.db.cmsAnnouncement.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId || existing.schoolId !== schoolId) throw new NotFoundException();
    if (existing.version !== dto.expectedVersion) throw new ConflictException('Version mismatch');

    const updated = await kernel.db.cmsAnnouncement.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        status: dto.status,
        version: { increment: 1 }
      }
    });

    await this.auditService.logAction(kernel.db as any, { tenantId, userId, action: 'CMS_ANNOUNCEMENT_UPDATED', entity: 'cms_announcements', entityId: updated.id, severity: 'MEDIUM', metadata: { version: updated.version } });
    return updated;
  }

  async deleteAnnouncement(tenantId: string, schoolId: string, id: string, userId: string) {
    const existing = await kernel.db.cmsAnnouncement.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId || existing.schoolId !== schoolId) throw new NotFoundException();

    await kernel.db.cmsAnnouncement.delete({ where: { id } });
    await this.auditService.logAction(kernel.db as any, { tenantId, userId, action: 'CMS_ANNOUNCEMENT_DELETED', entity: 'cms_announcements', entityId: id, severity: 'MEDIUM', metadata: {} });
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


  // ─── CMS Media ───────────────────────────────────────────────────────────────

  private readonly ALLOWED_MIME_TYPES = [
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
    'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml',
  ];

  private readonly MAGIC_BYTES: Record<string, number[][]> = {
    'image/png':  [[0x89, 0x50, 0x4E, 0x47]],
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/gif':  [[0x47, 0x49, 0x46, 0x38]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  };

  private validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
    const signatures = this.MAGIC_BYTES[mimeType];
    if (!signatures) return true; // SVG, ICO - skip binary check
    return signatures.some(sig => sig.every((byte, i) => buffer[i] === byte));
  }

  async uploadMedia(tenantId: string, schoolId: string, userId: string, file: Express.Multer.File) {
    const mime = file.mimetype.toLowerCase();
    if (!this.ALLOWED_MIME_TYPES.includes(mime)) {
      throw new BadRequestException("File type '" + mime + "' is not allowed. Allowed: PNG, JPEG, WebP, GIF, ICO, SVG");
    }
    if (!this.validateMagicBytes(file.buffer, mime)) {
      throw new BadRequestException('File content does not match declared MIME type');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File exceeds 5 MB limit');
    }

    const media = await kernel.db.cmsMedia.create({
      data: {
        tenantId,
        schoolId,
        authorId: userId,
        filename: file.originalname,
        mimeType: mime,
        data: file.buffer,
      },
    });

    await this.auditService.logAction(kernel.db as any, {
      tenantId, userId, action: 'CMS_MEDIA_UPLOADED', entity: 'cms_media',
      entityId: media.id, severity: 'LOW' as any, metadata: { filename: media.filename, mimeType: mime },
    });

    return media;
  }

  async getMedia(tenantId: string, schoolId: string, id: string) {
    const media = await kernel.db.cmsMedia.findUnique({ where: { id } });
    if (!media || media.tenantId !== tenantId || media.schoolId !== schoolId) return null;
    return media;
  }

  async deleteMedia(tenantId: string, schoolId: string, id: string, userId: string) {
    const media = await kernel.db.cmsMedia.findUnique({ where: { id } });
    if (!media || media.tenantId !== tenantId || media.schoolId !== schoolId) {
      throw new NotFoundException('Media not found');
    }
    await kernel.db.cmsMedia.delete({ where: { id } });
    await this.auditService.logAction(kernel.db as any, {
      tenantId, userId, action: 'CMS_MEDIA_DELETED', entity: 'cms_media',
      entityId: id, severity: 'LOW' as any, metadata: {},
    });
  }

}