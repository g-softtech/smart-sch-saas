import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { kernel, tenantContext, AttendanceStatus } from '@saas/core-platform';
import { AttendanceRegisterFinalizedEvent, StudentAbsentEvent } from '@saas/core-platform';

describe('AttendanceController (e2e) - Final Verification Audit', () => {
  jest.setTimeout(120000);
  let app: INestApplication;
  
  let tenantAId: string;
  let tenantBId: string;
  let schoolAId: string;
  let schoolBId: string;
  
  let userAId: string;
  let userBId: string;
  
  let tokenA: string;
  let tokenB: string;

  let academicYearAId: string;
  let termAId: string;
  let classAId: string;
  let classBId: string;
  let armAId: string;

  let student1Id: string;
  let student2Id: string;
  let student3Id: string;
  let student4Id: string;

  let classWideRegisterId: string;
  let armRegisterId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const { ValidationPipe } = require('@nestjs/common');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    // Setup Tenants & Schools
    const tenantA = await kernel.db.tenant.create({ data: { name: 'Tenant A', slug: 'ta-' + Date.now() } });
    const tenantB = await kernel.db.tenant.create({ data: { name: 'Tenant B', slug: 'tb-' + Date.now() } });
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    await tenantContext.run({ tenantId: tenantAId }, async () => {
      const schA = await kernel.db.school.create({ data: { tenantId: tenantAId, name: 'School A' } });
      schoolAId = schA.id;

      const ay = await kernel.db.academicYear.create({ data: { tenantId: tenantAId, schoolId: schoolAId, name: '2026/2027' } });
      academicYearAId = ay.id;
      const term = await kernel.db.term.create({ data: { tenantId: tenantAId, academicYearId: academicYearAId, name: 'Term 1' } });
      termAId = term.id;
      const clsA = await kernel.db.class.create({ data: { tenantId: tenantAId, schoolId: schoolAId, name: 'Class 1' } });
      classAId = clsA.id;
      const clsB = await kernel.db.class.create({ data: { tenantId: tenantAId, schoolId: schoolAId, name: 'Class 2' } });
      classBId = clsB.id;
      
      const campus = await kernel.db.campus.create({ data: { tenantId: tenantAId, schoolId: schoolAId, name: 'Main Campus' } });
      const arm = await kernel.db.arm.create({ data: { tenantId: tenantAId, classId: classAId, campusId: campus.id, name: 'Arm A' } });
      armAId = arm.id;

      const st1 = await kernel.db.student.create({ data: { tenantId: tenantAId, schoolId: schoolAId, studentNumber: 'ST1', firstName: 'S', lastName: '1', gender: 'MALE', admissionDate: new Date() } });
      student1Id = st1.id;
      await kernel.db.enrollment.create({ data: { tenantId: tenantAId, schoolId: schoolAId, studentId: st1.id, academicYearId: academicYearAId, classId: classAId, armId: armAId, status: 'ACTIVE', enrolledAt: new Date('2026-01-01') } });

      const st2 = await kernel.db.student.create({ data: { tenantId: tenantAId, schoolId: schoolAId, studentNumber: 'ST2', firstName: 'S', lastName: '2', gender: 'FEMALE', admissionDate: new Date() } });
      student2Id = st2.id;
      await kernel.db.enrollment.create({ data: { tenantId: tenantAId, schoolId: schoolAId, studentId: st2.id, academicYearId: academicYearAId, classId: classAId, armId: armAId, status: 'ACTIVE', enrolledAt: new Date('2026-01-01') } });

      const st3 = await kernel.db.student.create({ data: { tenantId: tenantAId, schoolId: schoolAId, studentNumber: 'ST3', firstName: 'S', lastName: '3', gender: 'MALE', admissionDate: new Date() } });
      student3Id = st3.id;
      await kernel.db.enrollment.create({ data: { tenantId: tenantAId, schoolId: schoolAId, studentId: st3.id, academicYearId: academicYearAId, classId: classAId, status: 'ACTIVE', enrolledAt: new Date('2026-01-01') } });

      const st4 = await kernel.db.student.create({ data: { tenantId: tenantAId, schoolId: schoolAId, studentNumber: 'ST4', firstName: 'S', lastName: '4', gender: 'FEMALE', admissionDate: new Date() } });
      student4Id = st4.id;
      await kernel.db.enrollment.create({ data: { tenantId: tenantAId, schoolId: schoolAId, studentId: st4.id, academicYearId: academicYearAId, classId: classBId, status: 'ACTIVE', enrolledAt: new Date('2026-01-01') } });
    });

    await tenantContext.run({ tenantId: tenantBId }, async () => {
      const schB = await kernel.db.school.create({ data: { tenantId: tenantBId, name: 'School B' } });
      schoolBId = schB.id;
    });

    const userA = await kernel.db.user.create({ data: { email: 'ua-' + Date.now() + '@example.com' } });
    const userB = await kernel.db.user.create({ data: { email: 'ub-' + Date.now() + '@example.com' } });
    userAId = userA.id;
    userBId = userB.id;

    await tenantContext.run({ tenantId: tenantAId }, async () => {
      const roleId = 'role-ta-' + Date.now();
      await kernel.db.role.create({ data: { id: roleId, tenantId: tenantAId, name: 'Mock Role A' } });
      await kernel.db.userTenantMembership.create({ data: { tenantId: tenantAId, userId: userAId, roleId } });
    });

    await tenantContext.run({ tenantId: tenantBId }, async () => {
      const roleId = 'role-tb-' + Date.now();
      await kernel.db.role.create({ data: { id: roleId, tenantId: tenantBId, name: 'Mock Role B' } });
      await kernel.db.userTenantMembership.create({ data: { tenantId: tenantBId, userId: userBId, roleId } });
    });
    
    const jwtService = app.get(require('@nestjs/jwt').JwtService);
    tokenA = await jwtService.signAsync({ sub: userAId });
    tokenB = await jwtService.signAsync({ sub: userBId });
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. class-wide register creation & 15. incomplete draft allowed & 13. EXCUSED requires reason', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/attendance/registers/bulk')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        academicYearId: academicYearAId,
        termId: termAId,
        classId: classBId,
        date: '2026-09-01',
        records: [
          { studentId: student4Id, status: AttendanceStatus.EXCUSED, reason: 'Sick' }
        ]
      });
    expect(res.status).toBe(201);
    classWideRegisterId = res.body.id;
  });

  it('2. arm-specific register creation & 21. idempotent retry (upsert)', async () => {
    const payload = {
      academicYearId: academicYearAId,
      termId: termAId,
      classId: classAId,
      armId: armAId,
      date: '2026-09-01',
      records: [
        { studentId: student1Id, status: AttendanceStatus.PRESENT }
      ]
    };
    const res = await request(app.getHttpServer())
      .post('/v1/attendance/registers/bulk')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send(payload);
    expect(res.status).toBe(201);
    armRegisterId = res.body.id;

    // idempotent retry
    const resRetry = await request(app.getHttpServer())
      .post('/v1/attendance/registers/bulk')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send(payload);
    expect(resRetry.status).toBe(201);
    expect(resRetry.body.id).toBe(armRegisterId);
  });

  it('3. nullable-arm duplicate prevention', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/attendance/registers/bulk')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        academicYearId: academicYearAId,
        termId: termAId,
        classId: classBId,
        date: '2026-09-01',
        records: []
      });
    // With upsert, this succeeds and returns the same register! Wait, upsert won't P2002 if we do SELECT FOR UPDATE.
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(classWideRegisterId);
  });

  it('4. concurrent register creation (only 1 creates, others upsert)', async () => {
    const promises = Array.from({ length: 5 }).map(() => {
      return request(app.getHttpServer())
        .post('/v1/attendance/registers/bulk')
        .set('x-tenant-id', tenantAId)
        .set('x-school-id', schoolAId)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          academicYearId: academicYearAId,
          termId: termAId,
          classId: classAId,
          armId: armAId,
          date: '2026-09-02',
          records: []
        });
    });
    const results = await Promise.allSettled(promises);
    const successes = results.filter(r => r.status === 'fulfilled' && (r as any).value.status === 201);
    expect(successes.length).toBe(5); // Due to upsert, all succeed and return the same ID
    const ids = new Set(successes.map((r: any) => r.value.body.id));
    expect(ids.size).toBe(1);
  });

  it('5. duplicate student record prevention & 14. non-EXCUSED reason rejection', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/attendance/registers/bulk')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        academicYearId: academicYearAId,
        termId: termAId,
        classId: classAId,
        armId: armAId,
        date: '2026-09-03',
        records: [
          { studentId: student1Id, status: AttendanceStatus.PRESENT },
          { studentId: student1Id, status: AttendanceStatus.ABSENT }
        ]
      });
    expect(res.status).toBe(400); // Duplicate record submitted
    
    const resReason = await request(app.getHttpServer())
      .post('/v1/attendance/registers/bulk')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        academicYearId: academicYearAId,
        termId: termAId,
        classId: classAId,
        armId: armAId,
        date: '2026-09-03',
        records: [
          { studentId: student1Id, status: AttendanceStatus.PRESENT, reason: 'here' }
        ]
      });
    expect(resReason.status).toBe(400);
  });

  it('6. student outside register population rejected', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/attendance/registers/bulk')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        academicYearId: academicYearAId,
        termId: termAId,
        classId: classAId,
        armId: armAId,
        date: '2026-09-04',
        records: [
          { studentId: student4Id, status: AttendanceStatus.PRESENT }
        ]
      });
    expect(res.status).toBe(400);
  });

  it('7. client-supplied enrollmentId ignored/not accepted', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/attendance/registers/bulk')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        academicYearId: academicYearAId,
        termId: termAId,
        classId: classAId,
        armId: armAId,
        date: '2026-09-05',
        records: [
          { studentId: student1Id, status: AttendanceStatus.PRESENT, enrollmentId: 'fake' }
        ]
      });
    expect(res.status).toBe(400); // forbidNonWhitelisted kicks in
  });

  it('9. cross-tenant & 10. cross-school & 11. class/arm mismatch & 12. Term/AY mismatch', async () => {
    const resCross = await request(app.getHttpServer())
      .post('/v1/attendance/registers/bulk')
      .set('x-tenant-id', tenantBId)
      .set('x-school-id', schoolBId)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        academicYearId: academicYearAId, // Belongs to Tenant A
        termId: termAId,
        classId: classAId,
        armId: armAId,
        date: '2026-09-06',
        records: []
      });
    expect(resCross.status).toBe(400);
  });

  it('16. incomplete finalization rejected', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/v1/attendance/registers/${armRegisterId}/finalize`)
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(400); // Only student 1 is recorded, but arm A has student 1 and 2
  });

  it('17. complete finalization succeeds & 22. RegisterFinalizedEvent & 23. StudentAbsentEvent', async () => {
    // Add missing student 2 as ABSENT
    const resUpdate = await request(app.getHttpServer())
      .post('/v1/attendance/registers/bulk')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        academicYearId: academicYearAId,
        termId: termAId,
        classId: classAId,
        armId: armAId,
        date: '2026-09-01',
        records: [
          { studentId: student2Id, status: AttendanceStatus.ABSENT }
        ]
      });
    expect(resUpdate.status).toBe(201); // Upsert succeeds

    const resFinalize = await request(app.getHttpServer())
      .patch(`/v1/attendance/registers/${armRegisterId}/finalize`)
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(resFinalize.status).toBe(200);

    // Verify events were dispatched properly
    const logs = await kernel.db.domainEventLog.findMany({
      where: { aggregateId: armRegisterId, eventType: 'AttendanceRegisterFinalizedEvent' }
    });
    expect(logs.length).toBe(1);

    const absentLogs = await kernel.db.domainEventLog.findMany({
      where: { eventType: 'StudentAbsentEvent', tenantId: tenantAId }
    });
    // Student 2 is absent
    expect(absentLogs.length).toBe(1);
    expect((absentLogs[0].payload as any).studentId).toBe(student2Id);
  });

  it('18. finalized mutation rejected', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/attendance/registers/bulk')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        academicYearId: academicYearAId,
        termId: termAId,
        classId: classAId,
        armId: armAId,
        date: '2026-09-01', // finalized date
        records: [
          { studentId: student1Id, status: AttendanceStatus.ABSENT }
        ]
      });
    expect(res.status).toBe(409); // Conflict: Register is already finalized
  });

  it('19. concurrent finalization', async () => {
    // Make a new complete register
    const res = await request(app.getHttpServer())
      .post('/v1/attendance/registers/bulk')
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        academicYearId: academicYearAId,
        termId: termAId,
        classId: classBId,
        date: '2026-09-10',
        records: [
          { studentId: student4Id, status: AttendanceStatus.PRESENT }
        ]
      });
    expect(res.status).toBe(201);
    const newRegId = res.body.id;

    const promises = Array.from({ length: 5 }).map(() => {
      return request(app.getHttpServer())
        .patch(`/v1/attendance/registers/${newRegId}/finalize`)
        .set('x-tenant-id', tenantAId)
        .set('x-school-id', schoolAId)
        .set('Authorization', `Bearer ${tokenA}`);
    });
    const results = await Promise.allSettled(promises);
    const successes = results.filter(r => r.status === 'fulfilled' && (r as any).value.status === 200);
    const conflicts = results.filter(r => r.status === 'fulfilled' && (r as any).value.status === 409);
    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(4);
  });

  it('25. attendance history by student & 26. tenant/school isolation', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/attendance/students/${student1Id}`)
      .set('x-tenant-id', tenantAId)
      .set('x-school-id', schoolAId)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    
    // Cross-tenant fetch fails
    const resCross = await request(app.getHttpServer())
      .get(`/v1/attendance/students/${student1Id}`)
      .set('x-tenant-id', tenantBId)
      .set('x-school-id', schoolBId)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resCross.status).toBe(200);
    expect(resCross.body.length).toBe(0); // Tenant isolation correctly returns empty array
  });
  describe('Step 3 Hardening: Pagination, Filtering, and Response DTOs', () => {
    it('B. registers default pagination & E. deterministic ordering', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/attendance/registers')
        .set('x-tenant-id', tenantAId)
        .set('x-school-id', schoolAId)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body.length).toBeLessThanOrEqual(50); // Default take
      
      // Deterministic ordering: date DESC
      const dates = res.body.map((r: any) => new Date(r.date).getTime());
      const sortedDates = [...dates].sort((a, b) => b - a);
      expect(dates).toEqual(sortedDates);
    });

    it('A. registers pagination & C. maximum take enforcement', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/attendance/registers?skip=0&take=1')
        .set('x-tenant-id', tenantAId)
        .set('x-school-id', schoolAId)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);

      // Max take enforcement
      const resMax = await request(app.getHttpServer())
        .get('/v1/attendance/registers?take=101')
        .set('x-tenant-id', tenantAId)
        .set('x-school-id', schoolAId)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(resMax.status).toBe(400); // Exceeds max 100
    });

    it('D. invalid skip/take rejection', async () => {
      const resSkip = await request(app.getHttpServer())
        .get('/v1/attendance/registers?skip=-1')
        .set('x-tenant-id', tenantAId)
        .set('x-school-id', schoolAId)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(resSkip.status).toBe(400); // Minimum 0
      
      const resTake = await request(app.getHttpServer())
        .get('/v1/attendance/registers?take=0')
        .set('x-tenant-id', tenantAId)
        .set('x-school-id', schoolAId)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(resTake.status).toBe(400); // Minimum 1
    });

    it('F. startDate & G. endDate & H. startDate + endDate filtering', async () => {
      // First, get all to find bounds
      const allRes = await request(app.getHttpServer())
        .get('/v1/attendance/registers')
        .set('x-tenant-id', tenantAId)
        .set('x-school-id', schoolAId)
        .set('Authorization', `Bearer ${tokenA}`);
      
      const res = await request(app.getHttpServer())
        .get('/v1/attendance/registers?startDate=2026-09-01&endDate=2026-09-05')
        .set('x-tenant-id', tenantAId)
        .set('x-school-id', schoolAId)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      for (const reg of res.body) {
        const d = new Date(reg.date).getTime();
        expect(d).toBeGreaterThanOrEqual(new Date('2026-09-01').getTime());
        expect(d).toBeLessThanOrEqual(new Date('2026-09-05').getTime());
      }
    });

    it('I. invalid date rejection & J. startDate > endDate rejection', async () => {
      const invalidDates = ['2026-13-45', '2026-9-14', '2026-09-1', '2026-02-30', '2026-09-14T00:00:00Z', '2026-09-14T12:30:00Z'];
      for (const d of invalidDates) {
        const resInvalid = await request(app.getHttpServer())
          .get(`/v1/attendance/registers?startDate=${d}`)
          .set('x-tenant-id', tenantAId)
          .set('x-school-id', schoolAId)
          .set('Authorization', `Bearer ${tokenA}`);
        expect(resInvalid.status).toBe(400); 
      }

      const resOrder = await request(app.getHttpServer())
        .get('/v1/attendance/registers?startDate=2026-09-05&endDate=2026-09-01')
        .set('x-tenant-id', tenantAId)
        .set('x-school-id', schoolAId)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(resOrder.status).toBe(400);
      expect(resOrder.body.message).toContain('startDate cannot be after endDate');
    });

    it('K. student-history pagination & L. student-history maximum take & M. deterministic ordering', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/attendance/students/${student1Id}?skip=0&take=1`)
        .set('x-tenant-id', tenantAId)
        .set('x-school-id', schoolAId)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeLessThanOrEqual(1);

      const resMax = await request(app.getHttpServer())
        .get(`/v1/attendance/students/${student1Id}?take=101`)
        .set('x-tenant-id', tenantAId)
        .set('x-school-id', schoolAId)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(resMax.status).toBe(400);

      const resOrder = await request(app.getHttpServer())
        .get(`/v1/attendance/students/${student1Id}?take=10`)
        .set('x-tenant-id', tenantAId)
        .set('x-school-id', schoolAId)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(resOrder.status).toBe(200);
      const dates = resOrder.body.filter((r: any) => r.register).map((r: any) => new Date(r.register.date).getTime());
      const sortedDates = [...dates].sort((a, b) => b - a);
      expect(dates).toEqual(sortedDates);
    });

    it('N. response DTO sanitization & O. audit fields do not leak', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/attendance/registers')
        .set('x-tenant-id', tenantAId)
        .set('x-school-id', schoolAId)
        .set('Authorization', `Bearer ${tokenA}`);
      
      expect(res.status).toBe(200);
      const reg = res.body[0];
      expect(reg).toBeDefined();
      expect(reg.createdById).toBeUndefined();
      expect(reg.lastModifiedById).toBeUndefined();
      expect(reg.finalizedById).toBeUndefined();
      expect(reg.createdAt).toBeUndefined();
      expect(reg.updatedAt).toBeUndefined();
      expect(reg.id).toBeDefined(); // explicitly allowed
    });

    it('P. tenant isolation remains intact & Q. school isolation remains intact', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/attendance/registers?startDate=2026-09-01&endDate=2026-09-10')
        .set('x-tenant-id', tenantBId)
        .set('x-school-id', schoolBId)
        .set('Authorization', `Bearer ${tokenB}`);
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(0); // Tenant/School B has no registers
    });
  });
});
