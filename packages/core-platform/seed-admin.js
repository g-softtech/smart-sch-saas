const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding admin user...');
  const passwordHash = '$argon2id$v=19$m=65536,p=4,t=3$MG7ES2cw97wZF9FLyFJkqg$pkT6CBdJ9r81aKsJy2aVgeCMx6CMdIpmSVZm09doqJY';
  
  // Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Test Tenant',
      slug: 'test-tenant-' + Date.now(),
      status: 'ACTIVE'
    }
  });

  // Create School
  const school = await prisma.school.create({
    data: {
      tenantId: tenant.id,
      name: 'Test School'
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
      user: { connect: { id: user.id } },
      tenant: { connect: { id: tenant.id } },
      status: 'ACTIVE',
      roles: ['ADMIN']
    }
  });

  console.log('Admin user created successfully!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
