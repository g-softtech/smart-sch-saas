const { kernel } = require("../packages/core-platform/dist/index.js");
const crypto = require("crypto");
const http = require("http");

function base64url(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createToken(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signatureInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${signatureInput}.${signature}`;
}

async function main() {
  console.log("==========================================");
  console.log("PHASE 5A: STUDENT PORTAL LIVE E2E INTEGRATION TEST");
  console.log("==========================================");

  // 1. Setup DB Context
  const tenantId = "097c6dc2-1383-447b-a5eb-97ef631f6cff";
  const schools = await kernel.db.$queryRaw`SELECT * FROM "School" WHERE "tenantId" = ${tenantId};`;
  const schoolId = schools[0]?.id;

  const users = await kernel.db.$queryRaw`SELECT * FROM idm_users;`;
  const userId = users[0]?.id;
  const userEmail = users[0]?.email;

  const students = await kernel.db.$queryRaw`SELECT * FROM stud_students WHERE "tenantId" = ${tenantId};`;
  const targetStudent = students[0];

  if (!targetStudent) {
    console.error("No student found in tenant");
    process.exit(1);
  }

  // Authoritatively link target student to target user for testing
  await kernel.db.$executeRaw`UPDATE stud_students SET "userId" = ${userId} WHERE id = ${targetStudent.id};`;

  const jwtSecret = process.env.JWT_SECRET || "schoolos-jwt-secret-key-super-secure-min32chars!";
  const token = createToken(
    {
      sub: userId,
      email: userEmail,
      tenantId,
      schoolId,
      roles: ["STUDENT"],
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    jwtSecret
  );

  const headers = {
    "Authorization": `Bearer ${token}`,
    "x-tenant-id": tenantId,
    "x-school-id": schoolId,
    "Content-Type": "application/json",
  };

  // Start Nest application server in background process using dist/main.js
  const { fork } = require("child_process");
  const path = require("path");

  console.log("\n1. Booting API Gateway dev/dist server...");
  const apiProcess = fork(path.join(__dirname, "../apps/api-gateway/dist/main.js"), [], {
    env: {
      ...process.env,
      PORT: "3000",
      JWT_SECRET: jwtSecret,
    },
    stdio: "pipe",
  });

  // Wait for server to start responding
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch("http://localhost:3000/api/v1/portal/student/profile", { headers });
      if (res.status === 200 || res.status === 404) {
        serverReady = true;
        break;
      }
    } catch (e) {
      // connecting...
    }
  }

  if (!serverReady) {
    console.error("API server failed to start within timeout");
    apiProcess.kill();
    process.exit(1);
  }

  console.log("✓ API Server is live on http://localhost:3000\n");

  try {
    // 2. Test GET /api/v1/portal/student/profile
    console.log("2. Testing GET /api/v1/portal/student/profile...");
    const profileRes = await fetch("http://localhost:3000/api/v1/portal/student/profile", { headers });
    console.log(`HTTP Status: ${profileRes.status}`);
    if (profileRes.status !== 200) {
      console.error(`Failed: ${await profileRes.text()}`);
      process.exit(1);
    }
    const profileJson = await profileRes.json();
    const profileData = profileJson.data || profileJson;
    console.log(`✓ Profile resolved for student: ${profileData.firstName} ${profileData.lastName} (${profileData.studentNumber})`);

    // 3. Test GET /api/v1/portal/student/dashboard
    console.log("\n3. Testing GET /api/v1/portal/student/dashboard...");
    const dashRes = await fetch("http://localhost:3000/api/v1/portal/student/dashboard", { headers });
    console.log(`HTTP Status: ${dashRes.status}`);
    if (dashRes.status !== 200) {
      console.error(`Failed: ${await dashRes.text()}`);
      process.exit(1);
    }
    const dashJson = await dashRes.json();
    const dashData = dashJson.data || dashJson;
    console.log(`✓ Dashboard loaded: Student=${dashData.student?.name}, ActiveClass=${dashData.activeEnrollment?.class?.name || "N/A"}`);

    // 4. Test GET /api/v1/portal/student/timetable
    console.log("\n4. Testing GET /api/v1/portal/student/timetable...");
    const ttRes = await fetch("http://localhost:3000/api/v1/portal/student/timetable", { headers });
    console.log(`HTTP Status: ${ttRes.status}`);
    if (ttRes.status !== 200) {
      console.error(`Failed: ${await ttRes.text()}`);
      process.exit(1);
    }
    const ttJson = await ttRes.json();
    const ttData = ttJson.data || ttJson;
    console.log(`✓ Timetable returned ${ttData.length} entries`);

    // 5. Test GET /api/v1/portal/student/assignments
    console.log("\n5. Testing GET /api/v1/portal/student/assignments...");
    const assignRes = await fetch("http://localhost:3000/api/v1/portal/student/assignments", { headers });
    console.log(`HTTP Status: ${assignRes.status}`);
    if (assignRes.status !== 200) {
      console.error(`Failed: ${await assignRes.text()}`);
      process.exit(1);
    }
    const assignJson = await assignRes.json();
    const assignData = assignJson.data || assignJson;
    console.log(`✓ Assignments returned ${assignData.length} items`);

    // 6. Test GET /api/v1/portal/student/cbt
    console.log("\n6. Testing GET /api/v1/portal/student/cbt...");
    const cbtRes = await fetch("http://localhost:3000/api/v1/portal/student/cbt", { headers });
    console.log(`HTTP Status: ${cbtRes.status}`);
    if (cbtRes.status !== 200) {
      console.error(`Failed: ${await cbtRes.text()}`);
      process.exit(1);
    }
    const cbtJson = await cbtRes.json();
    const cbtData = cbtJson.data || cbtJson;
    console.log(`✓ CBT Exams returned ${cbtData.length} exams`);

    // 7. Test GET /api/v1/portal/student/results
    console.log("\n7. Testing GET /api/v1/portal/student/results...");
    const resultsRes = await fetch("http://localhost:3000/api/v1/portal/student/results", { headers });
    console.log(`HTTP Status: ${resultsRes.status}`);
    if (resultsRes.status !== 200) {
      console.error(`Failed: ${await resultsRes.text()}`);
      process.exit(1);
    }
    const resultsJson = await resultsRes.json();
    const resultsData = resultsJson.data || resultsJson;
    console.log(`✓ Published results returned ${resultsData.length} records`);

    // 8. Test GET /api/v1/portal/student/id-card
    console.log("\n8. Testing GET /api/v1/portal/student/id-card...");
    const idRes = await fetch("http://localhost:3000/api/v1/portal/student/id-card", { headers });
    console.log(`HTTP Status: ${idRes.status}`);
    if (idRes.status !== 200) {
      console.error(`Failed: ${await idRes.text()}`);
      process.exit(1);
    }
    const idJson = await idRes.json();
    const idData = idJson.data || idJson;
    console.log(`✓ Student Digital ID Card issued: Token Length=${idData.qrCodeData?.length || 0}`);

    // 9. Zero-Trust Security Verification: Cross-Tenant Protection
    console.log("\n9. Testing Zero-Trust Cross-Tenant Rejection...");
    const badTenantHeaders = { ...headers, "x-tenant-id": "00000000-0000-0000-0000-000000000000" };
    const forbiddenRes = await fetch("http://localhost:3000/api/v1/portal/student/profile", { headers: badTenantHeaders });
    console.log(`HTTP Status: ${forbiddenRes.status} (Expected 403 Forbidden)`);
    if (forbiddenRes.status !== 403) {
      console.error(`SECURITY FAILURE: Cross-tenant request returned ${forbiddenRes.status} instead of 403`);
      process.exit(1);
    }
    console.log("✓ Zero-Trust Cross-Tenant Rejection Verified (403 Forbidden)");

    console.log("\n==========================================");
    console.log("ALL PHASE 5A LIVE STUDENT PORTAL ENDPOINTS VERIFIED!");
    console.log("==========================================");
  } finally {
    apiProcess.kill("SIGKILL");
    await kernel.db.$disconnect();
  }
}

main().catch((err) => {
  console.error("Live test failed:", err);
  process.exit(1);
});
