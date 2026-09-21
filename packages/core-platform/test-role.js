const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.userTenantMembership.findFirst({ include: { role: true } }).then(m => console.log(m)).finally(() => prisma.$disconnect());
