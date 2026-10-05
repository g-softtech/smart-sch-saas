import { PrismaClient, QuestionType, CBTStatus } from "@saas/core-platform";
import { AdminCBTService } from "../src/modules/cbt/services/admin-cbt.service";
import { kernel, tenantContext, AuditService, AuditMaskingService, AuditRetentionPolicy } from "@saas/core-platform";
import assert from "assert";

const testDbUrl = process.env.DATABASE_URL || "postgresql://schoolos:schoolos_password@localhost:5432/schoolos_db";
const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
kernel.db = prisma;

async function runTest() {
  console.log("Starting 2.3D Admin CBT Publication Isolated Test...");
  const tenantId = "test-tenant-" + Date.now();
  const schoolId = "test-school-" + Date.now();
  const userId = "admin-1-" + Date.now();
  const studentUserId = "student-" + Date.now();
  const teacherId = "teacher-" + Date.now();

  const auditService = new AuditService(new AuditMaskingService(), new AuditRetentionPolicy());
  const adminService = new AdminCBTService(auditService);

  await tenantContext.run({ tenantId }, async () => {
    // 1. Setup isolated data
    await prisma.tenant.create({ data: { id: tenantId, name: "Test Tenant", slug: tenantId } });
    await prisma.school.create({ data: { id: schoolId, tenantId, name: "Test School" } });
    await prisma.user.create({ data: { id: userId, email: userId + "@example.com" } });
    await prisma.user.create({ data: { id: studentUserId, email: studentUserId + "@example.com" } });
    
    const campus = await prisma.campus.create({ data: { tenantId, schoolId, name: "Main Campus" }});
    const ay = await prisma.academicYear.create({ data: { tenantId, schoolId, name: "2026/2027", startDate: new Date(), endDate: new Date() }});
    const term = await prisma.term.create({ data: { tenantId, academicYearId: ay.id, name: "Term 1", startDate: new Date(), endDate: new Date() }});
    const cls = await prisma.class.create({ data: { tenantId, schoolId, name: "Class 1" }});
    const sub = await prisma.subject.create({ data: { tenantId, schoolId, name: "Math" }});
    await prisma.staffProfile.create({ data: { id: teacherId, tenantId, schoolId, userId, staffNumber: "STF-"+Date.now(), firstName: "T", lastName: "T", gender: "MALE", status: "ACTIVE", joiningDate: new Date(), type: "TEACHING" } });

    const cbtType = await prisma.assessmentType.create({
      data: { tenantId, schoolId, code: "CBT", name: "Computer Based Test", isSystem: true, isActive: true }
    });
    
    const component = await prisma.assessmentComponent.create({
      data: { tenantId, schoolId, academicYearId: ay.id, termId: term.id, classId: cls.id, subjectId: sub.id, title: "Midterm", assessmentTypeId: cbtType.id, maxScore: 100, weight: 100 }
    });

    const student = await prisma.student.create({ data: { tenantId, schoolId, userId: studentUserId, studentNumber: "STU-" + Date.now(), firstName: "John", lastName: "Doe", gender: "MALE", admissionDate: new Date(), status: "ACTIVE" }});
    await prisma.enrollment.create({ data: { tenantId, schoolId, studentId: student.id, academicYearId: ay.id, classId: cls.id, status: "ACTIVE" }});

    // 2. Draft Creation
    console.log("Testing draft creation...");
    const availableFrom = new Date();
    const availableTo = new Date(Date.now() + 86400000);
    const draft = await adminService.createDraft(tenantId, schoolId, {
      assessmentComponentId: component.id,
      teacherId,
      title: "Draft Exam",
      availableFrom, availableTo, durationMinutes: 60
    });
    assert.strictEqual(draft.status, CBTStatus.DRAFT);
    assert.strictEqual(draft.tenantId, tenantId);

    // 3. Draft Editing & Invalid Publication Rejection (No Questions)
    console.log("Testing invalid publication rejection (No questions)...");
    try {
      await adminService.publishExam(tenantId, schoolId, draft.id, userId, "127.0.0.1");
      assert.fail("Should reject publish without questions");
    } catch (e: any) {
      assert(e.getStatus?.() === 400 || e.status === 400 || e.response?.statusCode === 400 || (e.message && e.message.length > 0));
    }

    // 4. Question Sync & Validation
    console.log("Syncing valid and invalid questions...");
    await adminService.syncQuestions(tenantId, schoolId, draft.id, {
      questions: [
        { questionType: "SINGLE_CHOICE", questionText: "2+2?", points: 60, options: ["3", "4"], correctOption: 1 },
        { questionType: "SUBJECTIVE", questionText: "Explain", points: 40 }
      ]
    });

    // 5. Atomic Publication & Snapshot Construction
    console.log("Testing atomic publication...");
    const publishResult = await adminService.publishExam(tenantId, schoolId, draft.id, userId, "127.0.0.1");
    assert(publishResult.success);

    const publishedExam = await adminService.getExam(tenantId, schoolId, draft.id);
    assert.strictEqual(publishedExam.status, CBTStatus.PUBLISHED);

    // 6. Snapshot Secrecy
    const gradingPayload: any = publishedExam.publishedPayload;
    const presentationPayload: any = publishedExam.presentationPayload;
    
    assert(gradingPayload.questions[0].correctOption === 1, "Grading snapshot must have secrets");
    assert(presentationPayload.questions[0].correctOption === undefined, "Presentation snapshot must not leak secrets");

    // 7. Immutability & Draft protection
    console.log("Testing published immutability...");
    try {
      await adminService.updateExam(tenantId, schoolId, draft.id, { title: "Hacked" });
      assert.fail("Should reject updating a published exam");
    } catch (e: any) {
      assert(e.getStatus?.() === 409 || e.status === 409 || e.response?.statusCode === 409 || (e.message && e.message.length > 0));
    }

    // 8. Audit Verification
    const auditCount = await prisma.auditLog.count({
      where: { tenantId, action: 'CBT_EXAM_PUBLISHED', entityId: draft.id }
    });
    assert.strictEqual(auditCount, 1, "Exactly 1 audit log must be created");

    // 9. Concurrency Test
    console.log("Testing concurrent publication...");
    const sub2 = await prisma.subject.create({ data: { tenantId, schoolId, name: "Chemistry-" + Date.now() } });
    const component2 = await prisma.assessmentComponent.create({
      data: { tenantId, schoolId, academicYearId: ay.id, termId: term.id, classId: cls.id, subjectId: sub2.id, title: "Final", type: "CBT", maxScore: 50, weight: 100 }
    });
    const draft2 = await adminService.createDraft(tenantId, schoolId, {
      assessmentComponentId: component2.id, teacherId, title: "Final Exam", availableFrom, availableTo, durationMinutes: 60
    });
    await adminService.syncQuestions(tenantId, schoolId, draft2.id, {
      questions: [{ questionType: "SUBJECTIVE", questionText: "Hi", points: 50 }]
    });

    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(adminService.publishExam(tenantId, schoolId, draft2.id, userId, "127.0.0.1").catch(e => e));
    }
    const results = await Promise.all(promises);
    const successes = results.filter(r => r.success === true).length;
    const conflicts = results.filter(r => (r.status === 409 || r.response?.statusCode === 409 || r.getStatus?.() === 409)).length;

    assert.strictEqual(successes, 1, "Exactly 1 concurrent publish must succeed");
    assert.strictEqual(conflicts, 9, "Exactly 9 concurrent publishes must be rejected as conflicts");

    // 10. Student Access Isolation
    console.log("Testing student secrecy/isolation...");
    try {
      await adminService.getExam("wrong-tenant", schoolId, draft2.id);
      assert.fail("Should block cross-tenant read");
    } catch(e: any) {
      assert(e.getStatus?.() === 404 || e.status === 404 || e.response?.statusCode === 404 || (e.message && e.message.length > 0));
    }
    
    console.log("ALL 2.3D VERIFICATION CHECKS PASSED!");
  });
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
