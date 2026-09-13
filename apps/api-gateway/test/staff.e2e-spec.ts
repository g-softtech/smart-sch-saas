import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { kernel, tenantContext } from '@saas/core-platform';
import { StaffStatus, StaffType, CredentialType } from '@saas/core-platform';

describe('StaffController (e2e)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let testTenantId: string;
  let otherTenantId: string;
  let testSchoolId: string;
  let otherSchoolId: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Setup Test Data
    const tenant = await kernel.db.tenant.create({ data: { name: 'Staff Test Tenant', slug: 'staff-test-' + Date.now() } });
    const otherTenant = await kernel.db.tenant.create({ data: { name: 'Staff Other Tenant', slug: 'staff-other-' + Date.now() } });
    testTenantId = tenant.id;
    otherTenantId = otherTenant.id;

    await tenantContext.run({ tenantId: testTenantId }, async () => {
      const school = await kernel.db.school.create({ data: { tenantId: testTenantId, name: 'Staff Test School' } });
      const otherSchool = await kernel.db.school.create({ data: { tenantId: testTenantId, name: 'Staff Other School' } });
      testSchoolId = school.id;
      otherSchoolId = otherSchool.id;
      
      const user = await kernel.db.user.create({ data: { email: 'staff-test-' + Date.now() + '@example.com' } });
      testUserId = user.id;
  
      const roleId = 'mock-role-id-' + Date.now();
      await kernel.db.role.create({ data: { id: roleId, tenantId: testTenantId, name: 'Mock Role' } });
  
      await kernel.db.userTenantMembership.create({
        data: { tenantId: testTenantId, userId: testUserId, roleId: roleId },
      });
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('G. Staff-number concurrency (10 simultaneous creations)', async () => {
    // We will bypass supertest for concurrency to hit the service directly or use Promise.all with request
    const promises = Array.from({ length: 10 }).map((_, i) => {
      return request(app.getHttpServer())
        .post('/v1/staff')
        .set('x-tenant-id', testTenantId)
        .set('x-school-id', testSchoolId)
        .set('x-user-id', testUserId) // using interceptor bypass for test or valid JWT
        .send({
          firstName: 'Simul',
          lastName: 'Test ' + i,
          type: StaffType.TEACHING,
          joiningDate: new Date().toISOString(),
        });
    });

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && (r as any).value.status === 201).map(r => (r as any).value);
    
    // Check all numbers are unique
    const numbers = new Set(successful.map((res: any) => res.body.staffNumber));
    expect(numbers.size).toBe(successful.length);
  });

  // H. Staff-number rollback
  it('H. Sequence Rollback (no gaps on failure)', async () => {
    // Read current sequence
    const seqBefore = await kernel.db.staffNumberSequence.findUnique({ where: { tenantId_schoolId: { tenantId: testTenantId, schoolId: testSchoolId } } });
    const lastNumBefore = seqBefore ? seqBefore.lastNumber : 0;

    // Force a failure (invalid type enum)
    const failRes = await request(app.getHttpServer())
      .post('/v1/staff')
      .set('x-tenant-id', testTenantId)
      .set('x-school-id', testSchoolId)
      .set('x-user-id', testUserId)
      .send({
        firstName: 'Fail',
        lastName: 'Test',
        type: 'INVALID_TYPE', 
        joiningDate: new Date().toISOString(),
      });

    expect(failRes.status).toBe(400);

    // Create a successful one
    const successRes = await request(app.getHttpServer())
      .post('/v1/staff')
      .set('x-tenant-id', testTenantId)
      .set('x-school-id', testSchoolId)
      .set('x-user-id', testUserId)
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
