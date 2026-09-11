import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER / HTTP TEST: StudentsController (mocked kernel)
//
// Test type: HTTP E2E tests with mocked PlatformKernel DB.
// These tests verify HTTP contracts, authentication enforcement, request
// validation, and response envelope shape.
// They do NOT connect to a real PostgreSQL database.
// Business-logic invariants are covered by the unit tests in students.service.spec.ts.
// ─────────────────────────────────────────────────────────────────────────────

// Mock PlatformKernel — same pattern as identity.e2e-spec.ts
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
        school: { findUnique: jest.fn(), findFirst: jest.fn() },
        student: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
        guardian: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
        studentGuardian: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
        enrollment: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
        academicYear: { findFirst: jest.fn() },
        class: { findFirst: jest.fn() },
        arm: { findFirst: jest.fn() },
      },
      $queryRaw: jest.fn(),
      $transaction: jest.fn(),
    },
  };
});

import { kernel } from '@saas/core-platform';
import { JwtService } from '@nestjs/jwt';

describe('StudentsController (HTTP/E2E — mocked kernel)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let validToken: string;

  const TENANT_ID = 'a0000000-0000-4000-8000-000000000001';
  const SCHOOL_ID = 'b0000000-0000-4000-8000-000000000001';
  const STUDENT_ID = 'c0000000-0000-4000-8000-000000000001';
  const GUARDIAN_ID = 'd0000000-0000-4000-8000-000000000001';
  const ENROLLMENT_ID = 'e0000000-0000-4000-8000-000000000001';
  const YEAR_ID = 'f0000000-0000-4000-8000-000000000001';
  const CLASS_ID = '10000000-0000-4000-8000-000000000001';

  const testMembership = { id: 'm1', userId: 'u1', tenantId: TENANT_ID, roleId: 'r1' };

  const mockSchool = { id: SCHOOL_ID, tenantId: TENANT_ID, name: 'Test School' };
  const mockStudent = {
    id: STUDENT_ID, tenantId: TENANT_ID, schoolId: SCHOOL_ID,
    studentNumber: 'STU-0001', firstName: 'Ada', lastName: 'Okonkwo',
    gender: 'FEMALE', status: 'ACTIVE', admissionDate: new Date('2026-09-01'),
  };
  const mockGuardian = { id: GUARDIAN_ID, tenantId: TENANT_ID, firstName: 'Emeka', lastName: 'Okonkwo' };
  const mockEnrollment = {
    id: ENROLLMENT_ID, tenantId: TENANT_ID, studentId: STUDENT_ID,
    schoolId: SCHOOL_ID, academicYearId: YEAR_ID, classId: CLASS_ID,
    status: 'ACTIVE', enrolledAt: new Date(),
  };

  const validCreateStudentBody = {
    schoolId: SCHOOL_ID,
    firstName: 'Ada',
    lastName: 'Okonkwo',
    gender: 'FEMALE',
    admissionDate: '2026-09-01',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Enable validation pipe — same as production
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }));
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    validToken = await jwtService.signAsync({ sub: 'u1' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: membership resolves for all requests that need it
    (kernel.db.userTenantMembership.findUnique as jest.Mock).mockResolvedValue(testMembership);
  });

  // ─── Authentication enforcement ────────────────────────────────────────────

  describe('Authentication', () => {
    it('POST /api/v1/students — rejects missing JWT (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/students')
        .send(validCreateStudentBody)
        .expect(401);
    });

    it('GET /api/v1/students — rejects missing JWT (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/students')
        .expect(401);
    });

    it('POST /api/v1/students — rejects invalid JWT (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', 'Bearer invalid.token.value')
        .set('x-tenant-id', TENANT_ID)
        .send(validCreateStudentBody)
        .expect(401);
    });
  });

  // ─── Workspace context enforcement ────────────────────────────────────────

  describe('Workspace context', () => {
    it('POST /api/v1/students — rejects missing x-tenant-id (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validCreateStudentBody)
        .expect(400);
    });

    it('POST /api/v1/students — rejects non-member tenant (403)', async () => {
      (kernel.db.userTenantMembership.findUnique as jest.Mock).mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', 'unauthorized-tenant-id')
        .send(validCreateStudentBody)
        .expect(403);
    });
  });

  // ─── DTO validation ────────────────────────────────────────────────────────

  describe('DTO validation', () => {
    it('POST /api/v1/students — rejects missing firstName (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .send({ schoolId: SCHOOL_ID, lastName: 'Okonkwo', gender: 'FEMALE', admissionDate: '2026-09-01' })
        .expect(400);
    });

    it('POST /api/v1/students — rejects invalid gender enum (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .send({ ...validCreateStudentBody, gender: 'UNKNOWN' })
        .expect(400);
    });

    it('POST /api/v1/students — rejects non-UUID schoolId (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .send({ ...validCreateStudentBody, schoolId: 'not-a-uuid' })
        .expect(400);
    });

    it('POST /api/v1/students/:id/enrollments — rejects non-UUID academicYearId (400)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/students/${STUDENT_ID}/enrollments`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .send({ academicYearId: 'bad', classId: CLASS_ID })
        .expect(400);
    });

    it('POST /api/v1/students/:id/guardians/link — rejects invalid relationship enum (400)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/students/${STUDENT_ID}/guardians/link`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .send({ guardianId: GUARDIAN_ID, relationship: 'SIBLING' })
        .expect(400);
    });
  });

  // ─── Student endpoints ─────────────────────────────────────────────────────

  describe('Student CRUD', () => {
    it('POST /api/v1/students — creates student successfully (201)', async () => {
      (kernel.db.school.findUnique as jest.Mock).mockResolvedValue(mockSchool);
      (kernel.$queryRaw as jest.Mock).mockResolvedValue([{ lastNumber: 1 }]);
      (kernel.db.student.create as jest.Mock).mockResolvedValue(mockStudent);

      const res = await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .send(validCreateStudentBody)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(STUDENT_ID);
      expect(res.body.data.studentNumber).toBe('STU-0001');
    });

    it('POST /api/v1/students — returns 400 when school not found (cross-tenant)', async () => {
      (kernel.db.school.findUnique as jest.Mock).mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .send(validCreateStudentBody)
        .expect(400);
    });

    it('GET /api/v1/students — lists students with pagination envelope (200)', async () => {
      (kernel.db.student.findMany as jest.Mock).mockResolvedValue([mockStudent]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 1 });
    });

    it('GET /api/v1/students/:id — returns student (200)', async () => {
      (kernel.db.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/students/${STUDENT_ID}`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(STUDENT_ID);
    });

    it('GET /api/v1/students/:id — returns 400 when not found (cross-tenant)', async () => {
      (kernel.db.student.findUnique as jest.Mock).mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(`/api/v1/students/${STUDENT_ID}`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .expect(400);
    });

    it('GET /api/v1/students/:id — returns 400 for non-existent student (service not-found)', async () => {
      (kernel.db.student.findUnique as jest.Mock).mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(`/api/v1/students/${STUDENT_ID}`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .expect(400);
    });
  });

  // ─── Guardian endpoints ────────────────────────────────────────────────────

  describe('Guardian management', () => {
    it('POST /api/v1/students/guardians — creates guardian (201)', async () => {
      (kernel.db.guardian.create as jest.Mock).mockResolvedValue(mockGuardian);

      const res = await request(app.getHttpServer())
        .post('/api/v1/students/guardians')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .send({ firstName: 'Emeka', lastName: 'Okonkwo' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(GUARDIAN_ID);
    });

    it('POST /api/v1/students/:id/guardians/link — links guardian (201)', async () => {
      (kernel.db.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (kernel.db.guardian.findUnique as jest.Mock).mockResolvedValue(mockGuardian);
      (kernel.db.studentGuardian.findFirst as jest.Mock).mockResolvedValue(null);
      (kernel.db.studentGuardian.create as jest.Mock).mockResolvedValue({
        id: 'sg-1', studentId: STUDENT_ID, guardianId: GUARDIAN_ID, relationship: 'FATHER',
      });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/students/${STUDENT_ID}/guardians/link`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .send({ guardianId: GUARDIAN_ID, relationship: 'FATHER' })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/students/:id/guardians/link — rejects duplicate link (409)', async () => {
      (kernel.db.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (kernel.db.guardian.findUnique as jest.Mock).mockResolvedValue(mockGuardian);
      (kernel.db.studentGuardian.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

      await request(app.getHttpServer())
        .post(`/api/v1/students/${STUDENT_ID}/guardians/link`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .send({ guardianId: GUARDIAN_ID, relationship: 'FATHER' })
        .expect(409);
    });

    it('GET /api/v1/students/:id/guardians — lists student guardians (200)', async () => {
      (kernel.db.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (kernel.db.studentGuardian.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/students/${STUDENT_ID}/guardians`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── Enrollment endpoints ──────────────────────────────────────────────────

  describe('Enrollment management', () => {
    it('POST /api/v1/students/:id/enrollments — creates enrollment (201)', async () => {
      (kernel.db.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (kernel.db.academicYear.findFirst as jest.Mock).mockResolvedValue({ id: YEAR_ID, tenantId: TENANT_ID, schoolId: SCHOOL_ID });
      (kernel.db.class.findFirst as jest.Mock).mockResolvedValue({ id: CLASS_ID, tenantId: TENANT_ID, schoolId: SCHOOL_ID });
      (kernel.db.enrollment.findFirst as jest.Mock).mockResolvedValue(null);
      (kernel.db.enrollment.create as jest.Mock).mockResolvedValue(mockEnrollment);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/students/${STUDENT_ID}/enrollments`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .send({ academicYearId: YEAR_ID, classId: CLASS_ID })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(ENROLLMENT_ID);
      expect(res.body.data.status).toBe('ACTIVE');
    });

    it('POST /api/v1/students/:id/enrollments — rejects duplicate ACTIVE enrollment (409)', async () => {
      (kernel.db.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (kernel.db.academicYear.findFirst as jest.Mock).mockResolvedValue({ id: YEAR_ID, tenantId: TENANT_ID, schoolId: SCHOOL_ID });
      (kernel.db.class.findFirst as jest.Mock).mockResolvedValue({ id: CLASS_ID, tenantId: TENANT_ID, schoolId: SCHOOL_ID });
      (kernel.db.enrollment.findFirst as jest.Mock).mockResolvedValue(mockEnrollment); // existing active

      await request(app.getHttpServer())
        .post(`/api/v1/students/${STUDENT_ID}/enrollments`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .send({ academicYearId: YEAR_ID, classId: CLASS_ID })
        .expect(409);
    });

    it('GET /api/v1/students/:id/enrollments — lists all enrollment history (200)', async () => {
      (kernel.db.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (kernel.db.enrollment.findMany as jest.Mock).mockResolvedValue([mockEnrollment]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/students/${STUDENT_ID}/enrollments`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('POST .../transfer — performs internal transfer (201)', async () => {
      const activeEnrollment = { ...mockEnrollment, status: 'ACTIVE', schoolId: SCHOOL_ID, studentId: STUDENT_ID, academicYearId: YEAR_ID };
      const newClassId = '20000000-0000-4000-8000-000000000002';
      (kernel.db.enrollment.findUnique as jest.Mock).mockResolvedValue(activeEnrollment);
      (kernel.db.class.findFirst as jest.Mock).mockResolvedValue({ id: newClassId, schoolId: SCHOOL_ID });
      (kernel.$transaction as jest.Mock).mockResolvedValue({ id: 'enr-2', status: 'ACTIVE', classId: newClassId });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/students/${STUDENT_ID}/enrollments/${ENROLLMENT_ID}/transfer`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .send({ newClassId })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('POST .../withdraw — withdraws student (200)', async () => {
      const activeEnrollment = { ...mockEnrollment, status: 'ACTIVE', studentId: STUDENT_ID };
      (kernel.db.enrollment.findUnique as jest.Mock).mockResolvedValue(activeEnrollment);
      (kernel.db.student.findUnique as jest.Mock).mockResolvedValue(mockStudent);
      (kernel.db.enrollment.update as jest.Mock).mockResolvedValue({ ...activeEnrollment, status: 'WITHDRAWN' });
      (kernel.db.student.update as jest.Mock).mockResolvedValue({ ...mockStudent, status: 'WITHDRAWN' });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/students/${STUDENT_ID}/enrollments/${ENROLLMENT_ID}/withdraw`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', TENANT_ID)
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
