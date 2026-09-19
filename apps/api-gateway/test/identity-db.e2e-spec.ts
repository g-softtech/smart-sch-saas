import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { kernel, tenantContext, IdentityState } from '@saas/core-platform';
import * as argon2 from 'argon2';

/**
 * Real-DB E2E: GET /api/v1/auth/workspaces
 *
 * Exercises the real repository/database path against local PostgreSQL.
 * All 10 certification requirements are verified here.
 *
 * Requirements:
 *  1. Authenticated user receives only their active, unrevoked memberships.
 *  2. A user belonging to multiple tenants receives only those authorized tenants.
 *  3. Within each tenant, only schools authorized by that user's memberships are returned.
 *  4. Revoked memberships are excluded.
 *  5. Memberships belonging to another user are excluded.
 *  6. A tenant/school that exists but is not associated with the authenticated user is NOT returned.
 *  7. Unauthenticated request returns 401.
 *  8. No client-supplied tenantId/schoolId can expand the returned workspace set.
 *  9. The response does not expose secrets or unnecessary membership internals.
 * 10. The real query preserves tenant/workspace isolation (not mocked).
 */
describe('Identity Workspaces (e2e) - Real DB', () => {
  jest.setTimeout(60000);
  let app: INestApplication;

  let tenant1Id: string;  // User A active member
  let tenant2Id: string;  // User A active member (multi-tenant)
  let tenant3Id: string;  // User A REVOKED member; User B active member
  let tenant4Id: string;  // Exists in DB but no membership for any test user

  let school1AId: string;
  let school1BId: string;
  let school2AId: string;
  let school3AId: string;

  let userAId: string;
  let userBId: string;

  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    const ts = Date.now();

    // --- Create 4 Tenants ---
    const t1 = await kernel.db.tenant.create({ data: { name: `WS-T1-${ts}`, slug: `ws-t1-${ts}` } });
    tenant1Id = t1.id;
    const t2 = await kernel.db.tenant.create({ data: { name: `WS-T2-${ts}`, slug: `ws-t2-${ts}` } });
    tenant2Id = t2.id;
    const t3 = await kernel.db.tenant.create({ data: { name: `WS-T3-${ts}`, slug: `ws-t3-${ts}` } });
    tenant3Id = t3.id;
    const t4 = await kernel.db.tenant.create({ data: { name: `WS-T4-${ts}`, slug: `ws-t4-${ts}` } });
    tenant4Id = t4.id;

    // --- Create Schools ---
    await tenantContext.run({ tenantId: tenant1Id }, async () => {
      const s = await kernel.db.school.create({ data: { tenantId: tenant1Id, name: 'WS-T1-SchoolA' } });
      school1AId = s.id;
      const s2 = await kernel.db.school.create({ data: { tenantId: tenant1Id, name: 'WS-T1-SchoolB' } });
      school1BId = s2.id;
    });
    await tenantContext.run({ tenantId: tenant2Id }, async () => {
      const s = await kernel.db.school.create({ data: { tenantId: tenant2Id, name: 'WS-T2-SchoolA' } });
      school2AId = s.id;
    });
    await tenantContext.run({ tenantId: tenant3Id }, async () => {
      const s = await kernel.db.school.create({ data: { tenantId: tenant3Id, name: 'WS-T3-SchoolA' } });
      school3AId = s.id;
    });
    // T4: school exists but no memberships for test users
    await tenantContext.run({ tenantId: tenant4Id }, async () => {
      await kernel.db.school.create({ data: { tenantId: tenant4Id, name: 'WS-T4-SchoolA' } });
    });

    // --- Create Users ---
    const pwd = await argon2.hash('Password123!');
    const uA = await kernel.db.user.create({ data: { email: `ws-ua-${ts}@school.edu`, passwordHash: pwd } });
    userAId = uA.id;
    const uB = await kernel.db.user.create({ data: { email: `ws-ub-${ts}@school.edu`, passwordHash: pwd } });
    userBId = uB.id;

    // --- Create Memberships ---
    // User A: ACTIVE in T1 and T2; REVOKED (isRevoked=true) in T3; no membership in T4
    await tenantContext.run({ tenantId: tenant1Id }, async () => {
      const role = await kernel.db.role.create({ data: { tenantId: tenant1Id, name: 'SUPER_ADMIN' } });
      await kernel.db.userTenantMembership.create({
        data: { userId: userAId, tenantId: tenant1Id, roleId: role.id, state: IdentityState.ACTIVE }
      });
    });
    await tenantContext.run({ tenantId: tenant2Id }, async () => {
      const role = await kernel.db.role.create({ data: { tenantId: tenant2Id, name: 'SUPER_ADMIN' } });
      await kernel.db.userTenantMembership.create({
        data: { userId: userAId, tenantId: tenant2Id, roleId: role.id, state: IdentityState.ACTIVE }
      });
    });
    // User A in T3: isRevoked=true — must not appear in workspace list
    await tenantContext.run({ tenantId: tenant3Id }, async () => {
      const role = await kernel.db.role.create({ data: { tenantId: tenant3Id, name: 'SUPER_ADMIN' } });
      await kernel.db.userTenantMembership.create({
        data: {
          userId: userAId,
          tenantId: tenant3Id,
          roleId: role.id,
          state: IdentityState.ACTIVE,
          isRevoked: true,
          revokedAt: new Date(),
        }
      });
      // User B: ACTIVE in T3
      await kernel.db.userTenantMembership.create({
        data: { userId: userBId, tenantId: tenant3Id, roleId: role.id, state: IdentityState.ACTIVE }
      });
    });

    // --- Login to get real JWTs ---
    const loginA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: uA.email, password: 'Password123!' });
    expect(loginA.status).toBe(200);
    tokenA = loginA.body.data.accessToken;

    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: uB.email, password: 'Password123!' });
    expect(loginB.status).toBe(200);
    tokenB = loginB.body.data.accessToken;
  });

  afterAll(async () => {
    for (const tId of [tenant1Id, tenant2Id, tenant3Id, tenant4Id]) {
      if (!tId) continue;
      await tenantContext.run({ tenantId: tId }, async () => {
        await kernel.db.userTenantMembership.deleteMany({ where: { tenantId: tId } });
        await kernel.db.school.deleteMany({ where: { tenantId: tId } });
        await kernel.db.role.deleteMany({ where: { tenantId: tId } });
      });
    }
    await kernel.db.tenant.deleteMany({ where: { id: { in: [tenant1Id, tenant2Id, tenant3Id, tenant4Id].filter(Boolean) } } });
    await kernel.db.user.deleteMany({ where: { id: { in: [userAId, userBId].filter(Boolean) } } });
    await app.close();
  });

  // Req 7
  it('7. Unauthenticated request returns 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/workspaces')
      .expect(401);
  });

  // Req 1, 2, 3, 4, 6, 10
  it('1+2+3+4+6+10. User A: active T1 (2 schools) + T2 (1 school); revoked T3 excluded; non-member T4 excluded', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/workspaces')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const workspaces: any[] = res.body.data;

    // Req 1+2: exactly the 2 active tenants
    expect(workspaces.length).toBe(2);

    const t1ws = workspaces.find(w => w.tenantId === tenant1Id);
    const t2ws = workspaces.find(w => w.tenantId === tenant2Id);
    const t3ws = workspaces.find(w => w.tenantId === tenant3Id); // revoked
    const t4ws = workspaces.find(w => w.tenantId === tenant4Id); // no membership

    expect(t1ws).toBeDefined();
    expect(t2ws).toBeDefined();

    // Req 4: revoked membership excluded
    expect(t3ws).toBeUndefined();

    // Req 6: T4 exists in DB with a school, but user has no membership
    expect(t4ws).toBeUndefined();

    // Req 3: T1 has correct 2 schools
    expect(t1ws.schools.length).toBe(2);
    const t1SchoolIds = t1ws.schools.map((s: any) => s.id).sort();
    expect(t1SchoolIds).toEqual([school1AId, school1BId].sort());
    expect(t1ws.schools[0].name).toBeDefined();

    // Req 3: T2 has correct 1 school
    expect(t2ws.schools.length).toBe(1);
    expect(t2ws.schools[0].id).toBe(school2AId);
  });

  // Req 5
  it('5. User B only sees Tenant 3 — User A memberships are NOT visible', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/workspaces')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const workspaces: any[] = res.body.data;

    expect(workspaces.length).toBe(1);
    expect(workspaces[0].tenantId).toBe(tenant3Id);
    expect(workspaces[0].schools[0].id).toBe(school3AId);

    // User A's tenants must be absent
    expect(workspaces.find(w => w.tenantId === tenant1Id)).toBeUndefined();
    expect(workspaces.find(w => w.tenantId === tenant2Id)).toBeUndefined();
  });

  // Req 8, 10
  it('8+10. Spoofed x-tenant-id header cannot expand workspace set beyond user memberships', async () => {
    // User B sends User A's tenant as header — must still only see T3
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/workspaces')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-tenant-id', tenant1Id)
      .expect(200);

    const workspaces: any[] = res.body.data;
    expect(workspaces.length).toBe(1);
    expect(workspaces[0].tenantId).toBe(tenant3Id);
  });

  // Req 9
  it('9. Response shape does not expose internal membership fields', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/workspaces')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const workspace = res.body.data[0];

    // Permitted public fields
    expect(workspace.tenantId).toBeDefined();
    expect(workspace.tenantName).toBeDefined();
    expect(workspace.schools).toBeDefined();

    // Must NOT expose revocation or membership internals
    expect(workspace.roleId).toBeUndefined();
    expect(workspace.isRevoked).toBeUndefined();
    expect(workspace.revokedAt).toBeUndefined();
    expect(workspace.revokedBy).toBeUndefined();
    expect(workspace.state).toBeUndefined();
    expect(workspace.version).toBeUndefined();
    expect(workspace.id).toBeUndefined(); // raw membership id

    // Schools: only public fields
    const school = workspace.schools[0];
    expect(school.id).toBeDefined();
    expect(school.name).toBeDefined();
    expect(school.tenantId).toBeUndefined(); // redundant and not needed
  });
});
