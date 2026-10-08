import { Injectable, NotFoundException } from "@nestjs/common";
import {
  kernel,
  PrismaClient,
  CmsPublicationStatus,
} from "@saas/core-platform";

@Injectable()
export class CmsPublicService {
  private rawPrisma = new PrismaClient();

  async resolveSchool(slug: string, preview?: boolean) {
    const school = await this.rawPrisma.school.findFirst({
      where: { publicSlug: slug },
      include: { tenant: true },
    });

    if (!school || school.tenant.status !== "ACTIVE") {
      throw new NotFoundException("School not found or inactive");
    }

    const config = await kernel.db.cmsSiteConfig.findUnique({
      where: { schoolId: school.id },
    });

    if (!config) {
      throw new NotFoundException("Site config not found");
    }

    if (!preview && config.status !== CmsPublicationStatus.PUBLISHED) {
      throw new NotFoundException("Site is not published");
    }

    let activeConfig = config;
    if (
      preview &&
      config.themePayload &&
      (config.themePayload as any).workingDraft
    ) {
      const draft = (config.themePayload as any).workingDraft;
      activeConfig = {
        ...config,
        primaryColor: draft.primaryColor ?? config.primaryColor,
        secondaryColor: draft.secondaryColor ?? config.secondaryColor,
        logoMediaId: draft.logoMediaId ?? config.logoMediaId,
        faviconMediaId: draft.faviconMediaId ?? config.faviconMediaId,
        themePayload: draft.themePayload ?? config.themePayload,
        contactEmail: draft.contactEmail ?? config.contactEmail,
        contactPhone: draft.contactPhone ?? config.contactPhone,
        enableAdmissionsCta:
          draft.enableAdmissionsCta ?? config.enableAdmissionsCta,
      };
    }

    // Fetch canonical active admission form
    const activeAdmissionForm =
      await this.rawPrisma.publishedAdmissionForm.findFirst({
        where: {
          schoolId: school.id,
          tenantId: school.tenantId,
          isActive: true,
        },
        orderBy: { createdAt: "desc" },
      });

    // Fetch related CMS data
    const events = await kernel.db.cmsEvent.findMany({
      where: { tenantId: school.tenantId, schoolId: school.id },
      orderBy: { eventDate: "asc" },
      take: 6,
      include: { featuredMedia: true },
    });

    const gallery = await kernel.db.cmsGalleryItem.findMany({
      where: { tenantId: school.tenantId, schoolId: school.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { media: true },
    });

    const staff = await kernel.db.cmsPublicStaff.findMany({
      where: { tenantId: school.tenantId, schoolId: school.id },
      orderBy: { orderIndex: "asc" },
      include: { photoMedia: true },
    });

    const blogPosts = await kernel.db.cmsBlogPost.findMany({
      where: {
        tenantId: school.tenantId,
        schoolId: school.id,
        status: CmsPublicationStatus.PUBLISHED,
      },
      orderBy: { publishedAt: "desc" },
      take: 6,
      include: { featuredMedia: true },
    });

    return {
      school,
      config: activeConfig,
      admissionsToken: activeAdmissionForm?.publicToken || null,
      events,
      gallery,
      staff,
      blogPosts,
    };
  }

  async getPage(tenantId: string, schoolId: string, pageSlug: string) {
    const page = await kernel.db.cmsPage.findUnique({
      where: { tenantId_schoolId_slug: { tenantId, schoolId, slug: pageSlug } },
    });

    if (!page || page.status !== CmsPublicationStatus.PUBLISHED) {
      throw new NotFoundException("Page not found");
    }

    return page;
  }

  async getNavigation(tenantId: string, schoolId: string) {
    return kernel.db.cmsNavigationItem.findMany({
      where: { tenantId, schoolId, isActive: true },
      orderBy: { orderIndex: "asc" },
    });
  }

  async getAnnouncements(tenantId: string, schoolId: string) {
    return kernel.db.cmsAnnouncement.findMany({
      where: { tenantId, schoolId, status: CmsPublicationStatus.PUBLISHED },
      orderBy: { publishedAt: "desc" },
    });
  }

  async getPublicMedia(schoolId: string, mediaId: string) {
    const media = await kernel.db.cmsMedia.findUnique({
      where: { id: mediaId },
    });
    // Ensure media belongs to this school — prevents cross-school leakage
    if (!media || media.schoolId !== schoolId) return null;
    return media;
  }
}
