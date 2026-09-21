const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function run() {
  const envFile = fs.readFileSync(path.join(__dirname, '../../.env'), 'utf8');
  let dbUrl = '';
  for (const line of envFile.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.split('=')[1].replace(/"/g, '').trim();
    }
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  try {
    const res = await prisma.$queryRaw`SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '%20260918153043%'`;
    console.log('Migration present:', res.length > 0 ? res[0].migration_name : 'No');
    
    const idxRes = await prisma.$queryRaw`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'idm_user_school_access' AND indexname = 'idm_user_school_access_userId_schoolId_null_campusId_key'`;
    console.log('Index present:', idxRes.length > 0);
    if (idxRes.length > 0) {
      console.log('Index def:', idxRes[0].indexdef);
    }
  } finally {
    await prisma.$disconnect();
  }
}
run().catch(console.error);
