import { kernel, tenantContext, AssignmentScope, WorkflowStatus, StaffType, GenderEnum } from "../index";
import { AcademicsRepository } from "../../../../apps/api-gateway/src/modules/academics/repositories/academics.repository";
import { TeacherAssignmentsService } from "../../../../apps/api-gateway/src/modules/academics/services/teacher-assignments.service";
import { TeacherGradebookService } from "../../../../apps/api-gateway/src/modules/academics/services/teacher-gradebook.service";
import { GradebookWorkflowService } from "../../../../apps/api-gateway/src/modules/academics/services/gradebook-workflow.service";
import { StudentPortalService } from "../../../../apps/api-gateway/src/modules/portal-student/services/student-portal.service";
import { ParentPortalService } from "../../../../apps/api-gateway/src/modules/portal-parent/services/parent-portal.service";
import { ResultsService } from "../../../../apps/api-gateway/src/modules/academics/services/results.service";
import { seedAcademicRolePermissionsForTenant } from "./seed-academics-permissions";

async function main() {
  console.log("=== PHASE 5G STEP 6 STUDENT & PARENT PORTAL RESULT ENGINE TEST SUITE ===");

  const academicsRepo = new AcademicsRepository();
  const assignmentsService = new TeacherAssignmentsService(academicsRepo);
  const teacherGradebookService = new TeacherGradebookService(assignmentsService);
  const workflowService = new GradebookWorkflowService();
  const studentPortalService = new StudentPortalService({} as any, {} as any);
  const parentPortalService = new ParentPortalService();
  const legacyResultsService = new ResultsService();

  const ts = Date.now();

  // 1. Setup primary tenant & school
  const tenant = await kernel.db.tenant.create({
    data: { name: "Step6 Test Tenant", slug: `step6-tenant-${ts}` },
  });

  await tenantContext.run({ tenantId: tenant.id }, async () => {
    const schoolA = await kernel.db.school.create({
      data: { tenantId: tenant.id, name: "Step6 School A" },
    });

    const schoolB = await kernel.db.school.create({
      data: { tenantId: tenant.id, name: "Step6 School B" },
    });

    const campus = await kernel.db.campus.create({
      data: { tenantId: tenant.id, schoolId: schoolA.id, name: "Main Campus" },
    });

    const academicYear1 = await kernel.db.academicYear.create({
      data: { tenantId: tenant.id, schoolId: schoolA.id, name: "2026/2027", startDate: new Date("2026-09-01"), endDate: new Date("2027-07-31") },
    });

    const academicYear2 = await kernel.db.academicYear.create({
      data: { tenantId: tenant.id, schoolId: schoolA.id, name: "2027/2028", startDate: new Date("2027-09-01"), endDate: new Date("2028-07-31") },
    });

    const term1 = await kernel.db.term.create({
      data: { tenantId: tenant.id, academicYearId: academicYear1.id, name: "Term 1", startDate: new Date("2026-09-01"), endDate: new Date("2026-12-20") },
    });

    const term2 = await kernel.db.term.create({
      data: { tenantId: tenant.id, academicYearId: academicYear1.id, name: "Term 2", startDate: new Date("2027-01-10"), endDate: new Date("2027-04-20") },
    });

    const cls = await kernel.db.class.create({
      data: { tenantId: tenant.id, schoolId: schoolA.id, name: "Grade 10" },
    });

    const arm1 = await kernel.db.arm.create({
      data: { tenantId: tenant.id, campusId: campus.id, classId: cls.id, name: "Arm Gold" },
    });

    const subjectMath = await kernel.db.subject.create({
      data: { tenantId: tenant.id, schoolId: schoolA.id, name: "Mathematics" },
    });

    const subjectEnglish = await kernel.db.subject.create({
      data: { tenantId: tenant.id, schoolId: schoolA.id, name: "English Language" },
    });

    await seedAcademicRolePermissionsForTenant(tenant.id);

    // Primary Teacher
    const primaryTeacherUser = await kernel.db.user.create({
      data: { email: `pri-${ts}@test.com`, passwordHash: "hash" },
    });
    const primaryTeacherStaff = await kernel.db.staffProfile.create({
      data: { tenantId: tenant.id, schoolId: schoolA.id, userId: primaryTeacherUser.id, staffNumber: `STF-PRI-${ts}`, firstName: "Primary", lastName: "Teacher", joiningDate: new Date(), type: StaffType.TEACHING, status: "ACTIVE" },
    });

    // Students & Guardians
    const student1User = await kernel.db.user.create({
      data: { email: `stu1-${ts}@test.com`, passwordHash: "hash" },
    });
    const student1 = await kernel.db.student.create({
      data: {
        tenantId: tenant.id,
        schoolId: schoolA.id,
        studentNumber: `STU1-${ts}`,
        firstName: "Alice",
        lastName: "Student",
        userId: student1User.id,
        admissionDate: new Date(),
        gender: GenderEnum.FEMALE,
      },
    });
    const enrollment1 = await kernel.db.enrollment.create({
      data: { tenantId: tenant.id, schoolId: schoolA.id, academicYearId: academicYear1.id, classId: cls.id, armId: arm1.id, studentId: student1.id, status: "ACTIVE" },
    });

    const student2User = await kernel.db.user.create({
      data: { email: `stu2-${ts}@test.com`, passwordHash: "hash" },
    });
    const student2 = await kernel.db.student.create({
      data: {
        tenantId: tenant.id,
        schoolId: schoolA.id,
        studentNumber: `STU2-${ts}`,
        firstName: "Bob",
        lastName: "Student",
        userId: student2User.id,
        admissionDate: new Date(),
        gender: GenderEnum.MALE,
      },
    });
    await kernel.db.enrollment.create({
      data: { tenantId: tenant.id, schoolId: schoolA.id, academicYearId: academicYear1.id, classId: cls.id, armId: arm1.id, studentId: student2.id, status: "ACTIVE" },
    });

    // Guardian 1 (Parent of Student 1)
    const parent1User = await kernel.db.user.create({
      data: { email: `par1-${ts}@test.com`, passwordHash: "hash" },
    });
    const guardian1 = await kernel.db.guardian.create({
      data: { tenantId: tenant.id, firstName: "Parent", lastName: "One", userId: parent1User.id, phone: "111222333" },
    });
    await kernel.db.studentGuardian.create({
      data: { tenantId: tenant.id, studentId: student1.id, guardianId: guardian1.id, relationship: "FATHER", isPrimary: true },
    });

    // Admin user for workflow reviews
    const adminUser = await kernel.db.user.create({
      data: { email: `admin-${ts}@test.com`, passwordHash: "hash" },
    });

    // Assignments for Math and English
    await kernel.db.teacherSubjectAssignment.create({
      data: {
        tenantId: tenant.id,
        schoolId: schoolA.id,
        academicYearId: academicYear1.id,
        termId: term1.id,
        classId: cls.id,
        armId: arm1.id,
        subjectId: subjectMath.id,
        teacherId: primaryTeacherStaff.id,
        isPrimary: true,
        scope: AssignmentScope.ARM_SPECIFIC,
      },
    });

    await kernel.db.teacherSubjectAssignment.create({
      data: {
        tenantId: tenant.id,
        schoolId: schoolA.id,
        academicYearId: academicYear1.id,
        termId: term1.id,
        classId: cls.id,
        armId: arm1.id,
        subjectId: subjectEnglish.id,
        teacherId: primaryTeacherStaff.id,
        isPrimary: true,
        scope: AssignmentScope.ARM_SPECIFIC,
      },
    });

    // --- SCENARIO 1: Legacy publication path is BLOCKED ---
    try {
      await legacyResultsService.publishResults(tenant.id, schoolA.id, term1.id, cls.id);
      throw new Error("Scenario 1 Failed: Legacy publishResults should be blocked!");
    } catch (err: any) {
      if (err.message.includes("Direct publication of results is disabled")) {
        console.log("Scenario 1: Legacy publication path is BLOCKED -> PASSED");
      } else {
        throw err;
      }
    }

    // --- SCENARIO 2: DRAFT & SUBMITTED results are INVISIBLE to Student & Parent Portals ---
    await teacherGradebookService.saveGradebookDraft(
      tenant.id,
      schoolA.id,
      primaryTeacherUser.id,
      {
        academicYearId: academicYear1.id,
        termId: term1.id,
        classId: cls.id,
        armId: arm1.id,
        subjectId: subjectMath.id,
        entries: [{ studentId: student1.id, scores: [{ type: "CA1", maxScore: 20, score: 18 }] }],
      },
    );

    const stuResultsDraft = await studentPortalService.getResults(student1User.id, tenant.id, schoolA.id);
    const parResultsDraft = await parentPortalService.getChildResults(parent1User.id, tenant.id, student1.id);

    if (stuResultsDraft.results.length === 0 && parResultsDraft.results.length === 0) {
      console.log("Scenario 2: DRAFT gradebook results are INVISIBLE to Student & Parent portals -> PASSED");
    } else {
      throw new Error("Scenario 2 Failed: DRAFT gradebook results were leaked to Student or Parent portal!");
    }

    // Submit Math gradebook
    const subMath = await teacherGradebookService.submitGradebook(
      tenant.id,
      schoolA.id,
      primaryTeacherUser.id,
      { academicYearId: academicYear1.id, termId: term1.id, classId: cls.id, armId: arm1.id, subjectId: subjectMath.id },
    );

    const stuResultsSub = await studentPortalService.getResults(student1User.id, tenant.id, schoolA.id);
    const parResultsSub = await parentPortalService.getChildResults(parent1User.id, tenant.id, student1.id);

    if (stuResultsSub.results.length === 0 && parResultsSub.results.length === 0) {
      console.log("Scenario 3: SUBMITTED gradebook results remain INVISIBLE to Student & Parent portals -> PASSED");
    } else {
      throw new Error("Scenario 3 Failed: SUBMITTED gradebook results were leaked to Student or Parent portal!");
    }

    // Approve Math gradebook (still not published)
    const appMath = await workflowService.approveGradebook(tenant.id, schoolA.id, { submissionId: subMath.submissionId }, adminUser.id, "SCHOOL_ADMIN");

    const stuResultsApp = await studentPortalService.getResults(student1User.id, tenant.id, schoolA.id);
    const parResultsApp = await parentPortalService.getChildResults(parent1User.id, tenant.id, student1.id);

    if (stuResultsApp.results.length === 0 && parResultsApp.results.length === 0) {
      console.log("Scenario 4: APPROVED (un-published) gradebook results remain INVISIBLE to portals -> PASSED");
    } else {
      throw new Error("Scenario 4 Failed: APPROVED gradebook results were leaked to Student or Parent portal!");
    }

    // --- SCENARIO 5: PUBLISHED gradebook results ARE visible to Student & Parent Portals ---
    await workflowService.publishGradebook(tenant.id, schoolA.id, { submissionId: appMath.id }, adminUser.id, "SCHOOL_ADMIN");

    const stuResultsPub = await studentPortalService.getResults(student1User.id, tenant.id, schoolA.id);
    const parResultsPub = await parentPortalService.getChildResults(parent1User.id, tenant.id, student1.id);

    if (stuResultsPub.results.length === 1 && parResultsPub.results.length === 1 && stuResultsPub.summary.totalScore === 18) {
      console.log("Scenario 5: PUBLISHED gradebook results are VISIBLE to Student & Parent portals -> PASSED");
    } else {
      throw new Error("Scenario 5 Failed: PUBLISHED gradebook results were missing from Student or Parent portal!");
    }

    // --- SCENARIO 6: Reopening PUBLISHED gradebook IMMEDIATELY removes portal visibility ---
    await workflowService.reopenGradebook(
      tenant.id,
      schoolA.id,
      { submissionId: appMath.id, reason: "Score adjustment required by academic committee" },
      adminUser.id,
      "SCHOOL_ADMIN",
    );

    const stuResultsReopen = await studentPortalService.getResults(student1User.id, tenant.id, schoolA.id);
    const parResultsReopen = await parentPortalService.getChildResults(parent1User.id, tenant.id, student1.id);

    if (stuResultsReopen.results.length === 0 && parResultsReopen.results.length === 0) {
      console.log("Scenario 6: Reopened gradebook results IMMEDIATELY disappear from Student & Parent portals -> PASSED");
    } else {
      throw new Error("Scenario 6 Failed: Reopened gradebook results remained visible!");
    }

    // --- SCENARIO 7: Full workflow re-publication restores portal visibility ---
    await teacherGradebookService.saveGradebookDraft(
      tenant.id,
      schoolA.id,
      primaryTeacherUser.id,
      {
        academicYearId: academicYear1.id,
        termId: term1.id,
        classId: cls.id,
        armId: arm1.id,
        subjectId: subjectMath.id,
        entries: [{ studentId: student1.id, scores: [{ type: "CA1", maxScore: 20, score: 19 }] }],
      },
    );

    const resubMath = await teacherGradebookService.submitGradebook(
      tenant.id,
      schoolA.id,
      primaryTeacherUser.id,
      { academicYearId: academicYear1.id, termId: term1.id, classId: cls.id, armId: arm1.id, subjectId: subjectMath.id },
    );

    const reAppMath = await workflowService.approveGradebook(tenant.id, schoolA.id, { submissionId: resubMath.submissionId }, adminUser.id, "SCHOOL_ADMIN");
    await workflowService.publishGradebook(tenant.id, schoolA.id, { submissionId: reAppMath.id }, adminUser.id, "SCHOOL_ADMIN");

    const stuResultsRepub = await studentPortalService.getResults(student1User.id, tenant.id, schoolA.id);
    if (stuResultsRepub.results.length === 1 && stuResultsRepub.summary.totalScore === 19) {
      console.log("Scenario 7: Full workflow re-publication restores portal visibility with updated score -> PASSED");
    } else {
      throw new Error("Scenario 7 Failed: Re-published gradebook scores were incorrect!");
    }

    // --- SCENARIO 8: Parent accessing unlinked child is REJECTED ---
    try {
      await parentPortalService.getChildResults(parent1User.id, tenant.id, student2.id);
      throw new Error("Scenario 8 Failed: Parent accessing unlinked child should fail!");
    } catch (err: any) {
      if (err.message.includes("do not have authorization")) {
        console.log("Scenario 8: Parent accessing unlinked child is REJECTED -> PASSED");
      } else {
        throw err;
      }
    }

    // --- SCENARIO 9: Year & Term filtering operates correctly within authorized scope ---
    const term1Filtered = await studentPortalService.getResults(student1User.id, tenant.id, schoolA.id, academicYear1.id, term1.id);
    const term2Filtered = await studentPortalService.getResults(student1User.id, tenant.id, schoolA.id, academicYear1.id, term2.id);

    if (term1Filtered.results.length === 1 && term2Filtered.results.length === 0) {
      console.log("Scenario 9: Year & Term filtering operates correctly -> PASSED");
    } else {
      throw new Error("Scenario 9 Failed: Year/term filtering failed!");
    }

    // --- SCENARIO 10: Cross-school and cross-tenant portal result requests are REJECTED ---
    try {
      await studentPortalService.getResults(student1User.id, tenant.id, schoolB.id);
      throw new Error("Scenario 10 Failed: Cross-school student results request should be rejected");
    } catch (err: any) {
      if (err.message.includes("No active student profile linked")) {
        console.log("Scenario 10: Cross-school portal result request is REJECTED -> PASSED");
      } else {
        throw err;
      }
    }
  });

  // Clean up tenant
  try {
    await kernel.db.subjectResult.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.gradebookSubmission.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.tenant.delete({ where: { id: tenant.id } });
  } catch (_e) {}

  console.log("\n==================================================");
  console.log("ALL STEP 6 PORTAL RESULT & SECURITY TESTS PASSED!");
  console.log("==================================================\n");
}

main().catch((err) => {
  console.error("Step 6 Integration Test Suite Failed:", err);
  process.exit(1);
});
