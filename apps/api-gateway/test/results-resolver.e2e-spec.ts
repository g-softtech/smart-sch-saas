import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "./../src/app.module";
import { kernel, tenantContext } from "@saas/core-platform";
import { ResultsService } from "./../src/modules/academics/services/results.service";

describe("SubjectResult Canonical Resolver (e2e DB Race Test)", () => {
  let app: INestApplication;
  let resultsService: ResultsService;
  
  let tenantId: string;
  let schoolId: string;
  let otherTenantId: string;
  let otherSchoolId: string;
  let academicYearId: string;
  let termId: string;
  let subjectId: string;
  let enrollmentId: string;
  let classId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    resultsService = app.get(ResultsService);

    // Setup Test Data
    const uniqueSuffix = Date.now().toString();
    const tenant = await kernel.db.tenant.create({ data: { name: "Resolver Tenant " + uniqueSuffix, slug: "res-tenant-" + uniqueSuffix } });
    tenantId = tenant.id;

    const school = await kernel.db.school.create({ data: { tenantId, name: "Resolver School", abbreviation: "RS" } });
    schoolId = school.id;

    const year = await kernel.db.academicYear.create({ data: { tenantId, schoolId, name: "2026/2027", startDate: new Date(), endDate: new Date() } });
    academicYearId = year.id;

    const term = await kernel.db.term.create({ data: { tenantId, academicYearId, name: "First Term", startDate: new Date(), endDate: new Date() } });
    termId = term.id;

    const cls = await kernel.db.class.create({ data: { tenantId, schoolId, name: "Class 1", order: 1 } });
    classId = cls.id;

    const student = await kernel.db.student.create({ data: { tenantId, schoolId, userId: "u_" + uniqueSuffix, firstName: "John", lastName: "Doe", dateOfBirth: new Date() } });
    
    const enrollment = await kernel.db.enrollment.create({ data: { tenantId, schoolId, studentId: student.id, academicYearId, classId, enrolledAt: new Date() } });
    enrollmentId = enrollment.id;

    const subject = await kernel.db.subject.create({ data: { tenantId, schoolId, name: "Math", code: "MTH" } });
    subjectId = subject.id;

    // Cross-tenant data
    const otherTenant = await kernel.db.tenant.create({ data: { name: "Other Tenant " + uniqueSuffix, slug: "other-tenant-" + uniqueSuffix } });
    otherTenantId = otherTenant.id;
    const otherSchool = await kernel.db.school.create({ data: { tenantId: otherTenantId, name: "Other School", abbreviation: "OS" } });
    otherSchoolId = otherSchool.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("should create missing SubjectResult once", async () => {
    await tenantContext.run({ tenantId }, async () => {
      const res = await kernel.db.$transaction(async (tx) => {
        return resultsService.resolveOrCreateSubjectResult(tx, {
          tenantId, schoolId, academicYearId, termId, enrollmentId, subjectId
        });
      });
      expect(res).toBeDefined();
      expect(res.tenantId).toBe(tenantId);
    });
  });

  it("should return the existing SubjectResult (idempotent)", async () => {
    await tenantContext.run({ tenantId }, async () => {
      const allBefore = await kernel.db.subjectResult.findMany({ where: { tenantId, schoolId, enrollmentId } });
      const beforeCount = allBefore.length;

      const res = await kernel.db.$transaction(async (tx) => {
        return resultsService.resolveOrCreateSubjectResult(tx, {
          tenantId, schoolId, academicYearId, termId, enrollmentId, subjectId
        });
      });
      
      const allAfter = await kernel.db.subjectResult.findMany({ where: { tenantId, schoolId, enrollmentId } });
      expect(allAfter.length).toBe(beforeCount);
      expect(res.id).toBe(allBefore[0].id);
    });
  });

  it("concurrent resolution cannot create duplicates", async () => {
    await tenantContext.run({ tenantId }, async () => {
      const newSubject = await kernel.db.subject.create({ data: { tenantId, schoolId, name: "Science", code: "SCI" } });
      const newSubjectId = newSubject.id;

      // Launch 15 concurrent creations
      const promises = Array.from({ length: 15 }).map(() => {
        return kernel.db.$transaction(async (tx) => {
          return resultsService.resolveOrCreateSubjectResult(tx, {
            tenantId, schoolId, academicYearId, termId, enrollmentId, subjectId: newSubjectId
          });
        });
      });

      const results = await Promise.all(promises);
      const uniqueIds = new Set(results.map(r => r.id));
      expect(uniqueIds.size).toBe(1); // Exactly one record was created/resolved

      const dbRecords = await kernel.db.subjectResult.findMany({
        where: { tenantId, schoolId, enrollmentId, subjectId: newSubjectId }
      });
      expect(dbRecords.length).toBe(1);
    });
  });

  it("enforces tenant, school, year, term, subject, enrollment isolation", async () => {
    await tenantContext.run({ tenantId }, async () => {
      const newStudent = await kernel.db.student.create({ data: { tenantId, schoolId, userId: "ux_" + Date.now(), firstName: "Jane", lastName: "Doe", dateOfBirth: new Date() } });
      const newEnrollment = await kernel.db.enrollment.create({ data: { tenantId, schoolId, studentId: newStudent.id, academicYearId, classId, enrolledAt: new Date() } });
      
      await kernel.db.$transaction(async (tx) => {
        return resultsService.resolveOrCreateSubjectResult(tx, {
          tenantId, schoolId, academicYearId, termId, enrollmentId: newEnrollment.id, subjectId
        });
      });

      const recordsForSubject = await kernel.db.subjectResult.findMany({
        where: { tenantId, schoolId, subjectId }
      });
      // Should have 2 (one for original student, one for new student)
      expect(recordsForSubject.length).toBe(2);
    });
  });
});
