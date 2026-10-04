import { kernel, PrismaClient, CmsPublicationStatus } from '../index';
import { CmsAdminService } from '../../../../apps/api-gateway/src/modules/cms/services/cms-admin.service';
import { CmsPublicService } from '../../../../apps/api-gateway/src/modules/cms/services/cms-public.service';

class DummyAudit {
  log() {}
  logEvent() {}
  logAction() {}
}

async function runTest() {
  console.log('Starting EXHAUSTIVE Phase 6F CMS E2E verification...');
  const prisma = new PrismaClient();
  const adminService = new CmsAdminService(new DummyAudit() as any);
  const publicService = new CmsPublicService();

  const id = Date.now();
  const tenant = await prisma.tenant.create({ data: { name: 'CMS Test Tenant', slug: 'cms-tenant-' + id, status: 'ACTIVE' } });
  const tenant2 = await prisma.tenant.create({ data: { name: 'Malicious Tenant', slug: 'malicious-tenant-' + id, status: 'ACTIVE' } });
  const school = await prisma.school.create({ data: { name: 'CMS School', tenantId: tenant.id, publicSlug: 'cms-test-school-' + id } });
  const school2 = await prisma.school.create({ data: { name: 'Other School', tenantId: tenant2.id, publicSlug: 'other-school-' + id } });
  
  const user = await prisma.user.create({ data: { email: 'admin' + id + '@school.com', globalRole: 'SUPER_ADMIN' } });

  try {
    const config = await adminService.getSiteConfig(tenant.id, school.id, user.id);
    let updatedConfig = await adminService.updateSiteConfig(tenant.id, school.id, user.id, {
      status: CmsPublicationStatus.PUBLISHED, expectedVersion: config.version, enableAdmissionsCta: true, themePayload: { colorMode: 'dark' }
    });
    console.log('? Config Published successfully.');

    try {
      await adminService.updateSiteConfig(tenant.id, school.id, user.id, {
        status: CmsPublicationStatus.DRAFT, expectedVersion: config.version, enableAdmissionsCta: false
      });
      throw new Error('Optimistic locking failed');
    } catch (e: any) {
      if (e.status !== 409) throw e;
      console.log('? Optimistic locking properly threw HTTP 409 (Conflict).');
    }

    const otherMedia = await prisma.cmsMedia.create({
      data: { tenantId: tenant2.id, schoolId: school2.id, mimeType: 'image/png', data: Buffer.from('fake'), authorId: user.id }
    });
    try {
      await adminService.updateSiteConfig(tenant.id, school.id, user.id, {
        status: CmsPublicationStatus.PUBLISHED, expectedVersion: updatedConfig.version, enableAdmissionsCta: true, logoMediaId: otherMedia.id
      });
      throw new Error('Media isolation failed');
    } catch (e: any) {
      if (e.status !== 403) throw e;
      console.log('? Cross-school Media assignment correctly rejected (HTTP 403).');
    }

    try {
      await adminService.createPage(tenant.id, school.id, user.id, {
        title: 'XSS', slug: 'xss-page-' + id, content: '<script>alert(1)</script>'
      });
      throw new Error('XSS allowed');
    } catch (e: any) {
      if (e.status !== 400) throw e;
      console.log('? XSS injection correctly rejected (HTTP 400).');
    }

    const page = await adminService.createPage(tenant.id, school.id, user.id, {
      title: 'About', slug: 'about-' + id, content: 'About us'
    });
    const pubPage = await adminService.updatePage(tenant.id, school.id, page.id, user.id, {
      status: CmsPublicationStatus.PUBLISHED, expectedVersion: page.version
    });
    const arcPage = await adminService.updatePage(tenant.id, school.id, page.id, user.id, {
      status: CmsPublicationStatus.ARCHIVED, expectedVersion: pubPage.version
    });
    
    try {
      await adminService.updatePage(tenant.id, school.id, page.id, user.id, {
        status: CmsPublicationStatus.PUBLISHED, expectedVersion: arcPage.version
      });
      throw new Error('Lifecycle violation allowed');
    } catch (e: any) {
      if (e.status !== 400) throw e;
      console.log('? Invalid lifecycle transition (ARCHIVED -> PUBLISHED) correctly rejected.');
    }

    const resolved = await publicService.resolveSchool('cms-test-school-' + id);
    if (resolved.school.tenantId !== tenant.id) throw new Error('Tenant resolution mismatch');
    console.log('? Server-side public school resolution correctly mapped publicSlug to Tenant without client-supplied IDs.');

    console.log('ALL EXHAUSTIVE 6F VERIFICATION CHECKS PASSED!');

  } catch(err) {
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.cmsMedia.deleteMany({ where: { schoolId: { in: [school.id, school2.id] } } });
    await prisma.cmsPage.deleteMany({ where: { schoolId: { in: [school.id, school2.id] } } });
    await prisma.cmsSiteConfig.deleteMany({ where: { schoolId: { in: [school.id, school2.id] } } });
    await prisma.school.deleteMany({ where: { id: { in: [school.id, school2.id] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenant.id, tenant2.id] } } });
    await prisma.user.deleteMany({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}

runTest();
