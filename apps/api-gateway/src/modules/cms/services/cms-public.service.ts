import { Injectable, NotFoundException } from '@nestjs/common';
import { kernel, PrismaClient, CmsPublicationStatus } from '@saas/core-platform';

@Injectable()
export class CmsPublicService {
  
  private rawPrisma = new PrismaClient();

  async resolveSchool(slug: string) {
    const school = await this.rawPrisma.school.findFirst({
      where: { publicSlug: slug },
      include: { tenant: true }
    });
    
    if (!school || school.tenant.status !== 'ACTIVE') {
      throw new NotFoundException('School not found or inactive');
    }
    
    const config = await kernel.db.cmsSiteConfig.findUnique({
      where: { schoolId: school.id }
    });

    if (!config || config.status !== CmsPublicationStatus.PUBLISHED) {
      throw new NotFoundException('Site is not published');
    }

    
    // Fetch canonical active admission form
    const activeAdmissionForm = await this.rawPrisma.publishedAdmissionForm.findFirst({
      where: { schoolId: school.id, tenantId: school.tenantId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    return { school, config, admissionsToken: activeAdmissionForm?.publicToken || null };
    
  }

  async getPage(tenantId: string, schoolId: string, pageSlug: string) {
    const page = await kernel.db.cmsPage.findUnique({
      where: { tenantId_schoolId_slug: { tenantId, schoolId, slug: pageSlug } }
    });

    if (!page || page.status !== CmsPublicationStatus.PUBLISHED) {
      throw new NotFoundException('Page not found');
    }

    return page;
  }

  async getNavigation(tenantId: string, schoolId: string) {
    return kernel.db.cmsNavigationItem.findMany({
      where: { tenantId, schoolId, isActive: true },
      orderBy: { orderIndex: 'asc' }
    });
  }

  async getAnnouncements(tenantId: string, schoolId: string) {
    return kernel.db.cmsAnnouncement.findMany({
      where: { tenantId, schoolId, status: CmsPublicationStatus.PUBLISHED },
      orderBy: { publishedAt: 'desc' }
    });
  }
}