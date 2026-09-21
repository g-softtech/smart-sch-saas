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
        admissionApplication: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
        admissionReview: { create: jest.fn() },
        userSchoolAccess: { findFirst: jest.fn() },
        campus: { findFirst: jest.fn() },
        paymentTransaction: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
        admissionExam: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      },
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
      $transaction: jest.fn((cb) => cb(kernelMockTx)),
    },
  };
});

const kernelMockTx = {
  applicant: { create: jest.fn() },
  admissionApplication: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  admissionReview: { create: jest.fn() },
  paymentTransaction: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  admissionExam: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
};

import { kernel } from '@saas/core-platform';
import { JwtService } from '@nestjs/jwt';
import { ApplicationStatus } from '@saas/core-platform';
import { PaystackAdapter } from '../src/modules/payments/providers/paystack.adapter';
import * as crypto from 'crypto';

describe('Payments & Exams E2E', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let validToken: string;
  let paystackAdapter: PaystackAdapter;

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
    paystackAdapter = moduleFixture.get<PaystackAdapter>(PaystackAdapter);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (kernel.db.userTenantMembership.findUnique as jest.Mock).mockResolvedValue({ id: 'm1', userId: 'user_1', tenantId: TENANT_ID, roleId: 'r1' });
    (kernel.db.school.findFirst as jest.Mock).mockResolvedValue({ id: 'school_A', tenantId: TENANT_ID });
    (kernel.db.userSchoolAccess.findFirst as jest.Mock).mockResolvedValue({ userId: 'user_1', schoolId: 'school_A' });
  });

  describe('Payments (Phase 3A.5)', () => {
    it('paid application starts as PENDING_PAYMENT', async () => {
      (kernel.$queryRaw as jest.Mock).mockResolvedValue([{ tenantId: TENANT_ID }]);
      (kernel.db.publishedAdmissionForm.findFirst as jest.Mock).mockResolvedValue({
        id: FORM_ID, tenantId: TENANT_ID, schoolId: 'school_A', isActive: true,
        fieldsSchema: {}, applicationFee: 5000, currency: 'NGN'
      });
      (kernelMockTx.applicant.create as jest.Mock).mockResolvedValue({ id: 'appc_1', email: 'test@mail.com' });
      (kernelMockTx.admissionApplication.create as jest.Mock).mockResolvedValue({
        id: APP_ID, trackingToken: 'trk_123', status: ApplicationStatus.PENDING_PAYMENT
      });
      
      jest.spyOn(paystackAdapter, 'initializeTransaction').mockResolvedValue({ authorization_url: 'http://paystack.url', access_code: 'abc', reference: 'ref_123' });

      const res = await request(app.getHttpServer())
        .post(`/public/admissions/applications/${PUBLIC_TOKEN}`)
        .send({
          applicant: { firstName: 'Test', lastName: 'App', email: 'test@mail.com', gender: 'MALE' },
          formData: {}
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ApplicationStatus.PENDING_PAYMENT);
      expect(res.body.data.payment.authorizationUrl).toBe('http://paystack.url');
    });

    it('free application becomes SUBMITTED directly', async () => {
      (kernel.$queryRaw as jest.Mock).mockResolvedValue([{ tenantId: TENANT_ID }]);
      (kernel.db.publishedAdmissionForm.findFirst as jest.Mock).mockResolvedValue({
        id: FORM_ID, tenantId: TENANT_ID, schoolId: 'school_A', isActive: true,
        fieldsSchema: {}, applicationFee: 0, currency: 'NGN'
      });
      (kernelMockTx.applicant.create as jest.Mock).mockResolvedValue({ id: 'appc_1', email: 'test@mail.com' });
      (kernelMockTx.admissionApplication.create as jest.Mock).mockResolvedValue({
        id: APP_ID, trackingToken: 'trk_123', status: ApplicationStatus.SUBMITTED
      });
      
      const res = await request(app.getHttpServer())
        .post(`/public/admissions/applications/${PUBLIC_TOKEN}`)
        .send({
          applicant: { firstName: 'Test', lastName: 'App', email: 'test@mail.com', gender: 'MALE' },
          formData: {}
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ApplicationStatus.SUBMITTED);
      expect(res.body.data.payment).toBeUndefined();
    });

    it('webhook signature is rejected if invalid', async () => {
      const payload = { event: 'charge.success' };
      const res = await request(app.getHttpServer())
        .post('/public/webhooks/paystack')
        .set('x-paystack-signature', 'invalid_signature')
        .send(payload)
        .expect(401);
      
      expect(res.body.message).toContain('Invalid signature');
    });

    it('successful webhook transitions PENDING_PAYMENT to SUBMITTED', async () => {
      const payload = { 
        event: 'charge.success', 
        data: { reference: 'ref_123', metadata: { trackingToken: 'trk_123' }, amount: 500000, currency: 'NGN' } 
      };
      
      const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || 'sk_test_placeholder')
        .update(JSON.stringify(payload)).digest('hex');

      // Mock verify logic
      (kernelMockTx.paymentTransaction.findUnique as jest.Mock).mockResolvedValue({
        id: 'pt_1', amount: 5000, currency: 'NGN', status: 'PENDING',
        application: { id: APP_ID, trackingToken: 'trk_123', status: ApplicationStatus.PENDING_PAYMENT, tenantId: TENANT_ID, applicantId: 'a1', applicant: { firstName: 'A', email: 'e' } }
      });
      
      jest.spyOn(paystackAdapter, 'verifyTransaction').mockResolvedValue({
        status: true,
        message: 'success',
        data: { status: 'success', amount: 500000, currency: 'NGN' } as any
      });

      (kernelMockTx.paymentTransaction.update as jest.Mock).mockResolvedValue({});
      (kernelMockTx.admissionApplication.findUnique as jest.Mock).mockResolvedValue({
        id: APP_ID, status: ApplicationStatus.PENDING_PAYMENT, tenantId: TENANT_ID, applicantId: 'a1', applicant: { firstName: 'A', email: 'e' }
      });
      (kernelMockTx.admissionApplication.update as jest.Mock).mockResolvedValue({ id: APP_ID, status: ApplicationStatus.SUBMITTED, tenantId: TENANT_ID, applicantId: 'a1', applicant: { firstName: 'A', email: 'e' } });

      const res = await request(app.getHttpServer())
        .post('/public/webhooks/paystack')
        .set('x-paystack-signature', hash)
        .send(payload)
        .expect(200);

      expect(kernelMockTx.paymentTransaction.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'SUCCESS' } }));
      expect(kernelMockTx.admissionApplication.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: ApplicationStatus.SUBMITTED } }));
    });
  });

  describe('Exams (Phase 3B)', () => {
    it('authorized staff can schedule an exam', async () => {
      (kernel.db.admissionApplication.findFirst as jest.Mock).mockResolvedValue({ id: APP_ID, schoolId: 'school_A', status: ApplicationStatus.SUBMITTED, applicant: { firstName: 'John', lastName: 'Doe', email: 'test@mail.com' } });
      (kernel.db.admissionExam.findUnique as jest.Mock).mockResolvedValue(null);
      (kernelMockTx.admissionExam.create as jest.Mock).mockResolvedValue({ id: 'exam_1' });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/admissions/applications/${APP_ID}/exam`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .set('x-school-id', 'school_A')
        .send({ examDate: new Date().toISOString(), venue: 'Hall A' })
        .expect(201);
      
      expect(res.body.success).toBe(true);
    });

    it('unauthorized school staff cannot schedule exam for another school', async () => {
      (kernel.db.admissionApplication.findFirst as jest.Mock).mockResolvedValue(null); // Denies cross school

      const res = await request(app.getHttpServer())
        .post(`/api/v1/admissions/applications/${APP_ID}/exam`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .set('x-school-id', 'school_A')
        .send({ examDate: new Date().toISOString(), venue: 'Hall A' })
        .expect(404);
    });

    it('valid score update works', async () => {
      (kernel.db.admissionExam.findUnique as jest.Mock).mockResolvedValue({ id: 'exam_1', tenantId: TENANT_ID });
      (kernel.db.admissionExam.update as jest.Mock).mockResolvedValue({ id: 'exam_1', score: 85 });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/admissions/applications/${APP_ID}/exam/update`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .set('x-school-id', 'school_A')
        .send({ score: 85, status: 'COMPLETED' })
        .expect(201);
      
      expect(res.body.success).toBe(true);
    });
  });
});
