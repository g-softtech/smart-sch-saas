import { kernel, CmsPublicationStatus, PrismaClient } from "../..";
import * as assert from "assert";
import { CmsAdminService } from "../../../../apps/api-gateway/src/modules/cms/services/cms-admin.service";
import { CmsPublicService } from "../../../../apps/api-gateway/src/modules/cms/services/cms-public.service";
import { AuditService } from "../..";

const prisma = new PrismaClient();
const audit = new AuditService({ mask: (v: any) => v } as any, { calculateRetentionDate: () => new Date() } as any);
const admin = new CmsAdminService(audit);
const pub = new CmsPublicService();

async function runTest() {
  console.log("Starting Phase 6F CMS E2E verification...");

  const tenantA = "tenant-a-cms";
  const tenantB = "tenant-b-cms";
  const schoolA = "school-a-cms";
  const schoolB = "school-b-cms";
  const userA = "user-a-cms";
  const userB = "user-b-cms";
  const slugA = "slug-a-cms";
  const slugB = "slug-b-cms";
  await prisma.cmsNavigationItem.deleteMany().catch(()=>{});
  await prisma.cmsPage.deleteMany().catch(()=>{});
  await prisma.cmsSiteConfig.deleteMany().catch(()=>{});
  await prisma.school.deleteMany().catch(()=>{});
  await prisma.tenant.deleteMany().catch(()=>{});
  await prisma.user.deleteMany().catch(()=>{});

  await prisma.tenant.create({ data: { id: tenantA, name: "Tenant A", slug: tenantA, status: "ACTIVE" } }).catch(()=> {});
  await prisma.tenant.create({ data: { id: tenantB, name: "Tenant B", slug: tenantB, status: "ACTIVE" } }).catch(()=> {});

  await prisma.school.create({ data: { id: schoolA, tenantId: tenantA, name: "School A", publicSlug: slugA } }).catch(()=> {});
  await prisma.school.create({ data: { id: schoolB, tenantId: tenantB, name: "School B", publicSlug: slugB } }).catch(()=> {});

  await prisma.user.create({ data: { id: userA, email: "usera@cms.test" } }).catch(()=> {});
  await prisma.user.create({ data: { id: userB, email: "userb@cms.test" } }).catch(()=> {});

  // 1. Get/Init config
  let configA = await admin.getSiteConfig(tenantA, schoolA, userA);
  assert.strictEqual(configA.status, CmsPublicationStatus.DRAFT);
  let configB = await admin.getSiteConfig(tenantB, schoolB, userB);
  assert.strictEqual(configB.status, CmsPublicationStatus.DRAFT);

  // 2. Draft invisibility (Public resolution fails)
  try {
    await pub.resolveSchool(slugA);
    assert.fail("Should throw NotFoundException for Draft site");
  } catch(e: any) { console.log('ERROR:', e); assert.ok(e.status === 404 || (e.getStatus && e.getStatus() === 404) || e.message.includes('not found') || e.message.includes('Not Found') || (e.response && e.response.statusCode === 404) || e.name === 'NotFoundException'); }

  // 3. Publish site config A
  configA = await admin.updateSiteConfig(tenantA, schoolA, userA, {
    status: CmsPublicationStatus.PUBLISHED,
    expectedVersion: configA.version,
    enableAdmissionsCta: true
  });
  assert.strictEqual(configA.status, CmsPublicationStatus.PUBLISHED);

  // 4. Public resolution succeeds now
  const resolved = await pub.resolveSchool(slugA);
  assert.strictEqual(resolved.school.id, schoolA);

  // 5. Create Page
  const pageA = await admin.createPage(tenantA, schoolA, userA, { title: "About", slug: "about", content: "About Us" });
  assert.strictEqual(pageA.status, CmsPublicationStatus.DRAFT);

  // 6. Draft page invisiblity
  try {
    await pub.getPage(tenantA, schoolA, "about");
    assert.fail("Should throw NotFoundException for Draft page");
  } catch(e: any) { console.log('ERROR:', e); assert.ok(e.status === 404 || (e.getStatus && e.getStatus() === 404) || e.message.includes('not found') || e.message.includes('Not Found') || (e.response && e.response.statusCode === 404) || e.name === 'NotFoundException'); }

  // 7. Publish page
  const pubPageA = await admin.updatePage(tenantA, schoolA, pageA.id, userA, {
    status: CmsPublicationStatus.PUBLISHED,
    expectedVersion: pageA.version
  });

  // 8. Public page visibility
  const publicPageA = await pub.getPage(tenantA, schoolA, "about");
  assert.strictEqual(publicPageA.id, pageA.id);

  // 9. Slug Collision (within same school)
  try {
    await admin.createPage(tenantA, schoolA, userA, { title: "About 2", slug: "about", content: "About 2" });
    assert.fail("Should reject duplicate slug");
  } catch(e: any) { assert.ok(e.status === 409 || (e.getStatus && e.getStatus() === 409) || e.message.includes('Conflict') || e.message.includes('Slug already exists') || (e.response && e.response.statusCode === 409) || e.name === 'ConflictException'); }

  // 10. Concurrency
  try {
    await admin.updatePage(tenantA, schoolA, pageA.id, userA, { expectedVersion: 999 });
    assert.fail("Should reject concurrent stale write");
  } catch(e: any) { assert.ok(e.status === 409 || (e.getStatus && e.getStatus() === 409) || e.message.includes('Conflict') || e.message.includes('Slug already exists') || (e.response && e.response.statusCode === 409) || e.name === 'ConflictException'); }

  // 11. Cross-school isolation (A tries to read B)
  // Actually guaranteed by AuthGuards at controller level, but we check service
  try {
    await admin.updatePage(tenantB, schoolB, pageA.id, userB, { expectedVersion: 1 });
    assert.fail("Should reject cross tenant/school");
  } catch(e: any) { console.log('ERROR:', e); assert.ok(e.status === 404 || (e.getStatus && e.getStatus() === 404) || e.message.includes('not found') || e.message.includes('Not Found') || (e.response && e.response.statusCode === 404) || e.name === 'NotFoundException'); }

  // 12. Unpublish page
  await admin.updatePage(tenantA, schoolA, pageA.id, userA, { status: CmsPublicationStatus.DRAFT, expectedVersion: pubPageA.version });
  try {
    await pub.getPage(tenantA, schoolA, "about");
    assert.fail("Should hide unpublished page");
  } catch(e: any) { console.log('ERROR:', e); assert.ok(e.status === 404 || (e.getStatus && e.getStatus() === 404) || e.message.includes('not found') || e.message.includes('Not Found') || (e.response && e.response.statusCode === 404) || e.name === 'NotFoundException'); }

  console.log("ALL 6F VERIFICATION CHECKS PASSED!");
}

runTest().catch(console.error).finally(() => prisma.$disconnect());