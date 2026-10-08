import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env.test' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { kernel, tenantContext } from '@saas/core-platform';

describe('CMS Admin (e2e)', () => {
  jest.setTimeout(120000);

  let app: INestApplication;
  let jwtService: JwtService;
  let adminToken: string;
  let tenantId: string;
  let schoolId: string;
  
  beforeAll(async () => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || !dbUrl.includes('localhost')) {
      throw new Error('FATAL: DATABASE_URL must point to localhost for integration tests!');
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    
    jwtService = app.get<JwtService>(JwtService);

    await kernel.db.$executeRawUnsafe('TRUNCATE TABLE "plt_tenants" CASCADE;');

    const tenant = await kernel.db.tenant.create({ data: { name: 'CMS Test Tenant', slug: 'cms-test-tenant' } });
    tenantId = tenant.id;

    await tenantContext.run({ tenantId }, async () => {
      const school = await kernel.db.school.create({ data: { tenantId, name: 'CMS School' } });
      schoolId = school.id;

      const role = await kernel.db.role.create({ data: { tenantId, name: 'ADMIN' } });
      const uniqueSuffix = Date.now().toString();
      const user = await kernel.db.user.create({ data: { email: `cms-admin-${uniqueSuffix}@e2e.test` } });
      
      await kernel.db.userTenantMembership.create({
        data: { userId: user.id, tenantId, roleId: role.id }
      });

      await kernel.db.userSchoolAccess.create({
        data: { userId: user.id, schoolId }
      });

      const perms = ['website:manage_config', 'website:manage_content'];
      for (const p of perms) {
        let perm = await kernel.db.permission.findUnique({ where: { name: p } });
        if (!perm) perm = await kernel.db.permission.create({ data: { name: p, description: 'desc' } });
        await kernel.db.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
      }

      adminToken = jwtService.sign(
        { sub: user.id, id: user.id, email: user.email },
        { secret: process.env.JWT_SECRET || 'super-secret-default-key-do-not-use-in-prod' }
      );
    });
  });

  afterAll(async () => {
    await kernel.db.$executeRawUnsafe('TRUNCATE TABLE "plt_tenants" CASCADE;');
    await app.close();
  });

  it('GET /v1/cms/admin/config should not 500 when initially called', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/cms/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .expect(200);

    expect(res.body.tenantId).toBe(tenantId);
    expect(res.body.schoolId).toBe(schoolId);
    
    const pages = await request(app.getHttpServer())
      .get('/v1/cms/admin/pages')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .expect(200);
    
    expect(pages.body.some((p: any) => p.slug === 'home')).toBe(true);
  });

  it('PUT /v1/cms/admin/navigation should strictly validate DTO payload', async () => {
    await request(app.getHttpServer())
      .put('/v1/cms/admin/navigation')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .send({
        items: [{ label: 'About', target: '/about', order: 1 }]
      })
      .expect(400);

    await request(app.getHttpServer())
      .put('/v1/cms/admin/navigation')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .send({
        items: [{ label: 'About', targetUrl: '/about', orderIndex: 1, isActive: true }]
      })
      .expect(200);
  });

  it('POST /v1/cms/admin/pages should create a page properly', async () => {
    const payload = { title: 'New Page', slug: 'new-page', content: '# Hello' };
    const res = await request(app.getHttpServer())
      .post('/v1/cms/admin/pages')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .send(payload)
      .expect(201);
      
    expect(res.body.slug).toBe('new-page');
  });

  it('POST /v1/cms/admin/announcements should create an announcement', async () => {
    const payload = { title: 'Important Update', content: 'Details...' };
    const res = await request(app.getHttpServer())
      .post('/v1/cms/admin/announcements')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .send(payload)
      .expect(201);
      
    expect(res.body.title).toBe('Important Update');
  });
});
