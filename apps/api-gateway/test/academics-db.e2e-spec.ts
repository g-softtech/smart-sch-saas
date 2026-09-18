import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { kernel, tenantContext } from '@saas/core-platform';

describe('AcademicsController (e2e)', () => {
  let app: INestApplication;
  let tenantId: string;
  let schoolId: string;
  let otherTenantId: string;
  let otherSchoolId: string;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Setup Test Data
    const uniqueSuffix = Date.now().toString();
    const tenant = await kernel.db.tenant.create({
      data: { name: 'Academics Test Tenant ' + uniqueSuffix, slug: 'academics-test-tenant-' + uniqueSuffix },
    });
    tenantId = tenant.id;

    await tenantContext.run({ tenantId }, async () => {
      const school = await kernel.db.school.create({
        data: { name: 'Academics Test School', tenantId },
      });
      schoolId = school.id;
    });

    const otherTenant = await kernel.db.tenant.create({
      data: { name: 'Other Tenant ' + uniqueSuffix, slug: 'other-tenant-academics-' + uniqueSuffix },
    });
    otherTenantId = otherTenant.id;

    await tenantContext.run({ tenantId: otherTenantId }, async () => {
      const otherSchool = await kernel.db.school.create({
        data: { name: 'Other School', tenantId: otherTenantId },
      });
      otherSchoolId = otherSchool.id;
    });

    const userEmail = `academics-test-user-${uniqueSuffix}@example.com`;
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: userEmail, password: 'Password123!', firstName: 'Test', lastName: 'User' });
    
    // We will just register a new one to get the token, then update membership
    const registeredUserId = (await kernel.db.user.findUnique({ where: { email: userEmail } })).id;
    
    await tenantContext.run({ tenantId }, async () => {
      // Create Role
      const role = await kernel.db.role.create({
        data: { name: 'Admin', tenantId, isSystem: true }
      });

      await kernel.db.userTenantMembership.create({
        data: {
          userId: registeredUserId,
          tenantId,
          roleId: role.id,
        },
      });
    });
    jwtToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await tenantContext.run({ tenantId }, async () => {
      await kernel.db.enrollment.deleteMany({ where: { tenantId } });
      await kernel.db.student.deleteMany({ where: { tenantId } });
      await kernel.db.userTenantMembership.deleteMany({ where: { tenantId } });
      await kernel.db.role.deleteMany({ where: { tenantId } });
      await kernel.db.arm.deleteMany({ where: { tenantId } });
      await kernel.db.class.deleteMany({ where: { tenantId } });
      await kernel.db.campus.deleteMany({ where: { tenantId } });
      await kernel.db.academicYear.deleteMany({ where: { tenantId } });
      await kernel.db.school.deleteMany({ where: { tenantId } });
    });
    
    await tenantContext.run({ tenantId: otherTenantId }, async () => {
      await kernel.db.enrollment.deleteMany({ where: { tenantId: otherTenantId } });
      await kernel.db.student.deleteMany({ where: { tenantId: otherTenantId } });
      await kernel.db.arm.deleteMany({ where: { tenantId: otherTenantId } });
      await kernel.db.class.deleteMany({ where: { tenantId: otherTenantId } });
      await kernel.db.academicYear.deleteMany({ where: { tenantId: otherTenantId } });
      await kernel.db.school.deleteMany({ where: { tenantId: otherTenantId } });
    });

    await kernel.db.tenant.deleteMany({ where: { id: tenantId } });
    await kernel.db.tenant.deleteMany({ where: { id: otherTenantId } });
    // Cleanup users
    await kernel.db.user.deleteMany({ where: { email: { contains: 'academics-test-user-' } } });
    await app.close();
  });

  it('should reject unauthenticated GET requests', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years')
      .expect(401);
  });

  it('should return empty lists initially', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('should list academic years with deterministic ordering', async () => {
    await kernel.db.academicYear.create({
      data: { tenantId, schoolId, name: 'B-Year' }
    });
    await kernel.db.academicYear.create({
      data: { tenantId, schoolId, name: 'A-Year' }
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .expect(200);

    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].name).toBe('A-Year');
    expect(res.body.data[1].name).toBe('B-Year');
  });
  
  it('should support bounded pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years?skip=1&take=1')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-school-id', schoolId)
      .expect(200);

    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('B-Year');
  });

  it('should reject access with invalid tenant/school headers', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/academics/academic-years')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'invalid-tenant-id')
      .set('x-school-id', schoolId)
      .expect(403);
  });

  describe('Academic Years', () => {
    it('should create an academic year', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/academics/academic-years')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ schoolId, name: '2027/2028' })
        .expect(201);
      
      expect(res.body.name).toBe('2027/2028');
      expect(res.body.tenantId).toBe(tenantId);
      expect(res.body.schoolId).toBe(schoolId);
    });

    it('should reject creation if school belongs to another tenant', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/academics/academic-years')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ schoolId: otherSchoolId, name: '2028/2029' })
        .expect(400);
    });

    it('should reject duplicate name within the same school', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/academics/academic-years')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ schoolId, name: 'Unique-Year' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/academics/academic-years')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ schoolId, name: 'Unique-Year' })
        .expect(409);
    });
    it('should update an academic year', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/academics/academic-years')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ schoolId, name: 'To Update Year' })
        .expect(201);
      
      const id = createRes.body.id;

      const updateRes = await request(app.getHttpServer())
        .put(`/api/v1/academics/academic-years/${id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ name: 'Updated Year' })
        .expect(200);

      expect(updateRes.body.name).toBe('Updated Year');
    });

    it('should return 404 for nonexistent academic year', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/academics/academic-years/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ name: 'Nonexistent' })
        .expect(404);
    });

    it('should return 400 when updating a year in another tenant', async () => {
      let otherYearId: string = '';
      await tenantContext.run({ tenantId: otherTenantId }, async () => {
        const y = await kernel.db.academicYear.create({ data: { tenantId: otherTenantId, schoolId: otherSchoolId, name: 'Other Year' } });
        otherYearId = y.id;
      });

      await request(app.getHttpServer())
        .put(`/api/v1/academics/academic-years/${otherYearId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ name: 'Hacked' })
        .expect(400); // Because it belongs to another tenant
    });

    it('should return 409 if deleting a year referenced by an enrollment', async () => {
      let yearId: string = '';
      await tenantContext.run({ tenantId }, async () => {
        const year = await kernel.db.academicYear.create({ data: { tenantId, schoolId, name: 'Delete-Me-Year' } });
        yearId = year.id;
        const cls = await kernel.db.class.create({ data: { tenantId, schoolId, name: 'T1' } });
        const student = await kernel.db.student.create({ data: { tenantId, schoolId, firstName: 'A', lastName: 'B', studentNumber: 'S1' + Date.now(), gender: 'MALE', admissionDate: new Date() } });
        await kernel.db.enrollment.create({
          data: { tenantId, schoolId, studentId: student.id, academicYearId: yearId, classId: cls.id, status: 'ACTIVE' }
        });
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/academics/academic-years/${yearId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(409);
    });

    it('should successfully delete an unused academic year', async () => {
      let yearId: string = '';
      await tenantContext.run({ tenantId }, async () => {
        const year = await kernel.db.academicYear.create({ data: { tenantId, schoolId, name: 'Delete-Me-Free-Year' } });
        yearId = year.id;
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/academics/academic-years/${yearId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(200);
    });

    it('should return 400 when deleting a year in another tenant', async () => {
      let otherYearId: string = '';
      await tenantContext.run({ tenantId: otherTenantId }, async () => {
        const y = await kernel.db.academicYear.create({ data: { tenantId: otherTenantId, schoolId: otherSchoolId, name: 'Other Delete Year' } });
        otherYearId = y.id;
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/academics/academic-years/${otherYearId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(400);
    });
  });

  describe('Classes', () => {
    it('should create a class', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/academics/classes')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ schoolId, name: 'Grade 1' })
        .expect(201);
      
      expect(res.body.name).toBe('Grade 1');
      expect(res.body.tenantId).toBe(tenantId);
    });

    it('should reject creation if school belongs to another tenant', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/academics/classes')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ schoolId: otherSchoolId, name: 'Grade 2' })
        .expect(400);
    });

    it('should reject duplicate name within the same school', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/academics/classes')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ schoolId, name: 'Grade Unique' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/academics/classes')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ schoolId, name: 'Grade Unique' })
        .expect(409);
    });

    it('should list classes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/academics/classes')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(200);
      
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].name).toBeDefined();
    });
    it('should update a class', async () => {
      let clsId: string = '';
      await tenantContext.run({ tenantId }, async () => {
        const cls = await kernel.db.class.create({ data: { tenantId, schoolId, name: 'To Update Class' } });
        clsId = cls.id;
      });

      await request(app.getHttpServer())
        .put(`/api/v1/academics/classes/${clsId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ name: 'Updated Class' })
        .expect(200);
    });

    it('should return 409 if deleting a class referenced by an enrollment', async () => {
      let clsId: string = '';
      await tenantContext.run({ tenantId }, async () => {
        const year = await kernel.db.academicYear.create({ data: { tenantId, schoolId, name: 'Year For Class' } });
        const cls = await kernel.db.class.create({ data: { tenantId, schoolId, name: 'Delete-Me-Class' } });
        clsId = cls.id;
        const student = await kernel.db.student.create({ data: { tenantId, schoolId, firstName: 'A', lastName: 'B', studentNumber: 'S2' + Date.now(), gender: 'MALE', admissionDate: new Date() } });
        await kernel.db.enrollment.create({
          data: { tenantId, schoolId, studentId: student.id, academicYearId: year.id, classId: clsId, status: 'ACTIVE' }
        });
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/academics/classes/${clsId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(409);
    });

    it('should successfully delete an unused class', async () => {
      let clsId: string = '';
      await tenantContext.run({ tenantId }, async () => {
        const cls = await kernel.db.class.create({ data: { tenantId, schoolId, name: 'Delete-Free-Class' } });
        clsId = cls.id;
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/academics/classes/${clsId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(200);
    });
  });

  describe('Arms', () => {
    let classId: string;
    let campusId: string;

    beforeAll(async () => {
      await tenantContext.run({ tenantId }, async () => {
        const c = await kernel.db.class.create({
          data: { name: 'Arm Parent Class', schoolId, tenantId }
        });
        classId = c.id;

        const camp = await kernel.db.campus.create({
          data: { name: 'Main Campus', schoolId, tenantId }
        });
        campusId = camp.id;
      });
    });

    it('should create an arm', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/academics/arms')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ classId, campusId, name: 'A' })
        .expect(201);
      
      expect(res.body.name).toBe('A');
      expect(res.body.tenantId).toBe(tenantId);
    });

    it('should reject creation if class belongs to another tenant', async () => {
      let otherClassId: string;
      await tenantContext.run({ tenantId: otherTenantId }, async () => {
        const c = await kernel.db.class.create({
          data: { name: 'Other Class', tenantId: otherTenantId, schoolId: otherSchoolId }
        });
        otherClassId = c.id;
      });

      await request(app.getHttpServer())
        .post('/api/v1/academics/arms')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ classId: otherClassId, campusId, name: 'B' })
        .expect(400);
    });
    
    it('should reject creation if class and campus belong to different schools', async () => {
      let otherCampusId: string;
      await tenantContext.run({ tenantId }, async () => {
        const s = await kernel.db.school.create({
          data: { name: 'Another School Same Tenant', tenantId }
        });
        const c = await kernel.db.campus.create({
          data: { name: 'Campus 2', tenantId, schoolId: s.id }
        });
        otherCampusId = c.id;
      });

      await request(app.getHttpServer())
        .post('/api/v1/academics/arms')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ classId, campusId: otherCampusId, name: 'C' })
        .expect(400); // The service specifically checks this
    });

    it('should reject duplicate arm name within same class and campus', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/academics/arms')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ classId, campusId, name: 'Unique-Arm' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/academics/arms')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ classId, campusId, name: 'Unique-Arm' })
        .expect(409);
    });

    it('should list arms', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/academics/arms')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(200);
      
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].name).toBeDefined();
    });
    it('should update an arm', async () => {
      let armId: string = '';
      await tenantContext.run({ tenantId }, async () => {
        const arm = await kernel.db.arm.create({ data: { tenantId, classId, campusId, name: 'To Update Arm' } });
        armId = arm.id;
      });

      await request(app.getHttpServer())
        .put(`/api/v1/academics/arms/${armId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ name: 'Updated Arm' })
        .expect(200);
    });

    it('should return 409 if deleting an arm referenced by an enrollment', async () => {
      let armId: string = '';
      await tenantContext.run({ tenantId }, async () => {
        const year = await kernel.db.academicYear.create({ data: { tenantId, schoolId, name: 'Year For Arm' } });
        const arm = await kernel.db.arm.create({ data: { tenantId, classId, campusId, name: 'Delete-Me-Arm' } });
        armId = arm.id;
        const student = await kernel.db.student.create({ data: { tenantId, schoolId, firstName: 'A', lastName: 'B', studentNumber: 'S3' + Date.now(), gender: 'MALE', admissionDate: new Date() } });
        await kernel.db.enrollment.create({
          data: { tenantId, schoolId, studentId: student.id, academicYearId: year.id, classId: classId, armId: armId, status: 'ACTIVE' }
        });
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/academics/arms/${armId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(409);
    });

    it('should successfully delete an unused arm', async () => {
      let armId: string = '';
      await tenantContext.run({ tenantId }, async () => {
        const arm = await kernel.db.arm.create({ data: { tenantId, classId, campusId, name: 'Delete-Free-Arm' } });
        armId = arm.id;
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/academics/arms/${armId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(200);
    });
  });
});
