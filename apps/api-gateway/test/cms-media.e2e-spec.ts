import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env.test' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { kernel, tenantContext } from '@saas/core-platform';

describe('CMS Media Upload (e2e)', () => {
  jest.setTimeout(120000);

  let app: INestApplication;
  let jwtService: JwtService;
  let adminToken: string;
  let wrongTenantToken: string;
  let tenantId: string;
  let schoolId: string;
  let wrongTenantId: string;
  
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

    // Clean up before starting
    await kernel.db.$executeRawUnsafe('TRUNCATE TABLE "plt_tenants" CASCADE;');

    // --- SETUP VALID TENANT ---
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

      let perm = await kernel.db.permission.findUnique({ where: { name: 'website:manage_config' } });
      if (!perm) {
         perm = await kernel.db.permission.create({ data: { name: 'website:manage_config', description: 'desc' } });
      }
      await kernel.db.rolePermission.create({
         data: { roleId: role.id, permissionId: perm.id }
      });

      adminToken = jwtService.sign(
        { sub: user.id, id: user.id, email: user.email },
        { secret: process.env.JWT_SECRET || 'super-secret-default-key-do-not-use-in-prod' }
      );
    });
    
    // --- SETUP WRONG TENANT ---
    const tenant2 = await kernel.db.tenant.create({ data: { name: 'Wrong Tenant', slug: 'wrong-tenant' } });
    wrongTenantId = tenant2.id;
    await tenantContext.run({ tenantId: wrongTenantId }, async () => {
      const school2 = await kernel.db.school.create({ data: { tenantId: wrongTenantId, name: 'Wrong School' } });
      const role2 = await kernel.db.role.create({ data: { tenantId: wrongTenantId, name: 'ADMIN' } });
      const uniqueSuffix2 = Date.now().toString() + '2';
      const user2 = await kernel.db.user.create({ data: { email: `wrong-admin-${uniqueSuffix2}@e2e.test` } });
      await kernel.db.userTenantMembership.create({
        data: { userId: user2.id, tenantId: wrongTenantId, roleId: role2.id }
      });
      await kernel.db.userSchoolAccess.create({
        data: { userId: user2.id, schoolId: school2.id }
      });
      wrongTenantToken = jwtService.sign(
        { sub: user2.id, id: user2.id, email: user2.email },
        { secret: process.env.JWT_SECRET || 'super-secret-default-key-do-not-use-in-prod' }
      );
    });
  });

  afterAll(async () => {
    await kernel.db.$executeRawUnsafe('TRUNCATE TABLE "plt_tenants" CASCADE;');
    await app.close();
  });

  it('rejects upload without token', async () => {
    const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    await request(app.getHttpServer())
      .post('/v1/cms/admin/media/upload')
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .attach('file', dummyPng, { filename: 'test.png', contentType: 'image/png' })
      .expect(401);
  });
  
  it('rejects upload for wrong tenant isolation', async () => {
    const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    await request(app.getHttpServer())
      .post('/v1/cms/admin/media/upload')
      .set('Authorization', `Bearer ${wrongTenantToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .attach('file', dummyPng, { filename: 'test.png', contentType: 'image/png' })
      .expect(403);
  });

  it('rejects invalid file type', async () => {
    const dummyTxt = Buffer.from('Hello world');
    const res = await request(app.getHttpServer())
      .post('/v1/cms/admin/media/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .attach('file', dummyTxt, { filename: 'test.txt', contentType: 'text/plain' })
      .expect(400);
      
    expect(res.body.message).toContain('not allowed');
  });

  it('rejects mismatching magic bytes', async () => {
    const fakePng = Buffer.from('This is not a real PNG file data');
    const res = await request(app.getHttpServer())
      .post('/v1/cms/admin/media/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .attach('file', fakePng, { filename: 'test.png', contentType: 'image/png' })
      .expect(400);
      
    expect(res.body.message).toContain('content does not match');
  });

  it('successfully uploads valid media and persists to database', async () => {
    const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    const res = await request(app.getHttpServer())
      .post('/v1/cms/admin/media/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .attach('file', dummyPng, { filename: 'test.png', contentType: 'image/png' })
      .expect(201);
      
    const data = res.body.data || res.body;
    expect(data.id).toBeDefined();
    expect(data.mimeType).toBe('image/png');
    expect(data.filename).toBe('test.png');
    expect(data.serveUrl).toBeDefined();
    
    const dbRecord = await kernel.db.cmsMedia.findUnique({ where: { id: data.id } });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.tenantId).toBe(tenantId);
    expect(dbRecord?.schoolId).toBe(schoolId);
    expect(dbRecord?.mimeType).toBe('image/png');
    expect(dbRecord?.data.length).toBeGreaterThan(0);
    expect(dbRecord?.data.toString('base64')).toEqual(dummyPng.toString('base64'));
  });
});
