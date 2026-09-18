import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { kernel, tenantContext } from '@saas/core-platform';

describe('Academics Phase 3 (e2e)', () => {
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }));
    await app.init();

    // Setup Test Data
    const uniqueSuffix = Date.now().toString() + Math.floor(Math.random() * 1000);
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
    
    const registeredUserId = (await kernel.db.user.findUnique({ where: { email: userEmail } })).id;
    
    await tenantContext.run({ tenantId }, async () => {
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
      await kernel.db.attendanceRegister.deleteMany({ where: { tenantId } });
      await kernel.db.staffProfile.deleteMany({ where: { tenantId } });
      await kernel.db.userTenantMembership.deleteMany({ where: { tenantId } });
      await kernel.db.role.deleteMany({ where: { tenantId } });
      await kernel.db.arm.deleteMany({ where: { tenantId } });
      await kernel.db.class.deleteMany({ where: { tenantId } });
      await kernel.db.term.deleteMany({ where: { tenantId } });
      await kernel.db.campus.deleteMany({ where: { tenantId } });
      await kernel.db.department.deleteMany({ where: { tenantId } });
      await kernel.db.subject.deleteMany({ where: { tenantId } });
      await kernel.db.subjectGroup.deleteMany({ where: { tenantId } });
      await kernel.db.academicYear.deleteMany({ where: { tenantId } });
      await kernel.db.school.deleteMany({ where: { tenantId } });
    });
    
    await tenantContext.run({ tenantId: otherTenantId }, async () => {
      await kernel.db.arm.deleteMany({ where: { tenantId: otherTenantId } });
      await kernel.db.class.deleteMany({ where: { tenantId: otherTenantId } });
      await kernel.db.term.deleteMany({ where: { tenantId: otherTenantId } });
      await kernel.db.campus.deleteMany({ where: { tenantId: otherTenantId } });
      await kernel.db.department.deleteMany({ where: { tenantId: otherTenantId } });
      await kernel.db.subject.deleteMany({ where: { tenantId: otherTenantId } });
      await kernel.db.subjectGroup.deleteMany({ where: { tenantId: otherTenantId } });
      await kernel.db.academicYear.deleteMany({ where: { tenantId: otherTenantId } });
      await kernel.db.school.deleteMany({ where: { tenantId: otherTenantId } });
    });

    await kernel.db.tenant.deleteMany({ where: { id: tenantId } });
    await kernel.db.tenant.deleteMany({ where: { id: otherTenantId } });
    await kernel.db.user.deleteMany({ where: { email: { contains: 'academics-test-user-' } } });
    await app.close();
  });

  describe('Campuses', () => {
    it('should create a campus and enforce DTO validation', async () => {
      // DTO Validation missing name
      await request(app.getHttpServer())
        .post('/api/v1/academics/campuses')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ schoolId })
        .expect(400);

      const res = await request(app.getHttpServer())
        .post('/api/v1/academics/campuses')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ schoolId, name: 'Main Campus' })
        .expect(201);
      
      expect(res.body.name).toBe('Main Campus');
    });

    it('should list campuses', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/academics/campuses')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(200);
      
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should update a campus safely', async () => {
      let campId: string = '';
      await tenantContext.run({ tenantId }, async () => {
        const c = await kernel.db.campus.create({ data: { tenantId, schoolId, name: 'Old Campus' } });
        campId = c.id;
      });

      await request(app.getHttpServer())
        .put(`/api/v1/academics/campuses/${campId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ name: 'New Campus' })
        .expect(200);
    });

    it('should fail update/delete for missing ID or wrong tenant (404)', async () => {
      let otherCampId: string = '';
      await tenantContext.run({ tenantId: otherTenantId }, async () => {
        const c = await kernel.db.campus.create({ data: { tenantId: otherTenantId, schoolId: otherSchoolId, name: 'Other Campus' } });
        otherCampId = c.id;
      });

      await request(app.getHttpServer())
        .put(`/api/v1/academics/campuses/${otherCampId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ name: 'Hacked' })
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/api/v1/academics/campuses/${otherCampId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(404);
    });

    it('should reject deletion with 409 if Campus has Arms (DB Restrict)', async () => {
      let campId: string = '';
      let armId: string = '';
      await tenantContext.run({ tenantId }, async () => {
        const c = await kernel.db.campus.create({ data: { tenantId, schoolId, name: 'Conflict Campus' } });
        campId = c.id;
        const cls = await kernel.db.class.create({ data: { tenantId, schoolId, name: 'Class A' } });
        const arm = await kernel.db.arm.create({ data: { tenantId, classId: cls.id, campusId: campId, name: 'Arm 1' } });
        armId = arm.id;
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/academics/campuses/${campId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(409);
        
      // Verify Arm is still intact
      await tenantContext.run({ tenantId }, async () => {
        const armCheck = await kernel.db.arm.findUnique({ where: { id: armId } });
        expect(armCheck).not.toBeNull();
      });
    });

    it('should successfully delete an unused campus', async () => {
      let campId: string = '';
      await tenantContext.run({ tenantId }, async () => {
        const c = await kernel.db.campus.create({ data: { tenantId, schoolId, name: 'Delete-Free Campus' } });
        campId = c.id;
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/academics/campuses/${campId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(200);
    });

    it('should reject duplicate campus creation', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/academics/campuses')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ schoolId, name: 'Main Campus' })
        .expect(409);
    });
  });

  describe('Terms', () => {
    let yearId: string = '';
    beforeAll(async () => {
      await tenantContext.run({ tenantId }, async () => {
        const y = await kernel.db.academicYear.create({ data: { tenantId, schoolId, name: 'Term Year' } });
        yearId = y.id;
      });
    });

    it('should create and update a term', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/academics/terms')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ academicYearId: yearId, name: 'Term 1' })
        .expect(201);
      
      const termId = res.body.id;

      await request(app.getHttpServer())
        .put(`/api/v1/academics/terms/${termId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ name: 'Term 1 Updated' })
        .expect(200);
    });

    it('should reject deletion with 409 if Term has AttendanceRegister', async () => {
      let termId: string = '';
      await tenantContext.run({ tenantId }, async () => {
        const t = await kernel.db.term.create({ data: { tenantId, academicYearId: yearId, name: 'Term Conflict' } });
        termId = t.id;
        const cls = await kernel.db.class.create({ data: { tenantId, schoolId, name: 'Class AT' } });
        await kernel.db.attendanceRegister.create({
          data: { 
            tenantId, 
            schoolId, 
            academicYearId: yearId, 
            termId: termId, 
            classId: cls.id, 
            date: new Date(),
            createdById: 'test-user',
            lastModifiedById: 'test-user'
          }
        });
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/academics/terms/${termId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(409);
    });

    it('should successfully delete an unused term', async () => {
      let termId: string = '';
      await tenantContext.run({ tenantId }, async () => {
        const t = await kernel.db.term.create({ data: { tenantId, academicYearId: yearId, name: 'Term To Delete' } });
        termId = t.id;
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/academics/terms/${termId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(200);
    });
  });

  describe('Departments', () => {
    it('should create and update a department', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/academics/departments')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ schoolId, name: 'Science' })
        .expect(201);
      
      const deptId = res.body.id;

      await request(app.getHttpServer())
        .put(`/api/v1/academics/departments/${deptId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ name: 'Science Dept' })
        .expect(200);
    });

    it('should reject deletion with 409 if Department has StaffProfile', async () => {
      let deptId: string = '';
      await tenantContext.run({ tenantId }, async () => {
        const d = await kernel.db.department.create({ data: { tenantId, schoolId, name: 'Dept Conflict' } });
        deptId = d.id;
        // StaffProfile needs a user
        const u = await kernel.db.user.create({ data: { email: 'staff' + Date.now() + '@example.com' } });
        await kernel.db.staffProfile.create({
          data: { 
            tenantId, 
            schoolId, 
            userId: u.id, 
            departmentId: deptId, 
            staffNumber: 'STF' + Date.now(),
            firstName: 'Staff',
            lastName: 'One',
            type: 'TEACHING',
            joiningDate: new Date()
          }
        });
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/academics/departments/${deptId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(409);
    });

    it('should successfully delete an unused department', async () => {
      let deptId: string = '';
      await tenantContext.run({ tenantId }, async () => {
        const d = await kernel.db.department.create({ data: { tenantId, schoolId, name: 'Dept To Delete' } });
        deptId = d.id;
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/academics/departments/${deptId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(200);
    });
  });

  describe('SubjectGroups and Subjects', () => {
    let groupId: string = '';
    let subjectId: string = '';

    it('should create SubjectGroup and Subject', async () => {
      const grpRes = await request(app.getHttpServer())
        .post('/api/v1/academics/subject-groups')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ schoolId, name: 'Sciences' })
        .expect(201);
      groupId = grpRes.body.id;

      const subRes = await request(app.getHttpServer())
        .post('/api/v1/academics/subjects')
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ schoolId, name: 'Physics', subjectGroupId: groupId })
        .expect(201);
      subjectId = subRes.body.id;
    });

    it('should update Subject safely', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/academics/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ name: 'Physics I', subjectGroupId: groupId })
        .expect(200);
    });

    it('should reject update if target subjectGroup belongs to different school', async () => {
      let otherSchGrpId: string = '';
      await tenantContext.run({ tenantId }, async () => {
        const s = await kernel.db.school.create({ data: { name: 'School 2', tenantId } });
        const g = await kernel.db.subjectGroup.create({ data: { tenantId, schoolId: s.id, name: 'Other School Group' } });
        otherSchGrpId = g.id;
      });

      await request(app.getHttpServer())
        .put(`/api/v1/academics/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .send({ name: 'Physics I', subjectGroupId: otherSchGrpId })
        .expect(400);
    });

    it('should safely SetNull when deleting SubjectGroup', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/academics/subject-groups/${groupId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(200);

      // Verify subject is orphaned
      await tenantContext.run({ tenantId }, async () => {
        const subj = await kernel.db.subject.findUnique({ where: { id: subjectId } });
        expect(subj).not.toBeNull();
        expect(subj?.subjectGroupId).toBeNull();
      });
    });

    it('should successfully delete Subject', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/academics/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .set('x-tenant-id', tenantId)
        .set('x-school-id', schoolId)
        .expect(200);
    });
  });
});
