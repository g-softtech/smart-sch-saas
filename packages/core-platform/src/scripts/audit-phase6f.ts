import { PrismaClient, CmsPublicationStatus } from '../index';
import { CmsAdminService } from '../../../../apps/api-gateway/src/modules/cms/services/cms-admin.service';

class DummyAudit { log() {} logEvent() {} logAction() {} }

async function fetchUrl(url: string, options: any = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  return { status: res.status, data: text };
}

async function runAudit() {
  console.log('--- OPTIMISTIC LOCKING TEST ---');
  const prisma = new PrismaClient();
  const adminService = new CmsAdminService(new DummyAudit() as any);
  
  const id = Date.now();
  const tenant = await prisma.tenant.create({ data: { name: 'Tenant ' + id, slug: 't-' + id, status: 'ACTIVE' } });
  const school = await prisma.school.create({ data: { name: 'School ' + id, tenantId: tenant.id, publicSlug: 's-' + id } });
  const user = await prisma.user.create({ data: { email: 'u' + id + '@test.com', globalRole: 'SUPER_ADMIN' } });

  const page = await adminService.createPage(tenant.id, school.id, user.id, { slug: 'lock-test', title: 'Lock Test', content: 'v1' });
  
  console.log('Original version:', page.version);
  
  try {
    await adminService.updatePage(tenant.id, school.id, page.id, user.id, { status: CmsPublicationStatus.PUBLISHED, expectedVersion: page.version, content: 'v2 - success' });
    console.log('Update 1 (correct version) SUCCEEDED');
  } catch(e) {
    console.log('Update 1 FAILED');
  }

  try {
    // Deliberately passing the original stale version
    await adminService.updatePage(tenant.id, school.id, page.id, user.id, { status: CmsPublicationStatus.PUBLISHED, expectedVersion: page.version, content: 'v3 - conflict' });
    console.log('Update 2 (stale version) SUCCEEDED - BAD!');
  } catch(e: any) {
    console.log(`Update 2 (stale version) FAILED as expected with status ${e.status}: ${e.message}`);
  }

  console.log('\n--- CACHE INVALIDATION TEST ---');
  const baseUrl = `http://localhost:3000/${school.publicSlug}`;
  const config = await adminService.getSiteConfig(tenant.id, school.id, user.id);
  await adminService.updateSiteConfig(tenant.id, school.id, user.id, { status: CmsPublicationStatus.PUBLISHED, expectedVersion: config.version, enableAdmissionsCta: true, themePayload: {} });

  const customPage = await adminService.createPage(tenant.id, school.id, user.id, { slug: 'cache', title: 'Cache Test', content: 'OLD_CONTENT' });
  await adminService.updatePage(tenant.id, school.id, customPage.id, user.id, { status: CmsPublicationStatus.PUBLISHED, expectedVersion: customPage.version });

  const r1 = await fetchUrl(`${baseUrl}/cache`);
  console.log(`Fetch 1 (Old Content): Status ${r1.status}, Contains 'OLD_CONTENT'? ${r1.data.includes('OLD_CONTENT')}`);

  await adminService.updatePage(tenant.id, school.id, customPage.id, user.id, { status: CmsPublicationStatus.PUBLISHED, expectedVersion: customPage.version + 1, content: 'NEW_CONTENT_123' });
  
  const r2 = await fetchUrl(`${baseUrl}/cache`);
  console.log(`Fetch 2 (New Content): Status ${r2.status}, Contains 'NEW_CONTENT_123'? ${r2.data.includes('NEW_CONTENT_123')}`);
  console.log('Check Next.js tags used for cache: `cms-school-${slug}` and `cms-school-${slug}-page-${pageSlug}`.');

  await prisma.cmsPage.deleteMany({ where: { schoolId: school.id } });
  await prisma.cmsSiteConfig.deleteMany({ where: { schoolId: school.id } });
  await prisma.school.delete({ where: { id: school.id } });
  await prisma.tenant.delete({ where: { id: tenant.id } });
  await prisma.user.delete({ where: { id: user.id } });
}
runAudit().finally(() => process.exit(0));
