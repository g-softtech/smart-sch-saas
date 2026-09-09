import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import * as argon2 from 'argon2';
import { JwtAuthGuard } from '../src/modules/identity/security/jwt-auth.guard';
import { WorkspaceContextInterceptor } from '../src/modules/identity/interceptors/workspace-context.interceptor';
import { PoliciesGuard } from '../src/modules/identity/security/policies.guard';
import { RequirePermission } from '../src/modules/identity/security/require-permission.decorator';

// Mock PlatformKernel
jest.mock('@saas/core-platform', () => {
  const original = jest.requireActual('@saas/core-platform');
  return {
    ...original,
    kernel: {
      db: {
        user: { findUnique: jest.fn() },
        tenant: { findUnique: jest.fn() },
        role: { findUnique: jest.fn(), findFirst: jest.fn() },
        permission: { findUnique: jest.fn() },
        rolePermission: { findMany: jest.fn() },
        userTenantMembership: { findFirst: jest.fn(), findUnique: jest.fn() },
      }
    }
  };
});
import { kernel } from '@saas/core-platform';

// Dummy controller to test RBAC and Interceptors
@Controller('test')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UseInterceptors(WorkspaceContextInterceptor)
class TestController {
  @Get('protected')
  @RequirePermission('test:read')
  getProtected() {
    return { success: true };
  }
}

describe('Identity & Security (e2e)', () => {
  let app: INestApplication;
  let validToken: string;

  const testUser = { id: 'u1', email: 'test@school.edu', globalRole: 'USER', passwordHash: '' };
  const testTenant = { id: 't1', name: 'Test School', slug: 'test-school' };
  const testRole = { id: 'r1', tenantId: testTenant.id, name: 'ADMIN', isSystem: false };
  const testMembership = { id: 'm1', userId: testUser.id, tenantId: testTenant.id, roleId: testRole.id };

  beforeAll(async () => {
    testUser.passwordHash = await argon2.hash('Password123!');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('/api/v1/auth/login (POST) - success', async () => {
    (kernel.db.user.findUnique as jest.Mock).mockResolvedValue(testUser);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@school.edu', password: 'Password123!' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    validToken = res.body.data.accessToken;
  });

  it('/api/v1/auth/login (POST) - invalid password', async () => {
    (kernel.db.user.findUnique as jest.Mock).mockResolvedValue(testUser);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@school.edu', password: 'WrongPassword!' })
      .expect(401);
  });

  it('/test/protected (GET) - invalid/expired JWT', async () => {
    await request(app.getHttpServer())
      .get('/test/protected')
      .set('Authorization', 'Bearer invalid.token.here')
      .set('x-tenant-id', testTenant.id)
      .expect(401);
  });

  it('/test/protected (GET) - missing tenant selector', async () => {
    await request(app.getHttpServer())
      .get('/test/protected')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(400); // BadRequestException
  });

  it('/test/protected (GET) - unauthorized tenant selection', async () => {
    (kernel.db.userTenantMembership.findUnique as jest.Mock).mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/test/protected')
      .set('Authorization', `Bearer ${validToken}`)
      .set('x-tenant-id', 'unauthorized-tenant')
      .expect(403); // ForbiddenException
  });

  it('/test/protected (GET) - valid tenant membership & RBAC allowed', async () => {
    (kernel.db.userTenantMembership.findUnique as jest.Mock).mockResolvedValue(testMembership);
    (kernel.db.role.findFirst as jest.Mock).mockResolvedValue({
      ...testRole,
      permissions: [{ permission: { name: 'test:read' } }]
    });

    await request(app.getHttpServer())
      .get('/test/protected')
      .set('Authorization', `Bearer ${validToken}`)
      .set('x-tenant-id', testTenant.id)
      .expect(200);
  });

  it('/test/protected (GET) - RBAC denied permission', async () => {
    (kernel.db.userTenantMembership.findUnique as jest.Mock).mockResolvedValue(testMembership);
    (kernel.db.role.findFirst as jest.Mock).mockResolvedValue({
      ...testRole,
      permissions: [] // No permissions
    });

    await request(app.getHttpServer())
      .get('/test/protected')
      .set('Authorization', `Bearer ${validToken}`)
      .set('x-tenant-id', testTenant.id)
      .expect(403); // ForbiddenException
  });
});
