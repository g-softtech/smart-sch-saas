const { PrismaClient } = require('./dist/index.js');
// Wait, core-platform exports the prisma client instance as `kernel.db`? 
// Let's just use @prisma/client directly.
const { PrismaClient: PC } = require('@prisma/client');
const prisma = new PC();

async function main() {
  const campuses = await prisma.campus.findMany();
  console.log('Campuses:', campuses);
  
  const schools = await prisma.school.findMany();
  console.log('Schools:', schools);
}

main().finally(() => prisma.$disconnect());
