import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { kernel } from '@saas/core-platform';
import { CreateCmsEventDto, UpdateCmsEventDto, CreateCmsGalleryItemDto, UpdateCmsGalleryItemDto, CreateCmsPublicStaffDto, UpdateCmsPublicStaffDto, CreateCmsBlogPostDto, UpdateCmsBlogPostDto } from '../dto/cms-v2.dto';

@Injectable()
export class CmsBuilderService {
  private async validateMediaOwnership(tenantId: string, schoolId: string, mediaId?: string) {
    if (!mediaId) return;
    const media = await kernel.db.cmsMedia.findFirst({ where: { id: mediaId, tenantId, schoolId } });
    if (!media) {
      throw new BadRequestException(`Media with ID ${mediaId} not found or belongs to another workspace.`);
    }
  }

  // --- Events ---
  async createEvent(tenantId: string, schoolId: string, dto: CreateCmsEventDto) {
    await this.validateMediaOwnership(tenantId, schoolId, dto.featuredMediaId);
    return kernel.db.cmsEvent.create({ data: { ...dto, tenantId, schoolId, eventDate: new Date(dto.eventDate) } });
  }

  async getEvents(tenantId: string, schoolId: string) {
    return kernel.db.cmsEvent.findMany({ where: { tenantId, schoolId }, orderBy: { eventDate: 'desc' } });
  }

  async updateEvent(tenantId: string, schoolId: string, eventId: string, dto: UpdateCmsEventDto) {
    await this.validateMediaOwnership(tenantId, schoolId, dto.featuredMediaId);
    const existing = await kernel.db.cmsEvent.findFirst({ where: { id: eventId, tenantId, schoolId } });
    if (!existing) throw new NotFoundException('Event not found');
    const data: any = { ...dto };
    if (dto.eventDate) data.eventDate = new Date(dto.eventDate);
    return kernel.db.cmsEvent.update({ where: { id: eventId }, data });
  }

  async deleteEvent(tenantId: string, schoolId: string, eventId: string) {
    const existing = await kernel.db.cmsEvent.findFirst({ where: { id: eventId, tenantId, schoolId } });
    if (!existing) throw new NotFoundException('Event not found');
    return kernel.db.cmsEvent.delete({ where: { id: eventId } });
  }

  // --- Gallery ---
  async createGalleryItem(tenantId: string, schoolId: string, dto: CreateCmsGalleryItemDto) {
    await this.validateMediaOwnership(tenantId, schoolId, dto.mediaId);
    return kernel.db.cmsGalleryItem.create({ data: { ...dto, tenantId, schoolId } });
  }

  async getGalleryItems(tenantId: string, schoolId: string) {
    return kernel.db.cmsGalleryItem.findMany({ where: { tenantId, schoolId }, orderBy: { orderIndex: 'asc' } });
  }

  async updateGalleryItem(tenantId: string, schoolId: string, itemId: string, dto: UpdateCmsGalleryItemDto) {
    await this.validateMediaOwnership(tenantId, schoolId, dto.mediaId);
    const existing = await kernel.db.cmsGalleryItem.findFirst({ where: { id: itemId, tenantId, schoolId } });
    if (!existing) throw new NotFoundException('Gallery item not found');
    return kernel.db.cmsGalleryItem.update({ where: { id: itemId }, data: dto });
  }

  async deleteGalleryItem(tenantId: string, schoolId: string, itemId: string) {
    const existing = await kernel.db.cmsGalleryItem.findFirst({ where: { id: itemId, tenantId, schoolId } });
    if (!existing) throw new NotFoundException('Gallery item not found');
    return kernel.db.cmsGalleryItem.delete({ where: { id: itemId } });
  }

  // --- Public Staff ---
  async createPublicStaff(tenantId: string, schoolId: string, dto: CreateCmsPublicStaffDto) {
    await this.validateMediaOwnership(tenantId, schoolId, dto.photoMediaId);
    return kernel.db.cmsPublicStaff.create({ data: { ...dto, tenantId, schoolId } });
  }

  async getPublicStaff(tenantId: string, schoolId: string) {
    return kernel.db.cmsPublicStaff.findMany({ where: { tenantId, schoolId }, orderBy: { orderIndex: 'asc' } });
  }

  async updatePublicStaff(tenantId: string, schoolId: string, staffId: string, dto: UpdateCmsPublicStaffDto) {
    await this.validateMediaOwnership(tenantId, schoolId, dto.photoMediaId);
    const existing = await kernel.db.cmsPublicStaff.findFirst({ where: { id: staffId, tenantId, schoolId } });
    if (!existing) throw new NotFoundException('Staff not found');
    return kernel.db.cmsPublicStaff.update({ where: { id: staffId }, data: dto });
  }

  async deletePublicStaff(tenantId: string, schoolId: string, staffId: string) {
    const existing = await kernel.db.cmsPublicStaff.findFirst({ where: { id: staffId, tenantId, schoolId } });
    if (!existing) throw new NotFoundException('Staff not found');
    return kernel.db.cmsPublicStaff.delete({ where: { id: staffId } });
  }

  // --- Blog Posts ---
  async createBlogPost(tenantId: string, schoolId: string, authorId: string, dto: CreateCmsBlogPostDto) {
    await this.validateMediaOwnership(tenantId, schoolId, dto.featuredMediaId);
    return kernel.db.cmsBlogPost.create({ data: { ...dto, tenantId, schoolId, authorId } });
  }

  async getBlogPosts(tenantId: string, schoolId: string) {
    return kernel.db.cmsBlogPost.findMany({ where: { tenantId, schoolId }, orderBy: { createdAt: 'desc' } });
  }

  async updateBlogPost(tenantId: string, schoolId: string, postId: string, dto: UpdateCmsBlogPostDto) {
    await this.validateMediaOwnership(tenantId, schoolId, dto.featuredMediaId);
    const existing = await kernel.db.cmsBlogPost.findFirst({ where: { id: postId, tenantId, schoolId } });
    if (!existing) throw new NotFoundException('Blog post not found');
    return kernel.db.cmsBlogPost.update({ where: { id: postId }, data: dto });
  }

  async deleteBlogPost(tenantId: string, schoolId: string, postId: string) {
    const existing = await kernel.db.cmsBlogPost.findFirst({ where: { id: postId, tenantId, schoolId } });
    if (!existing) throw new NotFoundException('Blog post not found');
    return kernel.db.cmsBlogPost.delete({ where: { id: postId } });
  }
}
