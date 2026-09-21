const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$queryRawUnsafe("SELECT indexdef FROM pg_indexes WHERE tablename = 'idm_user_school_access'").then(console.log).finally(() => prisma.$disconnect());
