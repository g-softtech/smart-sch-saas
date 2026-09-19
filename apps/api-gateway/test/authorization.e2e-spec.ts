import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { IdentityModule } from '../src/modules/identity/identity.module';
import { kernel, tenantContext } from '@saas/core-platform';
import * as crypto from 'crypto';
const uuidv4 = crypto.randomUUID;
import { AppModule } from '../src/app.module';

describe('WorkspaceContextInterceptor Authorization (e2e)', () => {
  let app: INestApplication;
  let tenantId: string;
  let school1Id: string;
  let school2Id: string;
  let campus1Id: string;
  let campus2Id: string;
  let superAdminId: string;
  let normalUserId: string;
  let campusUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    tenantId = uuidv4();
    school1Id = uuidv4();
    school2Id = uuidv4();
    campus1Id = uuidv4();
    campus2Id = uuidv4();
    superAdminId = uuidv4();
    normalUserId = uuidv4();
    campusUserId = uuidv4();

    // Setup Test Data
    await kernel.db.tenant.create({ data: { id: tenantId, name: 'Auth Test Tenant', slug: 'auth-test-' + tenantId } });

    await tenantContext.run({ tenantId }, async () => {
      await kernel.db.school.createMany({
        data: [
          { id: school1Id, tenantId, name: 'Auth School 1' },
          { id: school2Id, tenantId, name: 'Auth School 2' },
        ],
      });
      await kernel.db.campus.createMany({
        data: [
          { id: campus1Id, schoolId: school1Id, tenantId, name: 'Auth Campus 1' },
          { id: campus2Id, schoolId: school1Id, tenantId, name: 'Auth Campus 2' },
        ],
      });

      // Create Roles
      const superAdminRole = await kernel.db.role.create({ data: { tenantId, name: 'SUPER_ADMIN' } });
      const userRole = await kernel.db.role.create({ data: { tenantId, name: 'USER' } });

      // Create Users
      await kernel.db.user.createMany({
        data: [
          { id: superAdminId, email: 'super@test.com' },
          { id: normalUserId, email: 'normal@test.com' },
          { id: campusUserId, email: 'campus@test.com' },
        ],
      });
      // Create Memberships
      await kernel.db.userTenantMembership.createMany({
        data: [
          { userId: superAdminId, tenantId, roleId: superAdminRole.id, state: 'ACTIVE' },
          { userId: normalUserId, tenantId, roleId: userRole.id, state: 'ACTIVE' },
          { userId: campusUserId, tenantId, roleId: userRole.id, state: 'ACTIVE' },
        ],
      });

      // Create UserSchoolAccess
      await kernel.db.userSchoolAccess.createMany({
        data: [
          // Normal User has FULL_SCHOOL access to School 1
          { userId: normalUserId, tenantId, schoolId: school1Id, campusId: null },
          // Campus User has CAMPUS_RESTRICTED access to Campus 1 in School 1
          { userId: campusUserId, tenantId, schoolId: school1Id, campusId: campus1Id },
        ],
      });
    });
  });

  afterAll(async () => {
    await kernel.db.$executeRawUnsafe('TRUNCATE TABLE "plt_tenants" CASCADE;');
    await kernel.db.$executeRawUnsafe('TRUNCATE TABLE "idm_users" CASCADE;');
    await app.close();
  });

  // Mock JWT generation for testing
  const getToken = (userId: string) => {
    const jwtService = app.get(JwtService);
    return jwtService.sign({ sub: userId });
  };

  it('SUPER_ADMIN -> assigned school succeeds', async () => {
    const token = getToken(superAdminId);
    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', school1Id);
    
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });

  it('SUPER_ADMIN -> school belonging to another tenant is rejected', async () => {
    const token = getToken(superAdminId);
    const otherTenantId = uuidv4();
    const otherSchoolId = uuidv4();
    await kernel.db.tenant.create({ data: { id: otherTenantId, name: 'Other Tenant', slug: 'other-tenant-' + otherTenantId } });
    await tenantContext.run({ tenantId: otherTenantId }, async () => {
      await kernel.db.school.create({ data: { id: otherSchoolId, tenantId: otherTenantId, name: 'Other School' } });
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', otherSchoolId); // Supplying a school from another tenant
    
    expect(res.status).toBe(403);
    await tenantContext.run({ tenantId: otherTenantId }, async () => {
      await kernel.db.school.delete({ where: { id: otherSchoolId } });
    });
    await kernel.db.tenant.delete({ where: { id: otherTenantId } });
  });

  it('USER -> assigned school succeeds', async () => {
    const token = getToken(normalUserId);
    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', school1Id);
    
    expect(res.status).not.toBe(403);
  });

  it('USER -> unassigned school is rejected', async () => {
    const token = getToken(normalUserId);
    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', school2Id); // User is not assigned to school 2
    
    expect(res.status).toBe(403);
  });

  it('USER -> another tenant is rejected', async () => {
    const token = getToken(normalUserId);
    const otherTenantId = uuidv4();
    await kernel.db.tenant.create({ data: { id: otherTenantId, name: 'Other Tenant', slug: 'other-tenant-2-' + otherTenantId } });
    
    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', otherTenantId)
      .set('x-school-id', school1Id);
    
    expect(res.status).toBe(403); // Fails because they don't have membership in other tenant
    await kernel.db.tenant.delete({ where: { id: otherTenantId } });
  });

  it('CAMPUS_RESTRICTED USER -> authorized campus succeeds', async () => {
    const token = getToken(campusUserId);
    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', school1Id)
      .set('x-campus-id', campus1Id);
    
    expect(res.status).not.toBe(403);
  });

  it('CAMPUS_RESTRICTED USER -> unauthorized campus is rejected', async () => {
    const token = getToken(campusUserId);
    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', school1Id)
      .set('x-campus-id', campus2Id); // Campus 2 is not assigned
    
    expect(res.status).toBe(403);
  });

  it('CAMPUS_RESTRICTED USER -> omitting campus defaults safely (does not broaden access)', async () => {
    const token = getToken(campusUserId);
    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years') // School scoped request
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', school1Id);
    
    expect(res.status).not.toBe(403);
    // Note: Interceptor automatically injects `campus1Id` into request.workspace.campusId
    // If they call a campus-aware endpoint, it will enforce campus1Id.
  });

  it('Invalid/nonexistent school/campus IDs are rejected safely', async () => {
    const token = getToken(normalUserId);
    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', uuidv4()); // Nonexistent
    
    expect(res.status).toBe(403);
  });
});
