import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

jest.mock('@saas/core-platform', () => {
  const original = jest.requireActual('@saas/core-platform');
  return {
    ...original,
    kernel: {
      db: {
        userTenantMembership: { findUnique: jest.fn() },
        school: { findUnique: jest.fn(), findFirst: jest.fn() },
        publishedAdmissionForm: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
        applicant: { create: jest.fn() },
        admissionApplication: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
        admissionReview: { create: jest.fn() },
        userSchoolAccess: { findFirst: jest.fn() },
        campus: { findFirst: jest.fn() },
      },
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
      $transaction: jest.fn((cb) => cb(kernelMockTx)),
    },
  };
});

const kernelMockTx = {
  applicant: { create: jest.fn() },
  admissionApplication: { create: jest.fn(), update: jest.fn() },
  admissionReview: { create: jest.fn() },
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
};

import { kernel } from '@saas/core-platform';
import { JwtService } from '@nestjs/jwt';
import { ApplicationStatus } from '@saas/core-platform';

describe('AdmissionsController & PublicAdmissionsController (HTTP E2E)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let validToken: string;

  const TENANT_ID = 't1';
  const PUBLIC_TOKEN = 'pub_123';
  const FORM_ID = 'form_1';
  const APP_ID = 'app_1';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }));
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    validToken = await jwtService.signAsync({ sub: 'user_1' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (kernel.db.userTenantMembership.findUnique as jest.Mock).mockResolvedValue({ id: 'm1', userId: 'user_1', tenantId: TENANT_ID, roleId: 'r1' });
  });

  describe('Public Endpoints', () => {
    it('GET /public/admissions/forms/:publicToken - retrieves form data', async () => {
      (kernel.$queryRaw as jest.Mock).mockResolvedValue([{ tenantId: TENANT_ID }]);
      (kernel.db.publishedAdmissionForm.findFirst as jest.Mock).mockResolvedValue({
        id: FORM_ID,
        title: 'Form 1',
        fieldsSchema: {},
        isActive: true,
      });

      const res = await request(app.getHttpServer())
        .get(`/public/admissions/forms/${PUBLIC_TOKEN}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Form 1');
    });

    it('POST /public/admissions/applications/:publicToken - submits application', async () => {
      (kernel.$queryRaw as jest.Mock).mockResolvedValue([{ tenantId: TENANT_ID }]);
      (kernel.db.publishedAdmissionForm.findFirst as jest.Mock).mockResolvedValue({
        id: FORM_ID, tenantId: TENANT_ID, schoolId: 's1', isActive: true,
        fieldsSchema: { custom: { type: 'string' } }
      });
      (kernelMockTx.applicant.create as jest.Mock).mockResolvedValue({ id: 'appc_1' });
      (kernelMockTx.admissionApplication.create as jest.Mock).mockResolvedValue({
        id: APP_ID, trackingToken: 'trk_123'
      });

      const res = await request(app.getHttpServer())
        .post(`/public/admissions/applications/${PUBLIC_TOKEN}`)
        .send({
          applicant: { firstName: 'Test', lastName: 'App', gender: 'MALE' },
          formData: { custom: 'value' }
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.trackingToken).toBe('trk_123');
    });
  });

  describe('Authenticated Endpoints', () => {
    it('GET /api/v1/admissions/applications - lists applications requires x-school-id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admissions/applications')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .expect(400);

      expect(res.body.message).toContain('school workspace context is required');
    });

    it('GET /api/v1/admissions/applications - lists applications with authorized school', async () => {
      (kernel.db.school.findFirst as jest.Mock).mockResolvedValue({ id: 'school_A', tenantId: TENANT_ID });
      (kernel.db.userSchoolAccess.findFirst as jest.Mock).mockResolvedValue({ userId: 'user_1', schoolId: 'school_A' });
      (kernel.db.admissionApplication.findMany as jest.Mock).mockResolvedValue([
        { id: APP_ID, status: ApplicationStatus.SUBMITTED }
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admissions/applications')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .set('x-school-id', 'school_A')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/v1/admissions/forms/publish - denies if body.schoolId differs from authorized x-school-id', async () => {
      (kernel.db.school.findFirst as jest.Mock).mockResolvedValue({ id: 'school_A', tenantId: TENANT_ID });
      (kernel.db.userSchoolAccess.findFirst as jest.Mock).mockResolvedValue({ userId: 'user_1', schoolId: 'school_A' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/admissions/forms/publish')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .set('x-school-id', 'school_A')
        .send({
          title: 'Form',
          schoolId: 'school_B', // MALICIOUS
          academicYearId: 'ay_1',
          targetClassId: 'tc_1',
          fieldsSchema: {},
          workflowStages: []
        })
        .expect(403);
      
      expect(res.body.message).toContain('You are not authorized to publish a form for the requested school');
    });

    it('POST /api/v1/admissions/forms/publish - denies invalid fieldsSchema type', async () => {
      (kernel.db.school.findFirst as jest.Mock).mockResolvedValue({ id: 'school_A', tenantId: TENANT_ID });
      (kernel.db.userSchoolAccess.findFirst as jest.Mock).mockResolvedValue({ userId: 'user_1', schoolId: 'school_A' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/admissions/forms/publish')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .set('x-school-id', 'school_A')
        .send({
          title: 'Form',
          schoolId: 'school_A',
          academicYearId: 'ay_1',
          targetClassId: 'tc_1',
          fieldsSchema: { custom: { type: 'executable_code' } }, // INVALID
          workflowStages: []
        })
        .expect(400);

      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringContaining('fieldsSchema must be a valid record of field definitions')]));
    });

    it('POST /api/v1/admissions/forms/publish - succeeds with authorized x-school-id and valid schema', async () => {
      (kernel.db.school.findFirst as jest.Mock).mockResolvedValue({ id: 'school_A', tenantId: TENANT_ID });
      (kernel.db.userSchoolAccess.findFirst as jest.Mock).mockResolvedValue({ userId: 'user_1', schoolId: 'school_A' });
      (kernel.db.publishedAdmissionForm.create as jest.Mock).mockResolvedValue({ id: 'form_123', publicToken: 'pub_abc' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/admissions/forms/publish')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .set('x-school-id', 'school_A')
        .send({
          title: 'Form',
          schoolId: 'school_A', // LEGITIMATE
          academicYearId: 'ay_1',
          targetClassId: 'tc_1',
          fieldsSchema: {
            customText: { type: 'string', maxLength: 100 },
            customSelect: { type: 'select', options: ['A', 'B'] }
          },
          workflowStages: [{ key: 'STAGE_1', label: 'Stage 1' }]
        })
        .expect(201);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('form_123');
    });
  });
});
