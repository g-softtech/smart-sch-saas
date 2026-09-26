const { kernel } = require("../packages/core-platform/dist/index.js");
const crypto = require("crypto");

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
  const tenantId = "097c6dc2-1383-447b-a5eb-97ef631f6cff";
  const users = await kernel.db.$queryRaw`SELECT * FROM idm_users;`;
  const userId = users[0]?.id;

  const roles = await kernel.db.$queryRaw`SELECT * FROM idm_roles WHERE "tenantId" = ${tenantId};`;
  let roleId = roles.find(r => r.name === 'SUPER_ADMIN')?.id || roles[0]?.id;

  if (!roleId) {
    const newRoleId = crypto.randomUUID();
    await kernel.db.$executeRaw`
      INSERT INTO idm_roles ("id", "tenantId", "name", "createdAt", "updatedAt")
      VALUES (${newRoleId}, ${tenantId}, 'SUPER_ADMIN', NOW(), NOW());
    `;
    roleId = newRoleId;
  }

  // Ensure membership exists
  const existingMembership = await kernel.db.$queryRaw`
    SELECT * FROM idm_tenant_memberships WHERE "tenantId" = ${tenantId} AND "userId" = ${userId};
  `;

  if (existingMembership.length === 0) {
    const memId = crypto.randomUUID();
    await kernel.db.$executeRaw`
      INSERT INTO idm_tenant_memberships ("id", "tenantId", "userId", "roleId", "createdAt", "updatedAt")
      VALUES (${memId}, ${tenantId}, ${userId}, ${roleId}, NOW(), NOW());
    `;
  }

  const school = await kernel.db.$queryRaw`SELECT * FROM "School" WHERE "tenantId" = ${tenantId};`;
  const schoolId = school[0]?.id;

  const classObj = await kernel.db.$queryRaw`SELECT * FROM acd_classes WHERE "tenantId" = ${tenantId} AND name LIKE '%Grade 1B%';`;
  const classId = classObj[0]?.id;

  console.log(`TenantID: ${tenantId} | SchoolID: ${schoolId} | ClassID: ${classId} | UserID: ${userId}`);

  const user = await kernel.db.user.findUnique({ where: { id: userId } });

  const secret = process.env.JWT_SECRET || "super-secret-secret";
  const token = createToken(
    {
      sub: user.id,
      email: user.email,
      roles: ["SUPER_ADMIN"],
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    secret
  );

  const datesToTest = [
    { date: "2026-09-24", expected: 0 },
    { date: "2026-09-25", expected: 1 },
    { date: "2026-09-26", expected: 4 },
  ];

  console.log("==========================================");
  console.log("LIVE API GATEWAY HTTP ELIGIBILITY TEST");
  console.log("==========================================");

  for (const { date, expected } of datesToTest) {
    const url = `http://localhost:3000/api/v1/attendance/eligible-students?classId=${classId}&date=${date}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-tenant-id": tenantId,
        "x-school-id": schoolId,
      },
    });

    if (!res.ok) {
      console.error(`HTTP error ${res.status}: ${await res.text()}`);
      process.exit(1);
    }

    const data = await res.json();
    console.log(`\nDate: ${date} | HTTP Status: ${res.status} | Returned Roster Count: ${data.length}`);
    console.log("Students returned:");
    data.forEach((s, idx) => {
      console.log(`  ${idx + 1}. ID: ${s.studentId} | Name: ${s.firstName} ${s.lastName}`);
    });

    if (data.length !== expected) {
      console.error(`FAILED: Expected ${expected} students for date ${date}, but got ${data.length}`);
      process.exit(1);
    } else {
      console.log(`SUCCESS: Expected ${expected} students and got exactly ${data.length}`);
    }
  }

  console.log("\n==========================================");
  console.log("ALL LIVE HTTP VERIFICATIONS PASSED!");
  console.log("==========================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await kernel.db.$disconnect();
  });
