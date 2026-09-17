const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding admin user...');
  const passwordHash = await argon2.hash('password123');
  
  // Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Test Tenant',
      slug: 'test-tenant',
      status: 'ACTIVE'
    }
  });

  // Create School
  const school = await prisma.school.create({
    data: {
      tenantId: tenant.id,
      name: 'Test School',
      code: 'TS01',
      status: 'ACTIVE'
    }
  });

  // Create User
  const user = await prisma.user.create({
    data: {
      email: 'admin@schoolos.com',
      passwordHash,
      globalRole: 'USER',
      preferredTenantId: tenant.id
    }
  });

  // Create Membership
  await prisma.userTenantMembership.create({
    data: {
      userId: user.id,
      tenantId: tenant.id,
      status: 'ACTIVE',
      roles: ['ADMIN']
    }
  });

  console.log('Admin user created successfully!');
  console.log('Email: admin@schoolos.com');
  console.log('Password: password123');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
