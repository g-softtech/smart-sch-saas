const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const forms = await prisma.$queryRaw`SELECT * FROM "adm_published_forms"`;
  console.log('Forms count:', forms.length);
  if (forms.length > 0) {
    console.log('First token:', forms[0].publicToken);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
