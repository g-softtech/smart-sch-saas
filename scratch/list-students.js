const { kernel } = require("../packages/core-platform/dist/index.js");

async function main() {
  const students = await kernel.db.$queryRaw`
    SELECT s.id, s."studentNumber", s."firstName", s."lastName", s."userId", u.email 
    FROM stud_students s
    LEFT JOIN idm_users u ON s."userId" = u.id
    LIMIT 10;
  `;
  console.log("REGISTERED STUDENTS IN YOUR DATABASE:");
  console.log(JSON.stringify(students, null, 2));
}

main().finally(() => kernel.db.$disconnect());
