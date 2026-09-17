const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testQuery() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@schoolos.com' } });
  
  const rows = await prisma.$queryRaw`
      SELECT
        m.id              AS membership_id,
        m."tenantId"      AS tenant_id,
        t.name            AS tenant_name,
        s.id              AS school_id,
        s.name            AS school_name
      FROM idm_tenant_memberships m
      INNER JOIN plt_tenants t ON t.id = m."tenantId"
      LEFT JOIN "School"  s ON s."tenantId" = m."tenantId"
      WHERE
        m."userId"     = ${user.id}
        AND m.state    = 'ACTIVE'
        AND m."isRevoked" = false
    `;
    
  console.log(rows);
}

testQuery().catch(console.error).finally(() => prisma.$disconnect());
