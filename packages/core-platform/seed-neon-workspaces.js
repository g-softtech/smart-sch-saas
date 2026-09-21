const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
  try {
    const user = await prisma.user.findUnique({ where: { email: 'admin@schoolos.com' } });
    if (!user) {
      console.log('User admin@schoolos.com not found!');
      return;
    }
    console.log('User found:', user.email);

    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.log('No tenant found. Creating one...');
      tenant = await prisma.tenant.create({
        data: { name: 'Demo Tenant', domain: 'demo.schoolos.com' }
      });
    }
    console.log('Tenant:', tenant.name, tenant.id);

    let role = await prisma.role.findFirst({
      where: { tenantId: tenant.id, name: 'SUPER_ADMIN' }
    });
    if (!role) {
      console.log('Creating SUPER_ADMIN role...');
      role = await prisma.role.create({
        data: { tenantId: tenant.id, name: 'SUPER_ADMIN' }
      });
    }

    let membership = await prisma.userTenantMembership.findFirst({
      where: { userId: user.id, tenantId: tenant.id }
    });
    
    if (!membership) {
      console.log('Creating user tenant membership...');
      membership = await prisma.userTenantMembership.create({
        data: { userId: user.id, tenantId: tenant.id, roleId: role.id, state: 'ACTIVE' }
      });
    }

    let school = await prisma.school.findFirst({
      where: { tenantId: tenant.id }
    });

    if (!school) {
      console.log('Creating school...');
      school = await prisma.school.create({
        data: { tenantId: tenant.id, name: 'Demo High School', slug: 'demo-high' }
      });
    }
    console.log('School:', school.name, school.id);

    let access = await prisma.userSchoolAccess.findFirst({
      where: { userId: user.id, schoolId: school.id }
    });

    if (!access) {
      console.log('Creating user school access...');
      await prisma.userSchoolAccess.create({
        data: { userId: user.id, schoolId: school.id, tenantId: tenant.id }
      });
    }

    let year = await prisma.academicYear.findFirst({
      where: { tenantId: tenant.id, schoolId: school.id }
    });
    if (!year) {
      console.log('Creating academic year...');
      year = await prisma.academicYear.create({
        data: { tenantId: tenant.id, schoolId: school.id, name: '2026-2027', startDate: new Date('2026-09-01'), endDate: new Date('2027-07-01'), status: 'ACTIVE' }
      });
    }

    let targetClass = await prisma.class.findFirst({
      where: { tenantId: tenant.id, schoolId: school.id }
    });
    if (!targetClass) {
      console.log('Creating class...');
      targetClass = await prisma.class.create({
        data: { tenantId: tenant.id, schoolId: school.id, name: 'Grade 10', capacity: 30 }
      });
    }
    
    console.log('All required test data is present.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
