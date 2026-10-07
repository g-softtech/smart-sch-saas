import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { kernel, tenantContext, PrismaClient } from "@saas/core-platform";
import { JwtService } from "@nestjs/jwt";

describe("Platform Authorization (e2e)", () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let prisma: PrismaClient;

  const testSuffix = Date.now().toString();
  const globalAdminId = "gadmin-" + testSuffix;
  const ordinaryUserId = "user-" + testSuffix;
  const tenantAdminId = "tadmin-" + testSuffix;
  const tenantId = "tenant-" + testSuffix;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = app.get(JwtService);
    prisma = kernel.db as any;

    // Create a tenant
    await prisma.tenant.create({
      data: { id: tenantId, name: "Test Tenant", slug: "test-slug-" + testSuffix },
    });

    await tenantContext.run({ tenantId }, async () => {
      // Create Global Super Admin
      await prisma.user.create({
        data: {
          id: globalAdminId,
          email: `global-${testSuffix}@test.com`,
          globalRole: "SUPER_ADMIN",
        },
      });

      // Create Ordinary User
      await prisma.user.create({
        data: {
          id: ordinaryUserId,
          email: `user-${testSuffix}@test.com`,
          globalRole: "USER",
        },
      });

      // Create Tenant Admin (tenant-scoped SUPER_ADMIN, but globalRole USER)
      const tenantAdmin = await prisma.user.create({
        data: {
          id: tenantAdminId,
          email: `tadmin-${testSuffix}@test.com`,
          globalRole: "USER",
        },
      });
      
      // Create Role and Membership for Tenant Admin
      const role = await prisma.role.create({
        data: { tenantId, name: "SUPER_ADMIN", isSystem: true },
      });

      await prisma.userTenantMembership.create({
        data: {
          userId: tenantAdminId,
          tenantId: tenantId,
          roleId: role.id,
        },
      });
    });
  });

  afterAll(async () => {
    await tenantContext.run({ tenantId }, async () => {
      await prisma.userTenantMembership.deleteMany({ where: { tenantId } });
      await prisma.role.deleteMany({ where: { tenantId } });
      await prisma.user.deleteMany({
        where: { id: { in: [globalAdminId, ordinaryUserId, tenantAdminId] } },
      });
    });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  const getAuthToken = (userId: string) => {
    return jwtService.sign({ sub: userId });
  };

  it("global SUPER_ADMIN accepted", async () => {
    const token = getAuthToken(globalAdminId);
    return request(app.getHttpServer())
      .get("/api/v1/platform/health")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.boundary).toEqual("platform-super-admin");
      });
  });

  it("ordinary user rejected", async () => {
    const token = getAuthToken(ordinaryUserId);
    return request(app.getHttpServer())
      .get("/api/v1/platform/health")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("tenant-scoped SUPER_ADMIN rejected when globalRole !== SUPER_ADMIN", async () => {
    const token = getAuthToken(tenantAdminId);
    return request(app.getHttpServer())
      .get("/api/v1/platform/health")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", tenantId)
      .expect(403);
  });

  it("missing/invalid authentication rejected", async () => {
    return request(app.getHttpServer())
      .get("/api/v1/platform/health")
      .expect(401);
  });

  it("platform route cannot be authorized merely by supplying x-tenant-id", async () => {
    const token = getAuthToken(ordinaryUserId);
    return request(app.getHttpServer())
      .get("/api/v1/platform/health")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", tenantId)
      .expect(403); // Still rejected despite valid tenant-id
  });

  describe("Platform Read APIs (Metrics & Tenants)", () => {
    it("metrics requires global SUPER_ADMIN", async () => {
      const token = getAuthToken(globalAdminId);
      await request(app.getHttpServer())
        .get("/api/v1/platform/metrics")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const badToken = getAuthToken(tenantAdminId);
      await request(app.getHttpServer())
        .get("/api/v1/platform/metrics")
        .set("Authorization", `Bearer ${badToken}`)
        .expect(403);
    });

    it("tenant list requires global SUPER_ADMIN", async () => {
      const token = getAuthToken(globalAdminId);
      await request(app.getHttpServer())
        .get("/api/v1/platform/tenants")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const badToken = getAuthToken(ordinaryUserId);
      await request(app.getHttpServer())
        .get("/api/v1/platform/tenants")
        .set("Authorization", `Bearer ${badToken}`)
        .expect(403);
    });

    it("tenant detail requires global SUPER_ADMIN", async () => {
      const token = getAuthToken(globalAdminId);
      await request(app.getHttpServer())
        .get(`/api/v1/platform/tenants/${tenantId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const badToken = getAuthToken(tenantAdminId);
      await request(app.getHttpServer())
        .get(`/api/v1/platform/tenants/${tenantId}`)
        .set("Authorization", `Bearer ${badToken}`)
        .expect(403);
    });
  });
});
