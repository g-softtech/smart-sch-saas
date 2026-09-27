const path = require("path");
const crypto = require("crypto");
const { kernel, tenantContext } = require(path.resolve(__dirname, "../packages/core-platform/dist/index.js"));
const http = require("http");

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-default-key-do-not-use-in-prod";

function signJwt(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const base64UrlHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const base64UrlPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${base64UrlHeader}.${base64UrlPayload}`)
    .digest("base64url");
  return `${base64UrlHeader}.${base64UrlPayload}.${signature}`;
}

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on("error", reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== Phase 5B Parent Portal Verification ===");

  const tenantId = `tenant-p5b-${Date.now()}`;
  const tenantBId = `tenant-p5b-b-${Date.now()}`;

  let user, guardian, student, unlinkedStudent, invoice, school;

  await kernel.db.tenant.create({
    data: { id: tenantId, name: "Test Tenant A", slug: `tenant-a-${Date.now()}` },
  });
  await kernel.db.tenant.create({
    data: { id: tenantBId, name: "Test Tenant B", slug: `tenant-b-${Date.now()}` },
  });

  await tenantContext.run({ tenantId }, async () => {
    // Create test user for guardian
    user = await kernel.db.user.create({
      data: {
        email: `guardian-${Date.now()}@example.com`,
        passwordHash: "hash",
      },
    });

    // Create test role
    const role = await kernel.db.role.create({
      data: {
        tenantId,
        name: "GUARDIAN",
      },
    });

    // Create tenant membership for user
    await kernel.db.userTenantMembership.create({
      data: {
        tenantId,
        userId: user.id,
        roleId: role.id,
        state: "ACTIVE",
      },
    });

    // Create test school
    school = await kernel.db.school.create({
      data: {
        name: "Guardian Test Academy",
      },
    });

    // Create test guardian linked to user
    guardian = await kernel.db.guardian.create({
      data: {
        tenantId,
        userId: user.id,
        firstName: "Jane",
        lastName: "Doe",
        email: user.email,
        phone: "+2348000005555",
        address: "123 Guardian Way",
        occupation: "Engineer",
      },
    });

    // Create test student
    student = await kernel.db.student.create({
      data: {
        tenantId,
        schoolId: school.id,
        studentNumber: `STD-5B-${Date.now()}`,
        firstName: "Tommy",
        lastName: "Doe",
        gender: "MALE",
        admissionDate: new Date(),
      },
    });

    // Link student to guardian via StudentGuardian
    await kernel.db.studentGuardian.create({
      data: {
        tenantId,
        studentId: student.id,
        guardianId: guardian.id,
        relationship: "MOTHER",
        isPrimary: true,
        isEmergencyContact: true,
      },
    });

    // Create unlinked student for authorization testing
    unlinkedStudent = await kernel.db.student.create({
      data: {
        tenantId,
        schoolId: school.id,
        studentNumber: `STD-OTHER-${Date.now()}`,
        firstName: "Stranger",
        lastName: "Danger",
        gender: "FEMALE",
        admissionDate: new Date(),
      },
    });

    // Create test academic year, term, and financial period
    const academicYear = await kernel.db.academicYear.create({
      data: {
        tenantId,
        schoolId: school.id,
        name: "2026/2027",
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 365),
      },
    });

    const term = await kernel.db.term.create({
      data: {
        tenantId,
        academicYearId: academicYear.id,
        name: "First Term",
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 90),
      },
    });

    const financialPeriod = await kernel.db.financialPeriod.create({
      data: {
        tenantId,
        schoolId: school.id,
        name: "Q1 2026",
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 90),
        status: "OPEN",
      },
    });

    // Create test class & enrollment
    const classObj = await kernel.db.class.create({
      data: {
        tenantId,
        schoolId: school.id,
        name: "Primary 1",
      },
    });

    await kernel.db.enrollment.create({
      data: {
        tenantId,
        schoolId: school.id,
        studentId: student.id,
        academicYearId: academicYear.id,
        classId: classObj.id,
        status: "ACTIVE",
      },
    });

    // Create invoice for student
    invoice = await kernel.db.invoice.create({
      data: {
        tenantId,
        schoolId: school.id,
        studentId: student.id,
        academicYearId: academicYear.id,
        termId: term.id,
        financialPeriodId: financialPeriod.id,
        invoiceNumber: `INV-5B-${Date.now()}`,
        totalAmount: 50000,
        paidAmount: 0,
        status: "ISSUED",
        dueDate: new Date(Date.now() + 86400000 * 30),
      },
    });
  });

  console.log("✅ Fixtures created:");
  console.log(`  User ID: ${user.id}`);
  console.log(`  Guardian ID: ${guardian.id}`);
  console.log(`  Student ID: ${student.id}`);
  console.log(`  Unlinked Student ID: ${unlinkedStudent.id}`);
  console.log(`  Invoice ID: ${invoice.id}`);

  // Generate JWT for authenticating requests
  const validToken = signJwt(
    { sub: user.id, tenantId, userType: "GUARDIAN", email: user.email },
    JWT_SECRET
  );

  const crossTenantToken = signJwt(
    { sub: user.id, tenantId: tenantBId, userType: "GUARDIAN", email: user.email },
    JWT_SECRET
  );

  const reqHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${validToken}`,
    "x-tenant-id": tenantId,
  };

  // Run live endpoint tests against localhost:3000
  console.log("\n--- Executing Endpoint Tests ---");

  // 1. GET /portal/parent/profile
  const profileRes = await makeRequest({
    hostname: "127.0.0.1",
    port: 3000,
    path: "/api/v1/portal/parent/profile",
    method: "GET",
    headers: reqHeaders,
  });
  console.log(`1. GET /portal/parent/profile: Status ${profileRes.status}`);
  if (profileRes.status !== 200 || profileRes.body.phone !== "+2348000005555") {
    throw new Error(`Profile endpoint failed: ${JSON.stringify(profileRes.body)}`);
  }
  console.log("   ✅ Profile returned authoritative Guardian details!");

  // 2. GET /portal/parent/dashboard
  const dashRes = await makeRequest({
    hostname: "127.0.0.1",
    port: 3000,
    path: "/api/v1/portal/parent/dashboard",
    method: "GET",
    headers: reqHeaders,
  });
  console.log(`2. GET /portal/parent/dashboard: Status ${dashRes.status}`);
  if (dashRes.status !== 200 || dashRes.body.children.length !== 1) {
    throw new Error(`Dashboard endpoint failed: ${JSON.stringify(dashRes.body)}`);
  }
  console.log("   ✅ Dashboard returned linked children & pending invoices!");

  // 3. GET /portal/parent/children
  const childrenRes = await makeRequest({
    hostname: "127.0.0.1",
    port: 3000,
    path: "/api/v1/portal/parent/children",
    method: "GET",
    headers: reqHeaders,
  });
  console.log(`3. GET /portal/parent/children: Status ${childrenRes.status}`);
  if (childrenRes.status !== 200 || childrenRes.body[0].firstName !== "Tommy") {
    throw new Error(`Children endpoint failed: ${JSON.stringify(childrenRes.body)}`);
  }
  console.log("   ✅ Children endpoint returned exclusively linked child!");

  // 4. GET /portal/parent/children/:childId/results (Linked child)
  const resultsRes = await makeRequest({
    hostname: "127.0.0.1",
    port: 3000,
    path: `/api/v1/portal/parent/children/${student.id}/results`,
    method: "GET",
    headers: reqHeaders,
  });
  console.log(`4. GET /portal/parent/children/:childId/results (Linked): Status ${resultsRes.status}`);
  if (resultsRes.status !== 200) {
    throw new Error(`Results endpoint failed: ${JSON.stringify(resultsRes.body)}`);
  }
  console.log("   ✅ Results fetched successfully for authorized child!");

  // 5. GET /portal/parent/children/:childId/results (Unlinked child -> Expect 403)
  const forbiddenResultsRes = await makeRequest({
    hostname: "127.0.0.1",
    port: 3000,
    path: `/api/v1/portal/parent/children/${unlinkedStudent.id}/results`,
    method: "GET",
    headers: reqHeaders,
  });
  console.log(`5. GET /portal/parent/children/:childId/results (Unlinked): Status ${forbiddenResultsRes.status}`);
  if (forbiddenResultsRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for unlinked child, got ${forbiddenResultsRes.status}`);
  }
  console.log("   ✅ Server-side child authorization correctly blocked unlinked child access (403 Forbidden)!");

  // 6. POST /portal/parent/children/:childId/movement/authorizations
  const pickupRes = await makeRequest(
    {
      hostname: "127.0.0.1",
      port: 3000,
      path: `/api/v1/portal/parent/children/${student.id}/movement/authorizations`,
      method: "POST",
      headers: reqHeaders,
    },
    {
      authorizedPersonName: "Uncle Bob",
      relationship: "UNCLE",
      phone: "+2348099998888",
      notes: "Pick up after soccer practice",
    }
  );
  console.log(`6. POST /portal/parent/children/:childId/movement/authorizations: Status ${pickupRes.status}`);
  if (pickupRes.status !== 201 || !pickupRes.body.notes || !pickupRes.body.notes.includes("Uncle Bob")) {
    throw new Error(`Pickup authorization endpoint failed: ${JSON.stringify(pickupRes.body)}`);
  }
  console.log("   ✅ Created pickup authorization via authoritative Movement model!");

  // 7. GET /portal/parent/invoices
  const invoicesRes = await makeRequest({
    hostname: "127.0.0.1",
    port: 3000,
    path: "/api/v1/portal/parent/invoices",
    method: "GET",
    headers: reqHeaders,
  });
  console.log(`7. GET /portal/parent/invoices: Status ${invoicesRes.status}`);
  if (invoicesRes.status !== 200 || invoicesRes.body.length !== 1) {
    throw new Error(`Invoices endpoint failed: ${JSON.stringify(invoicesRes.body)}`);
  }
  console.log("   ✅ Invoices endpoint returned linked child invoice!");

  // 8. POST /portal/parent/invoices/:invoiceId/pay
  const payRes = await makeRequest(
    {
      hostname: "127.0.0.1",
      port: 3000,
      path: `/api/v1/portal/parent/invoices/${invoice.id}/pay`,
      method: "POST",
      headers: reqHeaders,
    },
    {
      amount: 20000,
      paymentMethod: "CARD",
      reference: `PAY-5B-REF-${Date.now()}`,
    }
  );
  console.log(`8. POST /portal/parent/invoices/:invoiceId/pay: Status ${payRes.status}`);
  if (payRes.status !== 201 || payRes.body.status !== "SUCCESS") {
    throw new Error(`Payment endpoint failed: ${JSON.stringify(payRes.body)}`);
  }
  console.log("   ✅ Payment created and ledger invoice status updated through payment architecture!");

  // Verify Invoice in DB
  await tenantContext.run({ tenantId }, async () => {
    const updatedInvoice = await kernel.db.invoice.findUnique({
      where: { id: invoice.id },
    });
    console.log(`   Updated Invoice Status: ${updatedInvoice.status}, Paid Amount: ${updatedInvoice.paidAmount}`);
    if (updatedInvoice.status !== "PARTIAL" || Number(updatedInvoice.paidAmount) !== 20000) {
      throw new Error(`Invoice status update incorrect: ${JSON.stringify(updatedInvoice)}`);
    }
    console.log("   ✅ Database invoice state matches payment transaction!");
  });

  // 9. Cross-Tenant Protection (Request with tenantB header/token)
  const crossTenantRes = await makeRequest({
    hostname: "127.0.0.1",
    port: 3000,
    path: "/api/v1/portal/parent/profile",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${crossTenantToken}`,
      "x-tenant-id": tenantBId,
    },
  });
  console.log(`9. Cross-Tenant GET /portal/parent/profile: Status ${crossTenantRes.status}`);
  if (crossTenantRes.status !== 403 && crossTenantRes.status !== 404) {
    throw new Error(`Expected 403 Forbidden or 404 Not Found for cross-tenant request, got ${crossTenantRes.status}`);
  }
  console.log(`   ✅ Cross-tenant access successfully isolated (${crossTenantRes.status})!`);

  console.log("\n🎉 ALL PHASE 5B VERIFICATION TESTS PASSED SUCCESSFULLY!");

  // Cleanup fixtures
  await tenantContext.run({ tenantId }, async () => {
    await kernel.db.paymentAllocation.deleteMany({ where: { invoiceId: invoice.id } });
    await kernel.db.payment.deleteMany({ where: { studentId: student.id } });
    await kernel.db.invoiceLineItem.deleteMany({ where: { invoiceId: invoice.id } });
    await kernel.db.invoice.deleteMany({ where: { id: invoice.id } });
    await kernel.db.pickupAuthorization.deleteMany({ where: { studentId: student.id } });
    await kernel.db.studentGuardian.deleteMany({ where: { guardianId: guardian.id } });
    await kernel.db.enrollment.deleteMany({ where: { studentId: { in: [student.id, unlinkedStudent.id] } } });
    await kernel.db.student.deleteMany({ where: { id: { in: [student.id, unlinkedStudent.id] } } });
    await kernel.db.guardian.deleteMany({ where: { id: guardian.id } });
    await kernel.db.school.deleteMany({ where: { id: school.id } });
    await kernel.db.userTenantMembership.deleteMany({ where: { userId: user.id } });
    await kernel.db.user.deleteMany({ where: { id: user.id } });
  });
  await kernel.db.tenant.deleteMany({ where: { id: { in: [tenantId, tenantBId] } } });
  console.log("🧹 Test fixtures cleaned up.");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test run failed:", err);
  process.exit(1);
});
