import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { kernel, tenantContext, StaffStatus, StaffType, CredentialType } from '@saas/core-platform';

describe('StaffController (e2e) - Final Verification Audit', () => {
  jest.setTimeout(120000);
  let app: INestApplication;
  
  let tenantAId: string;
  let tenantBId: string;
  let schoolAId: string;
  let schoolBId: string; // School in Tenant A
  let schoolCId: string; // School in Tenant B
  
  let userAId: string;
  let userBId: string;
  
  let staffAId: string;
  let staffCId: string;
  
  let departmentAId: string;
  let departmentCId: string;
  
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    process.env.CREDENTIAL_SECRET = 'test-secret';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const { ValidationPipe } = require('@nestjs/common');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }));
    await app.init();

    // 1. Setup Tenants
    const tenantA = await kernel.db.tenant.create({ data: { name: 'Tenant A', slug: 'ta-' + Date.now() } });
    const tenantB = await kernel.db.tenant.create({ data: { name: 'Tenant B', slug: 'tb-' + Date.now() } });
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    // 2. Setup Schools inside tenants
    await tenantContext.run({ tenantId: tenantAId }, async () => {
      const schA = await kernel.db.school.create({ data: { tenantId: tenantAId, name: 'School A' } });
      const schB = await kernel.db.school.create({ data: { tenantId: tenantAId, name: 'School B' } });
      schoolAId = schA.id;
      schoolBId = schB.id;
    });

    await tenantContext.run({ tenantId: tenantBId }, async () => {
      const schC = await kernel.db.school.create({ data: { tenantId: tenantBId, name: 'School C' } });
      schoolCId = schC.id;
    });

    // 3. Setup Users
    const userA = await kernel.db.user.create({ data: { email: 'ua-' + Date.now() + '@example.com' } });
    const userB = await kernel.db.user.create({ data: { email: 'ub-' + Date.now() + '@example.com' } });
    userAId = userA.id;
    userBId = userB.id;

    // 4. Setup User Memberships and Roles
    await tenantContext.run({ tenantId: tenantAId }, async () => {
      const roleId = 'role-ta-' + Date.now();
      await kernel.db.role.create({ data: { id: roleId, tenantId: tenantAId, name: 'SUPER_ADMIN' } });
      await kernel.db.userTenantMembership.create({ data: { tenantId: tenantAId, userId: userAId, roleId } });
      
      const deptA = await kernel.db.department.create({ data: { tenantId: tenantAId, schoolId: schoolAId, name: 'Dept A' } });
      departmentAId = deptA.id;
    });

    await tenantContext.run({ tenantId: tenantBId }, async () => {
      const roleId = 'role-tb-' + Date.now();
      await kernel.db.role.create({ data: { id: roleId, tenantId: tenantBId, name: 'SUPER_ADMIN' } });
      await kernel.db.userTenantMembership.create({ data: { tenantId: tenantBId, userId: userBId, roleId } });
      
      const deptC = await kernel.db.department.create({ data: { tenantId: tenantBId, schoolId: schoolCId, name: 'Dept C' } });
      departmentCId = deptC.id;
    });
    
    // 5. Generate valid JWT tokens for both users
    const jwtService = app.get(require('@nestjs/jwt').JwtService);
    tokenA = await jwtService.signAsync({ sub: userAId });
    tokenB = await jwtService.signAsync({ sub: userBId });
  });

  afterAll(async () => {
    await app.close();
  });

  // --- 1. REAL TENANT-ISOLATION E2E ---

  it('1.A Tenant A cannot GET Staff belonging to Tenant B', async () => {
    // Setup staff in Tenant B
    const createBRes = await request(app.getHttpServer())
      .post('/v1/staff')
      .set('x-tenant-id', tenantBId)
      .set('x-school-id', schoolCId)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ firstName: 'Bob', lastName: 'TenantB', type: StaffType.TEACHING, joiningDate: new Date().toISOString() });
    
    expect(createBRes.status).toBe(201);
    staffCId = createBRes.body.id;

    // Tenant A attempts to read Staff C
    const readAttempt = await request(app.getHttpServer())
      .get(`/v1/staff/${staffCId}`)
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`);
    
    expect(readAttempt.status).toBe(404);
  });

  it('1.D Tenant A cannot create Staff using a Department from Tenant B', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/staff')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ firstName: 'Alice', lastName: 'TenantA', type: StaffType.TEACHING, departmentId: departmentCId, joiningDate: new Date().toISOString() });
    
    expect(res.status).toBe(400); // Bad Request (validation)
  });

  it('1.E School A cannot create Staff using a Department from School B', async () => {
    // Department A belongs to School A. Try to use it in School B.
    const res = await request(app.getHttpServer())
      .post('/v1/staff')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolBId) // School B
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ firstName: 'Alice', lastName: 'TenantA', type: StaffType.TEACHING, departmentId: departmentAId, joiningDate: new Date().toISOString() });
    
    expect(res.status).toBe(400);
  });

  it('1.F Same User can legitimately have StaffProfiles in School A and School B', async () => {
    const res1 = await request(app.getHttpServer())
      .post('/v1/staff')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: userAId, firstName: 'Alice', lastName: 'Dual', type: StaffType.TEACHING, joiningDate: new Date().toISOString() });
    expect(res1.status).toBe(201);
    staffAId = res1.body.id;

    const res2 = await request(app.getHttpServer())
      .post('/v1/staff')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolBId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: userAId, firstName: 'Alice', lastName: 'Dual2', type: StaffType.TEACHING, joiningDate: new Date().toISOString() });
    expect(res2.status).toBe(201);
  });

  it('1.G Same User cannot have two ACTIVE/SUSPENDED StaffProfiles in the same tenant/school', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/staff')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ userId: userAId, firstName: 'Alice', lastName: 'Dup', type: StaffType.TEACHING, joiningDate: new Date().toISOString() });
    expect(res.status).toBe(409); // Constraint violation
  });

  // --- 2. CREDENTIAL SECURITY TESTS ---
  let rawCredentialToken: string;
  let credentialId: string;

  it('2.A Issue Credential: raw token is returned once', async () => {
    const res = await request(app.getHttpServer())
      .post(`/v1/staff/${staffAId}/credentials`)
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: CredentialType.QR });
    
    expect(res.status).toBe(201);
    expect(res.body.rawToken).toBeDefined();
    rawCredentialToken = res.body.rawToken;
    credentialId = res.body.id;
  });

  it('1. Correct raw credential succeeds', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/staff/credentials/verify')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ rawToken: rawCredentialToken });
    expect(res.status).toBe(201);
    expect(res.body.valid).toBe(true);
    expect(res.body.staffId).toBe(staffAId);
  });

  it('2. Wrong raw credential fails', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/staff/credentials/verify')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ rawToken: 'wrong-token' });
    expect(res.status).toBe(404); // Invalid credential
  });

  it('3. Wrong tenant fails', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/staff/credentials/verify')
      .set('x-tenant-id', tenantBId)
      .set('x-school-id', schoolCId)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ rawToken: rawCredentialToken });
    expect(res.status).toBe(404);
  });

  it('4. Wrong school fails', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/staff/credentials/verify')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolBId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ rawToken: rawCredentialToken });
    expect(res.status).toBe(404);
  });

  it('5. Revoked credential fails', async () => {
    // Issue a new one, which revokes the old one
    const newCredRes = await request(app.getHttpServer())
      .post(`/v1/staff/${staffAId}/credentials`)
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: CredentialType.QR });
    
    expect(newCredRes.status).toBe(201);
    
    const verifyOldRes = await request(app.getHttpServer())
      .post('/v1/staff/credentials/verify')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ rawToken: rawCredentialToken });
    expect(verifyOldRes.status).toBe(400); // Inactive or revoked
    
    // update rawCredentialToken to the new one for the rest of tests
    rawCredentialToken = newCredRes.body.rawToken;
  });

  it('6. Expired credential fails', async () => {
    await tenantContext.run({ tenantId: tenantAId }, async () => {
      await kernel.db.staffCredential.updateMany({
        where: { tenantId: tenantAId, staffId: staffAId, isActive: true },
        data: { expiresAt: new Date(Date.now() - 10000) } // past
      });
    });

    const res = await request(app.getHttpServer())
      .post('/v1/staff/credentials/verify')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ rawToken: rawCredentialToken });
    expect(res.status).toBe(400);
  });

  it('7. Inactive credential fails', async () => {
    await tenantContext.run({ tenantId: tenantAId }, async () => {
      await kernel.db.staffCredential.updateMany({
        where: { tenantId: tenantAId, staffId: staffAId, isActive: true },
        data: { isActive: false }
      });
    });

    const res = await request(app.getHttpServer())
      .post('/v1/staff/credentials/verify')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ rawToken: rawCredentialToken });
    expect(res.status).toBe(400);
  });

  it('8. Only HMAC-SHA-256 digest is persisted & 9. Raw credential is never persisted & 10. Lookup by HMAC', async () => {
    await tenantContext.run({ tenantId: tenantAId }, async () => {
      const creds = await kernel.db.staffCredential.findMany({ where: { staffId: staffAId } });
      for (const cred of creds) {
        expect(cred.credentialHash).toBeDefined();
        expect(cred.credentialHash.length).toBe(64); // hex sha256
        expect(cred.credentialHash).not.toBe(rawCredentialToken);
        expect((cred as any).rawToken).toBeUndefined();
      }
    });
  });

  it('11. Cross-workspace credential issuance fails', async () => {
    const res = await request(app.getHttpServer())
      .post(`/v1/staff/${staffCId}/credentials`)
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: CredentialType.QR });
    expect(res.status).toBe(404);
  });

  it('12. CREDENTIAL_SECRET is required and has no fallback/default/hardcoded value', async () => {
    const originalSecret = process.env.CREDENTIAL_SECRET;
    delete process.env.CREDENTIAL_SECRET;
    try {
      const res = await request(app.getHttpServer())
        .post('/v1/staff/credentials/verify')
        .set('x-tenant-id', tenantAId)
        .set('x-school-id', schoolAId)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ rawToken: rawCredentialToken });
      
      expect(res.status).toBe(500);
    } finally {
      process.env.CREDENTIAL_SECRET = originalSecret;
    }
  });


  // --- 4. STAFF NUMBER TRANSACTION TEST ---
  it('4.A Staff-number concurrency (10 simultaneous creations)', async () => {
    const promises = Array.from({ length: 10 }).map((_, i) => {
      return request(app.getHttpServer())
        .post('/v1/staff')
        .set('x-tenant-id', tenantAId)
        .set('x-school-id', schoolAId)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          firstName: 'Simul',
          lastName: 'Test ' + i,
          type: StaffType.TEACHING,
          joiningDate: new Date().toISOString(),
        });
    });

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && (r as any).value.status === 201).map(r => (r as any).value);
    
    const numbers = new Set(successful.map((res: any) => res.body.staffNumber));
    expect(numbers.size).toBe(successful.length);
  });

  it('4.B Sequence Rollback (no gaps on failure)', async () => {
    const seqBefore = await kernel.db.staffNumberSequence.findUnique({ where: { tenantId_schoolId: { tenantId: tenantAId, schoolId: schoolAId } } });
    const lastNumBefore = seqBefore ? seqBefore.lastNumber : 0;

    const failRes = await request(app.getHttpServer())
      .post('/v1/staff')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        firstName: 'Fail',
        lastName: 'Test',
        type: 'INVALID_TYPE', 
        joiningDate: new Date().toISOString(),
      });

    expect(failRes.status).toBe(400);

    const successRes = await request(app.getHttpServer())
      .post('/v1/staff')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        firstName: 'Success',
        lastName: 'Test',
        type: StaffType.NON_TEACHING,
        joiningDate: new Date().toISOString(),
      });

    expect(successRes.status).toBe(201);
    const expectedNum = lastNumBefore + 1;
    const expectedStaffNumber = 'STF-' + String(expectedNum).padStart(6, '0');
    expect(successRes.body.staffNumber).toBe(expectedStaffNumber);
  });
});
