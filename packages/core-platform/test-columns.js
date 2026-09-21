const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name = 'idm_user_school_access'").then(console.log).finally(() => prisma.$disconnect());
