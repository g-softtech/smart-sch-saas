const { PrismaClient } = require('../../packages/core-platform/node_modules/@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$1tg4oBs4aMH3WBGhA/sm+Q$IdRIkgjhDfYcv/LeplzcVimTqMKfjpE4akyz0OabMug';
const TEST_PASSWORD = 'TestPassword123!';

async function run() {
  const envFile = fs.readFileSync(path.join(__dirname, '../../.env'), 'utf8');
  let dbUrl = '';
  for (const line of envFile.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.split('=')[1].replace(/"/g, '').trim();
    }
  }

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  const tenantId = crypto.randomUUID();
  const otherTenantId = crypto.randomUUID();
  const school1Id = crypto.randomUUID();
  const school2Id = crypto.randomUUID();
  const campus1Id = crypto.randomUUID();
  const campus2Id = crypto.randomUUID();
  const fullSchoolUserId = crypto.randomUUID();
  const campusRestrictedUserId = crypto.randomUUID();

  const fullSchoolEmail = `manual-full-${fullSchoolUserId.substring(0,8)}@test.com`;
  const campusRestrictedEmail = `manual-campus-${campusRestrictedUserId.substring(0,8)}@test.com`;

  console.log('Setting up manual test environment in production database...');

  await prisma.tenant.create({ data: { id: tenantId, name: 'Manual Auth Test', slug: 'manual-auth-' + tenantId } });
  await prisma.tenant.create({ data: { id: otherTenantId, name: 'Manual Auth Test Other', slug: 'manual-other-' + otherTenantId } });

  await prisma.school.createMany({
    data: [
      { id: school1Id, tenantId, name: 'Assigned School (School 1)' },
      { id: school2Id, tenantId, name: 'Unassigned School (School 2)' },
    ],
  });

  await prisma.campus.createMany({
    data: [
      { id: campus1Id, schoolId: school1Id, tenantId, name: 'Assigned Campus (Campus 1)' },
      { id: campus2Id, schoolId: school1Id, tenantId, name: 'Unassigned Campus (Campus 2)' },
    ],
  });

  const userRole = await prisma.role.create({ data: { tenantId, name: 'USER' } });

  await prisma.user.createMany({
    data: [
      { id: fullSchoolUserId, email: fullSchoolEmail, passwordHash: PASSWORD_HASH },
      { id: campusRestrictedUserId, email: campusRestrictedEmail, passwordHash: PASSWORD_HASH },
    ],
  });

  await prisma.userTenantMembership.createMany({
    data: [
      { userId: fullSchoolUserId, tenantId, roleId: userRole.id, state: 'ACTIVE' },
      { userId: campusRestrictedUserId, tenantId, roleId: userRole.id, state: 'ACTIVE' },
    ],
  });

  await prisma.userSchoolAccess.createMany({
    data: [
      { userId: fullSchoolUserId, tenantId, schoolId: school1Id, campusId: null },
      { userId: campusRestrictedUserId, tenantId, schoolId: school1Id, campusId: campus1Id },
    ],
  });

  console.log('\n=================================================================');
  console.log('✅ TEST ENVIRONMENT READY');
  console.log('=================================================================\n');

  console.log('=== TEST IDS ===');
  console.log(`Primary Tenant ID:       ${tenantId}`);
  console.log(`Secondary Tenant ID:     ${otherTenantId}`);
  console.log(`Assigned School ID:      ${school1Id}`);
  console.log(`Unassigned School ID:    ${school2Id}`);
  console.log(`Assigned Campus ID:      ${campus1Id}`);
  console.log(`Unassigned Campus ID:    ${campus2Id}`);
  
  console.log('\n=== CREDENTIAL 1: FULL_SCHOOL USER ===');
  console.log(`Email:                   ${fullSchoolEmail}`);
  console.log(`Password:                ${TEST_PASSWORD}`);
  console.log(`Role Details:            Has access to ALL campuses within Assigned School ID.`);
  
  console.log('\n=== CREDENTIAL 2: CAMPUS_RESTRICTED USER ===');
  console.log(`Email:                   ${campusRestrictedEmail}`);
  console.log(`Password:                ${TEST_PASSWORD}`);
  console.log(`Role Details:            Has access ONLY to Assigned Campus ID within Assigned School ID.`);
  
  console.log('\n=================================================================');
  console.log('IMPORTANT: When finished testing, run the cleanup script using:');
  console.log(`node apps/api-gateway/cleanup-manual-test.js ${tenantId} ${otherTenantId} ${fullSchoolUserId} ${campusRestrictedUserId}`);
  console.log('=================================================================\n');

  await prisma.$disconnect();
}

run().catch(console.error);
