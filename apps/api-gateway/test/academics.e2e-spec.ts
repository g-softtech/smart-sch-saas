import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { kernel, tenantContext } from '@saas/core-platform';

describe('AcademicsController (e2e)', () => {
  let app: INestApplication;
  let tenantId: string;
  let schoolId: string;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Setup Test Data
    const tenant = await kernel.db.tenant.create({
      data: { name: 'Academics Test Tenant', slug: 'academics-test-tenant' },
    });
    tenantId = tenant.id;

    await tenantContext.run({ tenantId }, async () => {
      const school = await kernel.db.school.create({
        data: { name: 'Academics Test School', tenantId },
      });
      schoolId = school.id;
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'academics-test-user@example.com', password: 'Password123!', firstName: 'Test', lastName: 'User' });
    
    // We will just register a new one to get the token, then update membership
    const registeredUserId = (await kernel.db.user.findUnique({ where: { email: 'academics-test-user@example.com' } })).id;
    
    await tenantContext.run({ tenantId }, async () => {
      // Create Role
      const role = await kernel.db.role.create({
        data: { name: 'Admin', tenantId, isSystem: true }
      });

      await kernel.db.userTenantMembership.create({
        data: {
          userId: registeredUserId,
          tenantId,
          roleId: role.id,
        },
      });
    });
    jwtToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await tenantContext.run({ tenantId }, async () => {
      await kernel.db.userTenantMembership.deleteMany({ where: { tenantId } });
      await kernel.db.role.deleteMany({ where: { tenantId } });
      await kernel.db.academicYear.deleteMany({ where: { schoolId } });
      await kernel.db.school.deleteMany({ where: { id: schoolId } });
    });
    await kernel.db.tenant.deleteMany({ where: { id: tenantId } });
    await kernel.db.user.deleteMany({ where: { email: 'academics-test-user@example.com' } });
    await app.close();
  });

  it('should reject unauthenticated GET requests', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years')
      .expect(401);
  });

  it('should return empty lists initially', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('should list academic years with deterministic ordering', async () => {
    await kernel.db.academicYear.create({
      data: { tenantId, schoolId, name: 'B-Year' }
    });
    await kernel.db.academicYear.create({
      data: { tenantId, schoolId, name: 'A-Year' }
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .expect(200);

    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].name).toBe('A-Year');
    expect(res.body.data[1].name).toBe('B-Year');
  });
  
  it('should support bounded pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years?skip=1&take=1')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .expect(200);

    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('B-Year');
  });

  it('should reject access with invalid tenant/school headers', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'invalid-tenant-id')
      .set('x-school-id', schoolId)
      .expect(403);
  });
});
