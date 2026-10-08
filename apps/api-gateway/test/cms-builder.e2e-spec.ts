import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env.test' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { kernel, tenantContext } from '@saas/core-platform';

describe('CMS Builder (e2e)', () => {
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

    const uniqueSlug = `cms-builder-${Date.now()}`;
    const tenant = await kernel.db.tenant.create({ data: { name: 'CMS Builder Tenant', slug: uniqueSlug } });
    tenantId = tenant.id;

    await tenantContext.run({ tenantId }, async () => {
      const school = await kernel.db.school.create({ data: { tenantId, name: 'CMS Builder School' } });
      schoolId = school.id;

      const role = await kernel.db.role.create({ data: { tenantId, name: 'ADMIN' } });
      const uniqueSuffix = Date.now().toString();
      const user = await kernel.db.user.create({ data: { email: `cms-builder-${uniqueSuffix}@e2e.test` } });
      
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
    if (tenantId) {
      await tenantContext.run({ tenantId }, async () => {
        await kernel.db.userSchoolAccess.deleteMany({ where: { schoolId } });
        await kernel.db.userTenantMembership.deleteMany({ where: { tenantId } });
        await kernel.db.school.deleteMany({ where: { tenantId } });
      });
      await kernel.db.tenant.delete({ where: { id: tenantId } });
    }
    await app.close();
  });

  it('POST /v1/cms/builder/events should create a new event successfully', async () => {
    const payload = { title: 'Sports Day', description: 'Annual sports day', eventDate: '2027-01-01T00:00:00Z', location: 'Main Field' };
    const res = await request(app.getHttpServer())
      .post('/v1/cms/builder/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .send(payload)
      .expect(201);
      
    expect(res.body.title).toBe('Sports Day');
    expect(res.body.tenantId).toBe(tenantId);
    expect(res.body.schoolId).toBe(schoolId);
  });

  it('POST /v1/cms/builder/blog should create a new blog post', async () => {
    const payload = { title: 'First Post', slug: `first-post-${Date.now()}`, content: 'Hello world', excerpt: 'Welcome' };
    const res = await request(app.getHttpServer())
      .post('/v1/cms/builder/blog')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .send(payload)
      .expect(201);
      
    expect(res.body.slug).toContain('first-post');
    expect(res.body.tenantId).toBe(tenantId);
    expect(res.body.schoolId).toBe(schoolId);
  });

  it('PUT /v1/cms/admin/config should save separate typed themePayload and layoutPayload', async () => {
    // initialize config
    await request(app.getHttpServer())
      .get('/v1/cms/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .expect(200);

    const payload = {
      expectedVersion: 1,
      status: 'DRAFT',
      enableAdmissionsCta: true,
      themePayload: {
        fontFamily: 'Inter',
        headingFontFamily: 'Roboto',
        baseFontSize: '16px',
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        backgroundColor: '#fafafa',
        textColor: '#333333'
      },
      layoutPayload: {
        hero: { id: 'hero', enabled: true, order: 1 },
        about: { id: 'about', enabled: true, order: 2 },
        events: { id: 'events', enabled: true, order: 3 },
        gallery: { id: 'gallery', enabled: true, order: 4 },
        leadership: { id: 'leadership', enabled: true, order: 5 },
        blog: { id: 'blog', enabled: true, order: 6 },
        announcements: { id: 'announcements', enabled: true, order: 7 },
        contact: { id: 'contact', enabled: true, order: 8 },
        footer: { id: 'footer', enabled: true, order: 9 }
      }
    };
    
    // Config creation might be implicitly handled by service or we update the initial record
    const res = await request(app.getHttpServer())
      .put('/v1/cms/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .send(payload)
      .expect(200);

    expect(res.body.themePayload).toBeDefined();
    expect(res.body.themePayload.primaryColor).toBe('#000000');
    expect(res.body.layoutPayload).toBeDefined();
    expect(res.body.layoutPayload.hero.id).toBe('hero');
  });

  it('POST /v1/cms/builder/events should reject invalid mediaId from another tenant', async () => {
    const maliciousTenant = await kernel.db.tenant.create({ data: { name: 'Malicious', slug: `malicious-${Date.now()}` } });
    
    let externalMedia: any;
    let maliciousSchool: any;
    
    await tenantContext.run({ tenantId: maliciousTenant.id }, async () => {
      maliciousSchool = await kernel.db.school.create({ data: { tenantId: maliciousTenant.id, name: 'Malicious School' } });
      const maliciousAdmin = await kernel.db.user.create({ data: { email: `malicious-${Date.now()}@e2e.test` } });
      
      // Create media belonging to the malicious tenant
      externalMedia = await kernel.db.cmsMedia.create({
        data: {
          tenantId: maliciousTenant.id,
          schoolId: maliciousSchool.id,
          authorId: maliciousAdmin.id,
          filename: 'image.jpg',
          mimeType: 'image/jpeg',
          data: Buffer.from('')
        }
      });
    });

    // Try to create an event in OUR tenant using the malicious tenant's media
    const payload = { title: 'Hacked Event', description: 'desc', eventDate: '2027-01-01T00:00:00Z', featuredMediaId: externalMedia.id };
    await request(app.getHttpServer())
      .post('/v1/cms/builder/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .send(payload)
      .expect(400);

    await tenantContext.run({ tenantId: maliciousTenant.id }, async () => {
      await kernel.db.cmsMedia.deleteMany({ where: { tenantId: maliciousTenant.id } });
      await kernel.db.school.deleteMany({ where: { tenantId: maliciousTenant.id } });
    });
    await kernel.db.tenant.delete({ where: { id: maliciousTenant.id } });
  });

  it('GET /v1/public/cms/:slug/resolve should return saved layout, theme, and related data', async () => {
    // We already saved config in a previous step, but let's ensure it's published to resolve
    // Fetch current config to get correct version
    const getRes = await request(app.getHttpServer())
      .get('/v1/cms/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .expect(200);

    const payload = {
      expectedVersion: getRes.body.version,
      status: 'PUBLISHED',
      publishAction: 'PUBLISH',
      publicSlug: 'e2e-test-school',
      enableAdmissionsCta: true,
      themePayload: {
        fontFamily: 'Inter',
        headingFontFamily: 'Roboto',
        baseFontSize: '16px',
        primaryColor: '#aabbcc',
        secondaryColor: '#ffffff',
        backgroundColor: '#fafafa',
        textColor: '#333333'
      },
      layoutPayload: {
        hero: { id: 'hero', enabled: true, order: 2 },
        about: { id: 'about', enabled: false, order: 1 },
        events: { id: 'events', enabled: true, order: 3 },
        gallery: { id: 'gallery', enabled: true, order: 4 },
        leadership: { id: 'leadership', enabled: true, order: 5 },
        blog: { id: 'blog', enabled: true, order: 6 },
        announcements: { id: 'announcements', enabled: true, order: 7 },
        contact: { id: 'contact', enabled: true, order: 8 },
        footer: { id: 'footer', enabled: true, order: 9 }
      }
    };
    
    // Config creation might be implicitly handled by service or we update the initial record
    const putRes = await request(app.getHttpServer())
      .put('/v1/cms/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .send(payload);
    
    if (putRes.status !== 200) {
      console.log('PUT config error:', putRes.body);
    }
    expect(putRes.status).toBe(200);

    // Fetch public site data
    let publicSlug: string;
    await tenantContext.run({ tenantId }, async () => {
      const school = await kernel.db.school.findUnique({ where: { id: schoolId } });
      publicSlug = school?.publicSlug || '';
    });

    const res = await request(app.getHttpServer())
      .get(`/v1/public/cms/${publicSlug}/resolve`)
      .expect(200);

    // Verify config properties
    expect(res.body.config).toBeDefined();
    expect(res.body.config.themePayload.primaryColor).toBe('#aabbcc');
    expect(res.body.config.layoutPayload.hero.order).toBe(2);
    expect(res.body.config.layoutPayload.about.enabled).toBe(false);

    // Verify related data sets are returned
    expect(res.body.events).toBeInstanceOf(Array);
    expect(res.body.blogPosts).toBeInstanceOf(Array);
    expect(res.body.gallery).toBeInstanceOf(Array);
    expect(res.body.staff).toBeInstanceOf(Array);
  });

});
