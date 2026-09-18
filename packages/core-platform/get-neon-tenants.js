const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const envPath = path.join(__dirname, '..', '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/^DATABASE_URL="(.*)"$/m);
if (!match) throw new Error('DATABASE_URL not found in root .env');

const dbUrl = match[1];

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
});

async function getTenants() {
  const tenants = await prisma.tenant.findMany({
    include: { schools: true }
  });
  console.log(JSON.stringify(tenants, null, 2));
}

getTenants().catch(console.error).finally(() => prisma.$disconnect());
