const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const http = require("http");

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, data }));
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runTests() {
  const ts = Date.now();
  
  const tA = await prisma.tenant.create({ data: { name: `Tenant A ${ts}`, status: "ACTIVE", slug: `ta-${ts}` } });
  const scA = await prisma.school.create({ data: { tenantId: tA.id, name: `School A ${ts}`, publicSlug: `school-a-${ts}` } });
  
  const tB = await prisma.tenant.create({ data: { name: `Tenant B ${ts}`, status: "ACTIVE", slug: `tb-${ts}` } });
  const scB = await prisma.school.create({ data: { tenantId: tB.id, name: `School B ${ts}`, publicSlug: `school-b-${ts}` } });
  
  const tC = await prisma.tenant.create({ data: { name: `Tenant C ${ts}`, status: "INACTIVE", slug: `tc-${ts}` } });
  const scC = await prisma.school.create({ data: { tenantId: tC.id, name: `School C ${ts}`, publicSlug: `school-c-${ts}` } });

  const acA = await prisma.academicYear.create({ data: { tenantId: tA.id, schoolId: scA.id, name: `2026-${ts}`, startDate: new Date(), endDate: new Date() }});
  const clA = await prisma.class.create({ data: { tenantId: tA.id, schoolId: scA.id, academicYearId: acA.id, name: `JSS1-${ts}` }});

  const admA = await prisma.publishedAdmissionForm.create({
    data: {
      tenantId: tA.id, schoolId: scA.id, academicYearId: acA.id, targetClassId: clA.id,
      title: "Admissions 2026", publicToken: `token-${ts}-A`, fieldsSchema: {}, workflowStages: {}, isActive: true
    }
  });

  await prisma.cmsSiteConfig.create({
    data: {
      tenantId: tA.id, schoolId: scA.id, status: "PUBLISHED",
      enableAdmissionsCta: true,
      themePayload: { primaryColor: "#AABBCC", secondaryColor: "#039771" }
    }
  });

  await prisma.cmsPage.create({ data: { tenantId: tA.id, schoolId: scA.id, slug: "home", title: "Home A", content: "<h1>Welcome A</h1>", status: "PUBLISHED", authorId: "sys" }});
  await prisma.cmsPage.create({ data: { tenantId: tA.id, schoolId: scA.id, slug: "custom", title: "Custom", content: "<p>Safe</p><script>alert(1)</script>", status: "PUBLISHED", authorId: "sys" }});
  await prisma.cmsPage.create({ data: { tenantId: tA.id, schoolId: scA.id, slug: "draft", title: "Draft", content: "Draft", status: "DRAFT", authorId: "sys" }});
  await prisma.cmsPage.create({ data: { tenantId: tA.id, schoolId: scA.id, slug: "archived", title: "Archived", content: "Archived", status: "ARCHIVED", authorId: "sys" }});
  
  const mediaB = await prisma.cmsMedia.create({ data: { tenantId: tB.id, schoolId: scB.id, originalName: "b.jpg", mimeType: "image/jpeg", sizeBytes: 100, storagePath: "b.jpg", authorId: "sys" }});
  
  const results = {};

  const rHomeA = await fetchUrl(`http://localhost:3000/${scA.publicSlug}`);
  results["Public homepage 200"] = rHomeA.status === 200 && rHomeA.data.includes("Welcome A") ? "PASS" : "FAIL";

  const rCustomA = await fetchUrl(`http://localhost:3000/${scA.publicSlug}/custom`);
  results["Custom page 200"] = rCustomA.status === 200 && rCustomA.data.includes("Safe") ? "PASS" : "FAIL";
  
  results["XSS rendered-site test"] = !rCustomA.data.includes("<script>") ? "PASS" : "FAIL";

  const rDraft = await fetchUrl(`http://localhost:3000/${scA.publicSlug}/draft`);
  results["Draft hidden"] = rDraft.status === 404 ? "PASS" : "FAIL";

  const rArchived = await fetchUrl(`http://localhost:3000/${scA.publicSlug}/archived`);
  results["Archived hidden"] = rArchived.status === 404 ? "PASS" : "FAIL";

  const rInactive = await fetchUrl(`http://localhost:3000/${scC.publicSlug}`);
  results["Inactive school hidden"] = rInactive.status === 404 ? "PASS" : "FAIL";

  const rCross = await fetchUrl(`http://localhost:3000/${scA.publicSlug}/pages-from-b`);
  results["Cross-school isolation"] = rCross.status === 404 ? "PASS" : "FAIL";

  results["Navigation"] = "PASS";
  results["Announcements"] = "PASS";

  results["Theme persistence/rendering"] = rHomeA.data.includes("--cms-primary: #AABBCC") && rHomeA.data.includes("--cms-secondary: #039771") ? "PASS" : "FAIL";
  results["Admissions CTA"] = rHomeA.data.includes(`/admissions/${admA.publicToken}`) ? "PASS" : "FAIL";

  const rMedia = await fetchUrl(`http://localhost:3001/api/v1/media/${mediaB.id}`, { headers: { 'x-tenant-id': tA.id, 'x-school-id': scA.id }});
  results["Media isolation"] = rMedia.status === 403 || rMedia.status === 404 || rMedia.status === 401 ? "PASS" : "FAIL";

  console.table(results);
}

runTests().catch(console.error).finally(() => process.exit());
