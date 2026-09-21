const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const envFile = fs.readFileSync('.env', 'utf8');
  let dbUrl = '';
  for (const line of envFile.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.split('=')[1].replace(/"/g, '').trim();
    }
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const res = await client.query(`SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '%20260918153043%'`);
    console.log('Migration present:', res.rows.length > 0 ? res.rows[0].migration_name : 'No');
    
    const idxRes = await client.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'idm_user_school_access' AND indexname = 'idm_user_school_access_userId_schoolId_null_campusId_key'`);
    console.log('Index present:', idxRes.rows.length > 0);
    if (idxRes.rows.length > 0) {
      console.log('Index def:', idxRes.rows[0].indexdef);
    }
  } finally {
    await client.end();
  }
}
run().catch(console.error);
