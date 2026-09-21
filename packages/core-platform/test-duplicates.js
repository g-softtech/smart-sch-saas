const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$queryRawUnsafe('SELECT "userId", "schoolId", COUNT(*) FROM idm_user_school_access WHERE "campusId" IS NULL GROUP BY "userId", "schoolId" HAVING COUNT(*) > 1').then(console.log).finally(() => prisma.$disconnect());
