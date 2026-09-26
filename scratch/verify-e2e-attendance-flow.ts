import { kernel } from "../packages/core-platform/src/index";
import jwt from "jsonwebtoken";

async function main() {
  const tenantId = "097c6dc2-1383-447b-a5eb-97ef631f6cff";
  const schoolId = "bed1c50b-7cf0-4941-82c0-5afcf3b21bd7";
  const classId = "e68e25c3-bc63-41be-b61b-677ee8b5e4f7"; // Grade 1B

  // Find admin user for JWT
  const user = await kernel.db.user.findFirst({
    where: { tenantId },
  });

  if (!user) throw new Error("No user found");

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles: ["SUPER_ADMIN"],
    },
    process.env.JWT_SECRET || "super-secret-secret",
    { expiresIn: "1h" }
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
    data.forEach((s: any, idx: number) => {
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
