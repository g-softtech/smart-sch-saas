import * as dotenv from 'dotenv';
// MUST use .env.test which points to localhost!
dotenv.config({ path: '../../.env.test' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { kernel, EnrollmentStatus, tenantContext } from '@saas/core-platform';

describe('StudentsController (Real PostgreSQL DB + HTTP/E2E)', () => {
  jest.setTimeout(30000); // Increase timeout for app initialization

  let app: INestApplication;
  let jwtService: JwtService;
  let validToken: string;
  let tenantA_id: string;
  let schoolA_id: string;

  beforeAll(async () => {
    // 1. Verify DATABASE_URL points to localhost to avoid touching Neon
    const dbUrl = process.env.DATABASE_URL;
    console.log('HTTP E2E DATABASE_URL:', dbUrl);
    if (!dbUrl || !dbUrl.includes('localhost')) {
      throw new Error('FATAL: DATABASE_URL must point to localhost for integration tests! Current URL: ' + dbUrl);
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    jwtService = app.get<JwtService>(JwtService);

    // Setup basic DB state
    await kernel.db.$executeRawUnsafe('TRUNCATE TABLE "plt_tenants" CASCADE;');

    const tenant = await kernel.db.tenant.create({ data: { name: 'E2E Tenant', slug: 'e2e-tenant' } });
    tenantA_id = tenant.id;

    let roleId: string;
    await tenantContext.run({ tenantId: tenantA_id }, async () => {
      const school = await kernel.db.school.create({ data: { tenantId: tenantA_id, name: 'E2E School' } });
      schoolA_id = school.id;

      const role = await kernel.db.role.create({
        data: {
          tenantId: tenantA_id,
          name: 'Tenant Admin',
        }
      });
      roleId = role.id;

      const user = await kernel.db.user.create({
        data: {
          email: 'admin@e2e.test',
        }
      });

      await kernel.db.userTenantMembership.create({
        data: {
          userId: user.id,
          tenantId: tenantA_id,
          roleId: roleId,
        }
      });
      
      validToken = jwtService.sign(
        { sub: user.id, email: user.email },
        { secret: process.env.JWT_SECRET || 'super-secret-default-key-do-not-use-in-prod' }
      );
    });
  });

  afterAll(async () => {
    await kernel.db.$executeRawUnsafe('TRUNCATE TABLE "plt_tenants" CASCADE;');
    await kernel.db.$executeRawUnsafe('TRUNCATE TABLE "idm_users" CASCADE;');
    await kernel.db.$disconnect();
    await app.close();
  });

  describe('POST /api/v1/students', () => {
    it('should create a student via HTTP and persist in DB', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', tenantA_id)
        .send({
          schoolId: schoolA_id,
          firstName: 'Http',
          lastName: 'Student',
          gender: 'MALE',
          admissionDate: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.studentNumber).toBeDefined();
      expect(res.body.data.tenantId).toBe(tenantA_id);

      // Verify in DB directly without tenantContext because we can use raw or assume it exists
      const dbStudent = await kernel.db.$queryRawUnsafe(`SELECT * FROM "stud_students" WHERE id = $1`, res.body.data.id);
      expect((dbStudent as any[])[0].firstName).toBe('Http');
    });

    it('should return 401 without token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('x-tenant-id', tenantA_id)
        .send({
          schoolId: schoolA_id,
          firstName: 'No',
          lastName: 'Auth',
          gender: 'MALE',
          admissionDate: new Date().toISOString(),
        });
      expect(res.status).toBe(401);
    });
  });
});
