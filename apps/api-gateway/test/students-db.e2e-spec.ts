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
        .set('x-school-id', schoolA_id)
        .send({
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
        .set('x-school-id', schoolA_id)
        .send({
          firstName: 'No',
          lastName: 'Auth',
          gender: 'MALE',
          admissionDate: new Date().toISOString(),
        });
      expect(res.status).toBe(401);
    });
  });
  describe('Guardian Concurrency', () => {
    it('should serialize concurrent primary-guardian links preventing duplicates', async () => {
      // 1. Setup Student
      const studentRes = await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', tenantA_id)
        .set('x-school-id', schoolA_id)
        .send({ firstName: 'Race', lastName: 'Condition', gender: 'MALE', admissionDate: new Date().toISOString() });

      expect(studentRes.status).toBe(201);
      const studentId = studentRes.body.data.id;

      // 2. Setup Distinct Guardians natively via Prisma inside tenantContext
      let g1, g2;
      await tenantContext.run({ tenantId: tenantA_id }, async () => {
        g1 = await kernel.db.guardian.create({
          data: { tenantId: tenantA_id, firstName: 'C1', lastName: 'Concurrency' }
        });
        g2 = await kernel.db.guardian.create({
          data: { tenantId: tenantA_id, firstName: 'C2', lastName: 'Concurrency' }
        });
      });

      // 3. Fire Concurrent Link Requests via HTTP (bypassing node.js execution sequence to force DB locking)
      const req1 = request(app.getHttpServer())
        .post(`/api/v1/students/${studentId}/guardians/link`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', tenantA_id)
        .set('x-school-id', schoolA_id)
        .send({ guardianId: g1.id, relationship: 'FATHER', isPrimary: true });

      const req2 = request(app.getHttpServer())
        .post(`/api/v1/students/${studentId}/guardians/link`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', tenantA_id)
        .set('x-school-id', schoolA_id)
        .send({ guardianId: g2.id, relationship: 'MOTHER', isPrimary: true });

      const responses = await Promise.all([req1, req2]);

      // 4. Verify HTTP Expectations
      // Depending on the exact serialization path, both should receive 201 Created.
      // One request will acquire the FOR UPDATE lock, process the link, clear any primary, and commit.
      // The second request will wait at FOR UPDATE, then process the link, clear the primary set by the first, and commit.
      expect(responses[0].status).toBe(201);
      expect(responses[1].status).toBe(201);

      // 5. Verify PostgreSQL Data Invariant
      let links = [];
      await tenantContext.run({ tenantId: tenantA_id }, async () => {
        links = await kernel.db.studentGuardian.findMany({ where: { studentId } });
      });
      const primaryLinks = links.filter(l => l.isPrimary);

      // Both guardians must be linked
      expect(links.length).toBe(2);

      // ONLY ONE MUST BE PRIMARY (Invariant maintained by DB locking and transactional clearPrimaryGuardian)
      expect(primaryLinks.length).toBe(1);
    });
  });

  describe('Guardian Search Pagination', () => {
    beforeAll(async () => {
      // Seed some distinct guardians for search testing and link them to the student so they appear in school scope
      await tenantContext.run({ tenantId: tenantA_id }, async () => {
        const student = await kernel.db.student.create({
          data: {
            tenantId: tenantA_id,
            schoolId: schoolA_id,
            firstName: 'Search',
            lastName: 'Student',
            gender: 'MALE',
            admissionDate: new Date(),
            studentNumber: 'STU-' + Date.now()
          }
        });

        const g1 = await kernel.db.guardian.create({
          data: { tenantId: tenantA_id, firstName: 'Searchable', lastName: 'GuardianOne', email: 'search1@example.com', phone: '0801111111' }
        });
        const g2 = await kernel.db.guardian.create({
          data: { tenantId: tenantA_id, firstName: 'Hidden', lastName: 'GuardianTwo', email: 'hidden@example.com', phone: '0802222222' }
        });
        const g3 = await kernel.db.guardian.create({
          data: { tenantId: tenantA_id, firstName: 'Searchable', lastName: 'GuardianThree', email: 'search3@example.com', phone: '0803333333' }
        });

        await kernel.db.studentGuardian.createMany({
          data: [
            { tenantId: tenantA_id, studentId: student.id, guardianId: g1.id, relationship: 'FATHER', isPrimary: false },
            { tenantId: tenantA_id, studentId: student.id, guardianId: g2.id, relationship: 'MOTHER', isPrimary: false },
            { tenantId: tenantA_id, studentId: student.id, guardianId: g3.id, relationship: 'OTHER', isPrimary: false }
          ]
        });
      });
    });

    it('should return paginated results matching the search query', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/students/guardians/list?search=Searchable&page=1&limit=10`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', tenantA_id)
        .set('x-school-id', schoolA_id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
      expect(res.body.data.every((g: any) => g.firstName === 'Searchable')).toBe(true);
    });

    it('should return empty results for non-matching query', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/students/guardians/list?search=NoMatchForThisQueryXYZ&page=1&limit=10`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', tenantA_id)
        .set('x-school-id', schoolA_id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('Student Profile - Guardians', () => {
    let studentId: string;
    let guardianId: string;

    beforeAll(async () => {
      await tenantContext.run({ tenantId: tenantA_id }, async () => {
        const student = await kernel.db.student.create({
          data: {
            tenantId: tenantA_id,
            schoolId: schoolA_id,
            firstName: 'Profile',
            lastName: 'Student',
            gender: 'MALE',
            admissionDate: new Date(),
            studentNumber: 'STU-PROF-' + Date.now()
          }
        });
        studentId = student.id;

        const g = await kernel.db.guardian.create({
          data: { tenantId: tenantA_id, firstName: 'ProfileGuardian', lastName: 'Okonkwo', email: 'prof@example.com', phone: '0809999999' }
        });
        guardianId = g.id;

        await kernel.db.studentGuardian.create({
          data: { tenantId: tenantA_id, studentId: student.id, guardianId: g.id, relationship: 'FATHER', isPrimary: true }
        });
      });
    });

    it('should return linked guardians with guardian details included', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/students/${studentId}/guardians`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', tenantA_id)
        .set('x-school-id', schoolA_id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);

      const link = res.body.data[0];
      expect(link.relationship).toBe('FATHER');
      expect(link.isPrimary).toBe(true);

      // Verify enrichment
      expect(link.guardian).toBeDefined();
      expect(link.guardian.firstName).toBe('ProfileGuardian');
      expect(link.guardian.lastName).toBe('Okonkwo');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/students/${studentId}/guardians`)
        .set('x-tenant-id', tenantA_id)
        .set('x-school-id', schoolA_id);
      expect(res.status).toBe(401);
    });
  });

  describe('Student Profile - Enrollments', () => {
    let studentId: string;
    let enrollmentId: string;

    beforeAll(async () => {
      await tenantContext.run({ tenantId: tenantA_id }, async () => {
        const student = await kernel.db.student.create({
          data: {
            tenantId: tenantA_id,
            schoolId: schoolA_id,
            firstName: 'Enroll',
            lastName: 'Student',
            gender: 'FEMALE',
            admissionDate: new Date(),
            studentNumber: 'STU-ENR-' + Date.now()
          }
        });
        studentId = student.id;

        const academicYear = await kernel.db.academicYear.create({
          data: { tenantId: tenantA_id, schoolId: schoolA_id, name: '2026/2027' }
        });

        const cls = await kernel.db.class.create({
          data: { tenantId: tenantA_id, schoolId: schoolA_id, name: 'JSS 1' }
        });

        const campus = await kernel.db.campus.create({
          data: { tenantId: tenantA_id, schoolId: schoolA_id, name: 'Main Campus' }
        });

        const arm = await kernel.db.arm.create({
          data: { tenantId: tenantA_id, classId: cls.id, campusId: campus.id, name: 'A' }
        });

        const enrollment = await kernel.db.enrollment.create({
          data: {
            tenantId: tenantA_id,
            schoolId: schoolA_id,
            studentId: student.id,
            academicYearId: academicYear.id,
            classId: cls.id,
            armId: arm.id,
            status: EnrollmentStatus.ACTIVE
          }
        });
        enrollmentId = enrollment.id;
      });
    });

    it('should return enrollments with academicYear, class, and arm details included', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/students/${studentId}/enrollments`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-tenant-id', tenantA_id)
        .set('x-school-id', schoolA_id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);

      const enr = res.body.data[0];
      expect(enr.status).toBe(EnrollmentStatus.ACTIVE);

      // Verify enrichment
      expect(enr.academicYear).toBeDefined();
      expect(enr.academicYear.name).toBe('2026/2027');

      expect(enr.class).toBeDefined();
      expect(enr.class.name).toBe('JSS 1');

      expect(enr.arm).toBeDefined();
      expect(enr.arm.name).toBe('A');
    });
  });
  describe('Enrollment Mutations', () => {
    let studentId: string;
    let crossTenantId: string;
    let crossSchoolId: string;
    let academicYearId: string;
    let classId: string;
    let armId: string;
    let crossSchoolClassId: string;
    let crossTenantClassId: string;
    let activeEnrollmentId: string;

    beforeAll(async () => {
      // 1. Set up cross-tenant environment
      const crossTenant = await kernel.db.tenant.create({ data: { name: 'Cross Tenant', slug: 'cross-tenant' } });
      crossTenantId = crossTenant.id;
      
      await tenantContext.run({ tenantId: crossTenantId }, async () => {
        const ctSchool = await kernel.db.school.create({ data: { tenantId: crossTenantId, name: 'Cross School' } });
        const ctClass = await kernel.db.class.create({ data: { tenantId: crossTenantId, schoolId: ctSchool.id, name: 'Cross Class' } });
        crossTenantClassId = ctClass.id;
      });

      // 2. Set up cross-school environment within same tenant
      await tenantContext.run({ tenantId: tenantA_id }, async () => {
        const csSchool = await kernel.db.school.create({ data: { tenantId: tenantA_id, name: 'Cross School Same Tenant' } });
        crossSchoolId = csSchool.id;
        const csClass = await kernel.db.class.create({ data: { tenantId: tenantA_id, schoolId: csSchool.id, name: 'Cross School Class' } });
        crossSchoolClassId = csClass.id;

        // 3. Set up primary environment (School A)
        const student = await kernel.db.student.create({
          data: {
            tenantId: tenantA_id,
            schoolId: schoolA_id,
            firstName: 'Mutation',
            lastName: 'Student',
            gender: 'MALE',
            admissionDate: new Date(),
            studentNumber: 'STU-MUT-' + Date.now()
          }
        });
        studentId = student.id;

        const ay = await kernel.db.academicYear.create({
          data: { tenantId: tenantA_id, schoolId: schoolA_id, name: '2026/2027 Mut' }
        });
        academicYearId = ay.id;

        const cls = await kernel.db.class.create({
          data: { tenantId: tenantA_id, schoolId: schoolA_id, name: 'JSS 1 Mut' }
        });
        classId = cls.id;

        const campus = await kernel.db.campus.create({
          data: { tenantId: tenantA_id, schoolId: schoolA_id, name: 'Mut Campus' }
        });
        const arm = await kernel.db.arm.create({
          data: { tenantId: tenantA_id, classId: cls.id, campusId: campus.id, name: 'A Mut' }
        });
        armId = arm.id;
      });
    });

    describe('Create Enrollment', () => {
      it('should create a valid enrollment', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/students/${studentId}/enrollments`)
          .set('Authorization', `Bearer ${validToken}`)
          .set('x-tenant-id', tenantA_id)
          .set('x-school-id', schoolA_id)
          .send({ academicYearId, classId, armId });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        activeEnrollmentId = res.body.data.id;
      });

      it('should reject class from a different school in same tenant', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/students/${studentId}/enrollments`)
          .set('Authorization', `Bearer ${validToken}`)
          .set('x-tenant-id', tenantA_id)
          .set('x-school-id', schoolA_id)
          .send({ academicYearId, classId: crossSchoolClassId });

        expect(res.status).toBe(400); // Class does not belong to student's school
      });

      it('should reject class from a different tenant', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/students/${studentId}/enrollments`)
          .set('Authorization', `Bearer ${validToken}`)
          .set('x-tenant-id', tenantA_id)
          .set('x-school-id', schoolA_id)
          .send({ academicYearId, classId: crossTenantClassId });

        expect(res.status).toBe(400); // Class not found in active tenant
      });

      it('should reject duplicate active enrollment in same academic year', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/students/${studentId}/enrollments`)
          .set('Authorization', `Bearer ${validToken}`)
          .set('x-tenant-id', tenantA_id)
          .set('x-school-id', schoolA_id)
          .send({ academicYearId, classId, armId });

        expect(res.status).toBe(409); // Conflict: already active enrollment
      });
    });

    describe('Transfer Enrollment', () => {
      let newClassId: string;
      beforeAll(async () => {
        await tenantContext.run({ tenantId: tenantA_id }, async () => {
          const cls = await kernel.db.class.create({
            data: { tenantId: tenantA_id, schoolId: schoolA_id, name: 'JSS 2 Mut' }
          });
          newClassId = cls.id;
        });
      });

      it('should reject transfer to class in a different school', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/students/${studentId}/enrollments/${activeEnrollmentId}/transfer`)
          .set('Authorization', `Bearer ${validToken}`)
          .set('x-tenant-id', tenantA_id)
          .set('x-school-id', schoolA_id)
          .send({ newClassId: crossSchoolClassId });

        expect(res.status).toBe(400);
      });

      it('should successfully transfer and preserve history', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/students/${studentId}/enrollments/${activeEnrollmentId}/transfer`)
          .set('Authorization', `Bearer ${validToken}`)
          .set('x-tenant-id', tenantA_id)
          .set('x-school-id', schoolA_id)
          .send({ newClassId, notes: 'Promoted' });

        expect(res.status).toBe(201);
        const newEnrollmentId = res.body.data.id;
        expect(newEnrollmentId).toBeDefined();
        expect(newEnrollmentId).not.toBe(activeEnrollmentId);

        // Verify states in DB
        await tenantContext.run({ tenantId: tenantA_id }, async () => {
          const oldEnr = await kernel.db.enrollment.findUnique({ where: { id: activeEnrollmentId } });
          expect(oldEnr?.status).toBe(EnrollmentStatus.TRANSFERRED);
          
          const newEnr = await kernel.db.enrollment.findUnique({ where: { id: newEnrollmentId } });
          expect(newEnr?.status).toBe(EnrollmentStatus.ACTIVE);
          expect(newEnr?.classId).toBe(newClassId);

          const student = await kernel.db.student.findUnique({ where: { id: studentId } });
          expect(student?.status).toBe('ACTIVE');
        });
        
        activeEnrollmentId = newEnrollmentId; // update pointer
      });
    });

    describe('Withdraw Student', () => {
      it('should withdraw successfully', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/students/${studentId}/enrollments/${activeEnrollmentId}/withdraw`)
          .set('Authorization', `Bearer ${validToken}`)
          .set('x-tenant-id', tenantA_id)
          .set('x-school-id', schoolA_id)
          .send({ notes: 'Relocated' });

        expect(res.status).toBe(200);

        // Verify DB
        await tenantContext.run({ tenantId: tenantA_id }, async () => {
          const enr = await kernel.db.enrollment.findUnique({ where: { id: activeEnrollmentId } });
          expect(enr?.status).toBe(EnrollmentStatus.WITHDRAWN);

          const student = await kernel.db.student.findUnique({ where: { id: studentId } });
          expect(student?.status).toBe('WITHDRAWN');
        });
      });

      it('should reject withdrawing an already withdrawn enrollment', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/students/${studentId}/enrollments/${activeEnrollmentId}/withdraw`)
          .set('Authorization', `Bearer ${validToken}`)
          .set('x-tenant-id', tenantA_id)
          .set('x-school-id', schoolA_id)
          .send({ notes: 'Relocated again' });

        expect(res.status).toBe(400); // only active enrollments can be withdrawn
      });
    });
  });
});
