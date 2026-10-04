import { PrismaClient, CmsPublicationStatus } from '../index';
import { CmsAdminService } from '../../../../apps/api-gateway/src/modules/cms/services/cms-admin.service';

class DummyAudit {
  log() {}
  logEvent() {}
  logAction() {}
}

async function fetchUrl(url: string, options: any = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  return { status: res.status, data: text };
}

async function runTest() {
  console.log('Starting RUNTIME CMS E2E verification...');
  const prisma = new PrismaClient();
  const adminService = new CmsAdminService(new DummyAudit() as any);

  const id = Date.now();
  const tenant = await prisma.tenant.create({ data: { name: 'CMS Runtime Tenant', slug: 'cms-runtime-tenant-' + id, status: 'ACTIVE' } });
  const tenant2 = await prisma.tenant.create({ data: { name: 'Malicious Tenant', slug: 'malicious-runtime-tenant-' + id, status: 'ACTIVE' } });
  const inactiveTenant = await prisma.tenant.create({ data: { name: 'Inactive', slug: 'inactive-tenant-' + id, status: 'INACTIVE' } });
  
  const school = await prisma.school.create({ data: { name: 'CMS School', tenantId: tenant.id, publicSlug: 'runtime-school-' + id } });
  const school2 = await prisma.school.create({ data: { name: 'Other School', tenantId: tenant2.id, publicSlug: 'other-runtime-school-' + id } });
  const inactiveSchool = await prisma.school.create({ data: { name: 'Inactive School', tenantId: inactiveTenant.id, publicSlug: 'inactive-runtime-' + id } });
  
  const user = await prisma.user.create({ data: { email: 'admin-rt' + id + '@school.com', globalRole: 'SUPER_ADMIN' } });

  const ay = await prisma.academicYear.create({ data: { tenantId: tenant.id, schoolId: school.id, name: `2026-RT-${id}`, startDate: new Date(), endDate: new Date() }});
  const cl = await prisma.class.create({ data: { tenantId: tenant.id, schoolId: school.id, name: `JSS1-RT-${id}` }});
  
  const admForm = await prisma.publishedAdmissionForm.create({
    data: {
      tenantId: tenant.id, schoolId: school.id, academicYearId: ay.id, targetClassId: cl.id,
      title: "Admissions 2026 RT", publicToken: `token-rt-${id}`, fieldsSchema: {}, workflowStages: {}, isActive: true
    }
  });

  const results: any = {};

  try {
    const config = await adminService.getSiteConfig(tenant.id, school.id, user.id);
    await adminService.updateSiteConfig(tenant.id, school.id, user.id, {
      status: CmsPublicationStatus.PUBLISHED, expectedVersion: config.version, enableAdmissionsCta: true, themePayload: { primaryColor: '#AABBCC', secondaryColor: '#039771' }
    });

    const customPage = await adminService.createPage(tenant.id, school.id, user.id, {
      slug: 'custom', title: 'Custom Page', content: '<p>Safe Content</p>'
    });
    await adminService.updatePage(tenant.id, school.id, customPage.id, user.id, { status: CmsPublicationStatus.PUBLISHED, expectedVersion: customPage.version });

    let xssBlocked = false;
    try {
      await adminService.updatePage(tenant.id, school.id, customPage.id, user.id, { status: CmsPublicationStatus.PUBLISHED, expectedVersion: customPage.version + 1, content: '<p>Safe</p><script>alert(9999)</script>' });
    } catch(e: any) {
      if (e.status === 400 || e.message?.includes('Unsafe')) {
         xssBlocked = true;
      }
    }
    
    const draftPage = await adminService.createPage(tenant.id, school.id, user.id, {
      slug: 'draft', title: 'Draft Page', content: 'Draft Content'
    });
    
    const arcPage = await adminService.createPage(tenant.id, school.id, user.id, {
      slug: 'archived', title: 'Archived Page', content: 'Archived Content'
    });
    await adminService.updatePage(tenant.id, school.id, arcPage.id, user.id, { status: CmsPublicationStatus.ARCHIVED, expectedVersion: arcPage.version });

    const ann = await adminService.createAnnouncement(tenant.id, school.id, user.id, {
      title: 'Important runtime news', content: 'News body'
    });
    await adminService.updateAnnouncement(tenant.id, school.id, ann.id, user.id, { status: CmsPublicationStatus.PUBLISHED, expectedVersion: ann.version });

    const media2 = await prisma.cmsMedia.create({
      data: { tenantId: tenant2.id, schoolId: school2.id, mimeType: 'image/jpeg', data: Buffer.from('x'), authorId: user.id }
    });
    const media1 = await prisma.cmsMedia.create({
      data: { tenantId: tenant.id, schoolId: school.id, mimeType: 'image/jpeg', data: Buffer.from('y'), authorId: user.id }
    });

    console.log('Seeded actual CMS data, running HTTP tests...');
    const baseUrl = `http://localhost:3000/${school.publicSlug}`;

    const rHome = await fetchUrl(baseUrl);
    results["Public homepage 200"] = (rHome.status === 200) ? "PASS" : "FAIL";
    results["Homepage contains content"] = rHome.data.includes(school.name) ? "PASS" : "FAIL";
    results["Announcements rendered"] = rHome.data.includes("Important runtime news") ? "PASS" : "FAIL";
    results["Theme persistence/rendering"] = (rHome.data.includes("--cms-primary: #AABBCC") && rHome.data.includes("--cms-secondary: #039771")) ? "PASS" : "FAIL";
    results["Admissions CTA (publicToken)"] = rHome.data.includes(`/admissions/${admForm.publicToken}`) && !rHome.data.includes(school.id) ? "PASS" : "FAIL";

    const rCustom = await fetchUrl(`${baseUrl}/custom`);
    results["Custom page 200"] = (rCustom.status === 200 && rCustom.data.includes("Safe Content")) ? "PASS" : "FAIL";
    results["XSS rendered-site test"] = xssBlocked ? "PASS (API Blocked 400)" : (!rCustom.data.includes("alert(9999)") ? "PASS (Sanitized)" : "FAIL");

    const rDraft = await fetchUrl(`${baseUrl}/draft`);
    results["Draft hidden"] = (rDraft.status === 404) ? "PASS" : "FAIL";

    const rArc = await fetchUrl(`${baseUrl}/archived`);
    results["Archived hidden"] = (rArc.status === 404) ? "PASS" : "FAIL";

    const rUnknown = await fetchUrl(`${baseUrl}/unknownxyz`);
    results["Unknown page"] = (rUnknown.status === 404) ? "PASS" : "FAIL";

    const rInactive = await fetchUrl(`http://localhost:3000/${inactiveSchool.publicSlug}`);
    results["Inactive school hidden"] = (rInactive.status === 404) ? "PASS" : "FAIL";

    const rUnpub = await fetchUrl(`http://localhost:3000/${school2.publicSlug}`);
    results["Unpublished site hidden"] = (rUnpub.status === 404) ? "PASS" : "FAIL";

    const s2p = await prisma.cmsPage.create({ data: { tenantId: tenant2.id, schoolId: school2.id, slug: 's2-page', title: 'S2 Page', content: 'S2', status: 'PUBLISHED', authorId: user.id }});
    const rCrossTest = await fetchUrl(`${baseUrl}/s2-page`);
    results["Cross-school content isolation"] = (rCrossTest.status === 404) ? "PASS" : "FAIL";

    const rMedia = await fetchUrl(`http://localhost:3001/api/v1/media/${media1.id}`); 
    results["Media via gateway HTTP"] = (rMedia.status === 401 || rMedia.status === 403 || rMedia.status === 404) ? "PASS" : "FAIL"; 

    results["Navigation output"] = rHome.data.includes("<nav") ? "PASS" : "FAIL";
    
    console.table(results);

  } catch(err) {
    console.error(err);
    process.exit(1);
  } finally {
    console.log("Cleaning up test data...");
    await prisma.cmsMedia.deleteMany({ where: { schoolId: { in: [school.id, school2.id, inactiveSchool.id] } } });
    await prisma.cmsPage.deleteMany({ where: { schoolId: { in: [school.id, school2.id, inactiveSchool.id] } } });
    await prisma.cmsAnnouncement.deleteMany({ where: { schoolId: { in: [school.id, school2.id, inactiveSchool.id] } } });
    await prisma.cmsSiteConfig.deleteMany({ where: { schoolId: { in: [school.id, school2.id, inactiveSchool.id] } } });
    await prisma.publishedAdmissionForm.deleteMany({ where: { schoolId: { in: [school.id, school2.id, inactiveSchool.id] } } });
    await prisma.class.deleteMany({ where: { schoolId: { in: [school.id, school2.id, inactiveSchool.id] } } });
    await prisma.academicYear.deleteMany({ where: { schoolId: { in: [school.id, school2.id, inactiveSchool.id] } } });
    await prisma.school.deleteMany({ where: { id: { in: [school.id, school2.id, inactiveSchool.id] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenant.id, tenant2.id, inactiveTenant.id] } } });
    await prisma.user.deleteMany({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}

runTest();
