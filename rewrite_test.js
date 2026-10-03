const fs = require("fs");
const path = "C:/Users/gbemi/OneDrive/Desktop/schoolOS/packages/core-platform/src/scripts/test-phase6f-cms-e2e.ts";

const content = `import { kernel, PrismaClient, CmsPublicationStatus } from '../index';
import { CmsAdminService } from '../../../apps/api-gateway/src/modules/cms/services/cms-admin.service';
import { CmsPublicService } from '../../../apps/api-gateway/src/modules/cms/services/cms-public.service';
import { AuditService } from '../audit/audit.service';

async function runTest() {
  console.log('Starting EXHAUSTIVE Phase 6F CMS E2E verification...');
  const prisma = new PrismaClient();
  const audit = new AuditService();
  const adminService = new CmsAdminService(audit);
  const publicService = new CmsPublicService();

  const tenant = await prisma.tenant.create({ data: { name: 'CMS Test Tenant', status: 'ACTIVE' } });
  const tenant2 = await prisma.tenant.create({ data: { name: 'Malicious Tenant', status: 'ACTIVE' } });
  const school = await prisma.school.create({ data: { name: 'CMS School', tenantId: tenant.id, publicSlug: 'cms-test-school' } });
  const school2 = await prisma.school.create({ data: { name: 'Other School', tenantId: tenant2.id, publicSlug: 'other-school' } });
  const user = { id: 'user-1' };

  try {
    // 1. Config creation and Optimistic Locking
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

    // 2. Media Isolation
    const otherMedia = await prisma.cmsMedia.create({
      data: { tenantId: tenant2.id, schoolId: school2.id, filename: 'hack.png', mimeType: 'image/png', sizeBytes: 100, storagePath: '/foo' }
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

    // 3. Page Lifecycle and XSS Validation
    try {
      await adminService.createPage(tenant.id, school.id, user.id, {
        title: 'XSS', slug: 'xss-page', content: '<script>alert(1)</script>'
      });
      throw new Error('XSS allowed');
    } catch (e: any) {
      if (e.status !== 400) throw e;
      console.log('? XSS injection correctly rejected (HTTP 400).');
    }

    const page = await adminService.createPage(tenant.id, school.id, user.id, {
      title: 'About', slug: 'about', content: 'About us'
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

    // 4. Public Resolution and Malicious Identifiers
    // The public renderer ONLY takes slug. It never takes tenantId or schoolId from client.
    const resolved = await publicService.resolveSchool('cms-test-school');
    if (resolved.school.tenantId !== tenant.id) throw new Error('Tenant resolution mismatch');
    console.log('? Server-side public school resolution correctly mapped publicSlug to Tenant without client-supplied IDs.');

    console.log('ALL EXHAUSTIVE 6F VERIFICATION CHECKS PASSED!');

  } catch(err) {
    console.error(err);
    process.exit(1);
  } finally {
    // Cleanup
    await prisma.cmsMedia.deleteMany({});
    await prisma.cmsPage.deleteMany({});
    await prisma.cmsSiteConfig.deleteMany({});
    await prisma.school.deleteMany({ where: { id: { in: [school.id, school2.id] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenant.id, tenant2.id] } } });
    await prisma.$disconnect();
  }
}

runTest();
`

fs.writeFileSync(path, content);
console.log("Rewrote E2E test with exhaustive checks.");
