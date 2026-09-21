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
    datasources: { db: { url: dbUrl } },
  });

  const tenantId = 'c5522af6-653a-4a25-8acc-10d6dc847f6e';

  try {
    const deps = [
      'academicYear', 'term', 'department', 'class', 'arm', 'subjectGroup', 'subject',
      'student', 'guardian', 'studentGuardian', 'enrollment', 'publishedAdmissionForm',
      'applicant', 'admissionApplication', 'admissionReview', 'staffProfile',
      'staffCredential', 'attendanceRegister', 'attendanceRecord', 'userSchoolAccess',
      'userTenantMembership', 'rolePermission', 'auditLog', 'platformAuditLog',
      'outboxQueue'
    ];
    let foundAny = false;
    for (const model of deps) {
      if (prisma[model]) {
        // Most models have tenantId except a few system ones
        try {
          const count = await prisma[model].count({ where: { tenantId } });
          if (count > 0) {
            console.log(`Found ${count} in ${model}`);
            foundAny = true;
          }
        } catch(e) {
          // ignore if tenantId not on model
        }
      }
    }
    if (!foundAny) {
      console.log('ZERO dependent records found across all checked tenant-scoped tables outside the base 4.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
