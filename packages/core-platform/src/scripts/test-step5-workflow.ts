import { kernel, tenantContext, AssignmentScope, WorkflowStatus, StaffType, GenderEnum } from "../index";
import { AcademicsRepository } from "../../../../apps/api-gateway/src/modules/academics/repositories/academics.repository";
import { TeacherAssignmentsService } from "../../../../apps/api-gateway/src/modules/academics/services/teacher-assignments.service";
import { TeacherGradebookService } from "../../../../apps/api-gateway/src/modules/academics/services/teacher-gradebook.service";
import { GradebookWorkflowService } from "../../../../apps/api-gateway/src/modules/academics/services/gradebook-workflow.service";
import { StudentPortalService } from "../../../../apps/api-gateway/src/modules/portal-student/services/student-portal.service";
import { ParentPortalService } from "../../../../apps/api-gateway/src/modules/portal-parent/services/parent-portal.service";
import { seedAcademicRolePermissionsForTenant } from "./seed-academics-permissions";

async function main() {
  console.log("=== PHASE 5G STEP 5 SUBMISSION, ADMIN REVIEW, APPROVAL & PUBLICATION TEST SUITE ===");

  const academicsRepo = new AcademicsRepository();
  const assignmentsService = new TeacherAssignmentsService(academicsRepo);
  const teacherGradebookService = new TeacherGradebookService(assignmentsService);

  const workflowService = new GradebookWorkflowService();
  const studentPortalService = new StudentPortalService({} as any, {} as any);
  const parentPortalService = new ParentPortalService();

  const ts = Date.now();

  // 1. Setup tenant
  const tenant = await kernel.db.tenant.create({
    data: { name: "Step5 Test Tenant", slug: `step5-tenant-${ts}` },
  });

  await tenantContext.run({ tenantId: tenant.id }, async () => {
    const school = await kernel.db.school.create({
      data: { tenantId: tenant.id, name: "Step5 School A" },
    });

    const schoolB = await kernel.db.school.create({
      data: { tenantId: tenant.id, name: "Step5 School B" },
    });

    const campus = await kernel.db.campus.create({
      data: { tenantId: tenant.id, schoolId: school.id, name: "Main Campus" },
    });

    const academicYear = await kernel.db.academicYear.create({
      data: { tenantId: tenant.id, schoolId: school.id, name: "2026/2027", startDate: new Date("2026-09-01"), endDate: new Date("2027-07-31") },
    });

    const term = await kernel.db.term.create({
      data: { tenantId: tenant.id, academicYearId: academicYear.id, name: "Term 1", startDate: new Date("2026-09-01"), endDate: new Date("2026-12-20") },
    });

    const cls = await kernel.db.class.create({
      data: { tenantId: tenant.id, schoolId: school.id, name: "Grade 10" },
    });

    const arm1 = await kernel.db.arm.create({
      data: { tenantId: tenant.id, campusId: campus.id, classId: cls.id, name: "Arm Gold" },
    });

    const subject = await kernel.db.subject.create({
      data: { tenantId: tenant.id, schoolId: school.id, name: "Mathematics" },
    });

    // Seed permissions in catalog and roles
    await seedAcademicRolePermissionsForTenant(tenant.id);

    // Create Primary & Co-Teacher Users & Staff Profiles
    const primaryTeacherUser = await kernel.db.user.create({
      data: { email: `pri-${ts}@test.com`, passwordHash: "hash" },
    });

    const primaryTeacherStaff = await kernel.db.staffProfile.create({
      data: { tenantId: tenant.id, schoolId: school.id, userId: primaryTeacherUser.id, staffNumber: `STF-PRI-${ts}`, firstName: "Primary", lastName: "Teacher", joiningDate: new Date(), type: StaffType.TEACHING, status: "ACTIVE" },
    });

    const coteacherUser = await kernel.db.user.create({
      data: { email: `co-${ts}@test.com`, passwordHash: "hash" },
    });

    const coteacherStaff = await kernel.db.staffProfile.create({
      data: { tenantId: tenant.id, schoolId: school.id, userId: coteacherUser.id, staffNumber: `STF-CO-${ts}`, firstName: "Co", lastName: "Teacher", joiningDate: new Date(), type: StaffType.TEACHING, status: "ACTIVE" },
    });

    const unassignedUser = await kernel.db.user.create({
      data: { email: `unassigned-${ts}@test.com`, passwordHash: "hash" },
    });

    const unassignedStaff = await kernel.db.staffProfile.create({
      data: { tenantId: tenant.id, schoolId: school.id, userId: unassignedUser.id, staffNumber: `STF-UN-${ts}`, firstName: "Unassigned", lastName: "Teacher", joiningDate: new Date(), type: StaffType.TEACHING, status: "ACTIVE" },
    });

    // Create Students, Users, Enrollments & Guardians
    const studentUser = await kernel.db.user.create({
      data: { email: `stu-${ts}@test.com`, passwordHash: "hash" },
    });

    const student = await kernel.db.student.create({
      data: {
        tenantId: tenant.id,
        schoolId: school.id,
        studentNumber: `STU-${ts}`,
        firstName: "Alice",
        lastName: "Student",
        userId: studentUser.id,
        admissionDate: new Date(),
        gender: GenderEnum.FEMALE,
      },
    });

    const enrollment = await kernel.db.enrollment.create({
      data: { tenantId: tenant.id, schoolId: school.id, academicYearId: academicYear.id, classId: cls.id, armId: arm1.id, studentId: student.id, status: "ACTIVE" },
    });

    const guardianUser = await kernel.db.user.create({
      data: { email: `parent-${ts}@test.com`, passwordHash: "hash" },
    });

    const guardian = await kernel.db.guardian.create({
      data: { tenantId: tenant.id, firstName: "Bob", lastName: "Parent", userId: guardianUser.id, phone: "123456789" },
    });

    await kernel.db.studentGuardian.create({
      data: { tenantId: tenant.id, studentId: student.id, guardianId: guardian.id, relationship: "FATHER", isPrimary: true },
    });

    // Administrative users
    const adminUser = await kernel.db.user.create({
      data: { email: `admin-${ts}@test.com`, passwordHash: "hash" },
    });

    // Create Teacher Assignments
    await kernel.db.teacherSubjectAssignment.create({
      data: {
        tenantId: tenant.id,
        schoolId: school.id,
        academicYearId: academicYear.id,
        termId: term.id,
        classId: cls.id,
        armId: arm1.id,
        subjectId: subject.id,
        teacherId: primaryTeacherStaff.id,
        isPrimary: true,
        scope: AssignmentScope.ARM_SPECIFIC,
      },
    });

    await kernel.db.teacherSubjectAssignment.create({
      data: {
        tenantId: tenant.id,
        schoolId: school.id,
        academicYearId: academicYear.id,
        termId: term.id,
        classId: cls.id,
        armId: arm1.id,
        subjectId: subject.id,
        teacherId: coteacherStaff.id,
        isPrimary: false,
        scope: AssignmentScope.ARM_SPECIFIC,
      },
    });

    console.log("-> Test fixture environment seeded cleanly.\n");

    // --- SCENARIO 1: Primary teacher saves DRAFT and submits gradebook (DRAFT -> SUBMITTED) ---
    await teacherGradebookService.saveGradebookDraft(
      tenant.id,
      school.id,
      primaryTeacherUser.id,
      {
        academicYearId: academicYear.id,
        termId: term.id,
        classId: cls.id,
        armId: arm1.id,
        subjectId: subject.id,
        entries: [{ studentId: student.id, scores: [{ type: "CA1", maxScore: 20, score: 15 }] }],
      },
    );

    const sub1Res = await teacherGradebookService.submitGradebook(
      tenant.id,
      school.id,
      primaryTeacherUser.id,
      {
        academicYearId: academicYear.id,
        termId: term.id,
        classId: cls.id,
        armId: arm1.id,
        subjectId: subject.id,
      },
    );

    const sub1Id = sub1Res.submissionId;

    if (sub1Res.status === WorkflowStatus.SUBMITTED) {
      console.log("Scenario 1: Valid teacher submission enters SUBMITTED -> PASSED");
    } else {
      throw new Error(`Scenario 1 Failed: Expected SUBMITTED got ${sub1Res.status}`);
    }

    // --- SCENARIO 2: Non-primary teacher submission attempt is REJECTED ---
    try {
      await teacherGradebookService.submitGradebook(
        tenant.id,
        school.id,
        coteacherUser.id,
        {
          academicYearId: academicYear.id,
          termId: term.id,
          classId: cls.id,
          armId: arm1.id,
          subjectId: subject.id,
        },
      );
      throw new Error("Scenario 2 Failed: Non-primary submission should have been rejected");
    } catch (err: any) {
      if (err.message.includes("Only the designated primary teacher")) {
        console.log("Scenario 2: Non-primary teacher cannot submit -> PASSED");
      } else {
        throw err;
      }
    }

    // --- SCENARIO 3: Authorized reviewer can inspect SUBMITTED ---
    const list1 = await workflowService.listSubmissions(tenant.id, school.id, {
      status: WorkflowStatus.SUBMITTED,
    });
    if (list1.length > 0 && list1[0].id === sub1Id) {
      console.log("Scenario 3: Authorized reviewer can inspect SUBMITTED gradebooks -> PASSED");
    } else {
      throw new Error("Scenario 3 Failed: List submissions did not return submitted gradebook");
    }

    // --- SCENARIO 4: Rejection without mandatory reason is REJECTED ---
    try {
      await workflowService.rejectGradebook(
        tenant.id,
        school.id,
        { submissionId: sub1Id, reason: "  " },
        adminUser.id,
        "SCHOOL_ADMIN",
      );
      throw new Error("Scenario 4 Failed: Rejection without reason should have failed");
    } catch (err: any) {
      if (err.message.includes("Rejection reason is required") || err.message.includes("at least 3 characters")) {
        console.log("Scenario 4: Rejection without reason is REJECTED -> PASSED");
      } else {
        throw err;
      }
    }

    // --- SCENARIO 5: Authorized reviewer can reject SUBMITTED with reason (SUBMITTED -> REJECTED) ---
    const rej1 = await workflowService.rejectGradebook(
      tenant.id,
      school.id,
      { submissionId: sub1Id, reason: "CA scores need re-checking by department" },
      adminUser.id,
      "SCHOOL_ADMIN",
    );

    if (rej1.status === WorkflowStatus.REJECTED && rej1.rejectionReason === "CA scores need re-checking by department") {
      console.log("Scenario 5: Authorized reviewer can reject SUBMITTED with reason -> PASSED");
    } else {
      throw new Error(`Scenario 5 Failed: Expected REJECTED got ${rej1.status}`);
    }

    // --- SCENARIO 6: Rejected gradebook allows teacher score editing ---
    await teacherGradebookService.saveGradebookDraft(
      tenant.id,
      school.id,
      primaryTeacherUser.id,
      {
        academicYearId: academicYear.id,
        termId: term.id,
        classId: cls.id,
        armId: arm1.id,
        subjectId: subject.id,
        entries: [{ studentId: student.id, scores: [{ type: "CA1", maxScore: 20, score: 18 }] }],
      },
    );
    console.log("Scenario 6: Rejected gradebook returns to teacher editing -> PASSED");

    // --- SCENARIO 7: Rejected gradebook can be resubmitted (REJECTED -> SUBMITTED) ---
    const resubRes = await teacherGradebookService.submitGradebook(
      tenant.id,
      school.id,
      primaryTeacherUser.id,
      {
        academicYearId: academicYear.id,
        termId: term.id,
        classId: cls.id,
        armId: arm1.id,
        subjectId: subject.id,
      },
    );

    const resubId = resubRes.submissionId;

    if (resubRes.status === WorkflowStatus.SUBMITTED) {
      console.log("Scenario 7: Rejected gradebook can be resubmitted -> PASSED");
    } else {
      throw new Error(`Scenario 7 Failed: Expected SUBMITTED got ${resubRes.status}`);
    }

    // --- SCENARIO 8: Direct publication of SUBMITTED gradebook is REJECTED (Approval required) ---
    try {
      await workflowService.publishGradebook(
        tenant.id,
        school.id,
        { submissionId: resubId },
        adminUser.id,
        "SCHOOL_ADMIN",
      );
      throw new Error("Scenario 8 Failed: Direct publish of SUBMITTED should have failed");
    } catch (err: any) {
      if (err.message.includes("Only APPROVED gradebooks can be published")) {
        console.log("Scenario 8: Direct publication of SUBMITTED gradebook is REJECTED -> PASSED");
      } else {
        throw err;
      }
    }

    // --- SCENARIO 9: Authorized reviewer can approve SUBMITTED (SUBMITTED -> APPROVED) ---
    const app1 = await workflowService.approveGradebook(
      tenant.id,
      school.id,
      { submissionId: resubId },
      adminUser.id,
      "SCHOOL_ADMIN",
    );

    if (app1.status === WorkflowStatus.APPROVED) {
      console.log("Scenario 9: Authorized reviewer can approve SUBMITTED -> PASSED");
    } else {
      throw new Error(`Scenario 9 Failed: Expected APPROVED got ${app1.status}`);
    }

    // --- SCENARIO 10: Unpublished result remains invisible to Student Portal ---
    const stuRes1 = await studentPortalService.getResults(studentUser.id, tenant.id, school.id);
    const stuResults1 = stuRes1.results || stuRes1;
    if (stuResults1.length === 0) {
      console.log("Scenario 10: Unpublished result remains invisible to Student Portal -> PASSED");
    } else {
      throw new Error(`Scenario 10 Failed: Expected 0 results got ${stuResults1.length}`);
    }

    // --- SCENARIO 11: Unpublished result remains invisible to Parent Portal ---
    const parRes1 = await parentPortalService.getChildResults(guardianUser.id, tenant.id, student.id);
    const parResults1 = parRes1.results || parRes1;
    if (parResults1.length === 0) {
      console.log("Scenario 11: Unpublished result remains invisible to Parent Portal -> PASSED");
    } else {
      throw new Error(`Scenario 11 Failed: Expected 0 results got ${parResults1.length}`);
    }

    // --- SCENARIO 12: Authorized publisher can publish APPROVED gradebook (APPROVED -> PUBLISHED) ---
    const pub1 = await workflowService.publishGradebook(
      tenant.id,
      school.id,
      { submissionId: app1.id },
      adminUser.id,
      "SCHOOL_ADMIN",
    );

    if (pub1.status === WorkflowStatus.PUBLISHED) {
      console.log("Scenario 12: Authorized publisher can publish an APPROVED gradebook -> PASSED");
    } else {
      throw new Error(`Scenario 12 Failed: Expected PUBLISHED got ${pub1.status}`);
    }

    // --- SCENARIO 13: Published result IS now visible to Student Portal ---
    const stuRes2 = await studentPortalService.getResults(studentUser.id, tenant.id, school.id);
    const stuResults2 = stuRes2.results || stuRes2;
    if (stuResults2.length > 0 && stuResults2[0].status === "PUBLISHED") {
      console.log("Scenario 13: Published result is visible through Student Portal -> PASSED");
    } else {
      throw new Error(`Scenario 13 Failed: Expected visible published result got ${JSON.stringify(stuResults2)}`);
    }

    // --- SCENARIO 14: Published result IS now visible to Parent Portal ---
    const parRes2 = await parentPortalService.getChildResults(guardianUser.id, tenant.id, student.id);
    const parResults2 = parRes2.results || parRes2;
    if (parResults2.length > 0 && parResults2[0].status === "PUBLISHED") {
      console.log("Scenario 14: Published result is visible through Parent Portal -> PASSED");
    } else {
      throw new Error(`Scenario 14 Failed: Expected visible published result for parent got ${JSON.stringify(parResults2)}`);
    }

    // --- SCENARIO 15: Published gradebook is locked against ordinary teacher editing ---
    try {
      await teacherGradebookService.saveGradebookDraft(
        tenant.id,
        school.id,
        primaryTeacherUser.id,
        {
          academicYearId: academicYear.id,
          termId: term.id,
          classId: cls.id,
          armId: arm1.id,
          subjectId: subject.id,
          entries: [{ studentId: student.id, scores: [{ type: "CA1", maxScore: 20, score: 20 }] }],
        },
      );
      throw new Error("Scenario 15 Failed: Editing published gradebook should have failed");
    } catch (err: any) {
      if (err.message.includes("is currently PUBLISHED and cannot be modified")) {
        console.log("Scenario 15: Published gradebook is locked against ordinary teacher editing -> PASSED");
      } else {
        throw err;
      }
    }

    // --- SCENARIO 16: Reopen without mandatory reason is REJECTED ---
    try {
      await workflowService.reopenGradebook(
        tenant.id,
        school.id,
        { submissionId: pub1.id, reason: "" },
        adminUser.id,
        "SCHOOL_ADMIN",
      );
      throw new Error("Scenario 16 Failed: Reopen without reason should have failed");
    } catch (err: any) {
      if (err.message.includes("Reopen reason is required") || err.message.includes("at least 3 characters")) {
        console.log("Scenario 16: Reopen without reason is REJECTED -> PASSED");
      } else {
        throw err;
      }
    }

    // --- SCENARIO 17: Authorized admin reopens PUBLISHED gradebook (PUBLISHED -> DRAFT) ---
    const reop1 = await workflowService.reopenGradebook(
      tenant.id,
      school.id,
      { submissionId: pub1.id, reason: "Administrative error in exam score computation" },
      adminUser.id,
      "SCHOOL_ADMIN",
    );

    if (reop1.status === WorkflowStatus.DRAFT && reop1.reopenReason === "Administrative error in exam score computation") {
      console.log("Scenario 17: Reopened result returns to DRAFT -> PASSED");
    } else {
      throw new Error(`Scenario 17 Failed: Expected DRAFT got ${reop1.status}`);
    }

    // --- SCENARIO 18: Reopened result immediately becomes invisible to Student & Parent portals ---
    const stuRes3 = await studentPortalService.getResults(studentUser.id, tenant.id, school.id);
    const parRes3 = await parentPortalService.getChildResults(guardianUser.id, tenant.id, student.id);
    const stuResults3 = stuRes3.results || stuRes3;
    const parResults3 = parRes3.results || parRes3;
    if (stuResults3.length === 0 && parResults3.length === 0) {
      console.log("Scenario 18: Reopened result returns to DRAFT and is no longer treated as published -> PASSED");
    } else {
      throw new Error("Scenario 18 Failed: Reopened results were still visible to Student or Parent portal!");
    }

    // --- SCENARIO 19: Re-publication after full workflow (DRAFT -> SUBMITTED -> APPROVED -> PUBLISHED) ---
    await teacherGradebookService.saveGradebookDraft(
      tenant.id,
      school.id,
      primaryTeacherUser.id,
      {
        academicYearId: academicYear.id,
        termId: term.id,
        classId: cls.id,
        armId: arm1.id,
        subjectId: subject.id,
        entries: [{ studentId: student.id, scores: [{ type: "CA1", maxScore: 20, score: 20 }] }],
      },
    );

    const resub2Res = await teacherGradebookService.submitGradebook(
      tenant.id,
      school.id,
      primaryTeacherUser.id,
      { academicYearId: academicYear.id, termId: term.id, classId: cls.id, armId: arm1.id, subjectId: subject.id },
    );

    const app2 = await workflowService.approveGradebook(tenant.id, school.id, { submissionId: resub2Res.submissionId }, adminUser.id, "SCHOOL_ADMIN");
    const pub2 = await workflowService.publishGradebook(tenant.id, school.id, { submissionId: app2.id }, adminUser.id, "SCHOOL_ADMIN");

    if (pub2.status === WorkflowStatus.PUBLISHED) {
      console.log("Scenario 19: Re-publication after full workflow is enforced correctly -> PASSED");
    } else {
      throw new Error(`Scenario 19 Failed: Expected PUBLISHED got ${pub2.status}`);
    }

    // --- SCENARIO 20: Cross-school review/approval attempt is REJECTED ---
    try {
      await workflowService.approveGradebook(tenant.id, schoolB.id, { submissionId: pub2.id }, adminUser.id, "SCHOOL_ADMIN");
      throw new Error("Scenario 20 Failed: Cross-school approve should have failed");
    } catch (err: any) {
      if (err.message.includes("Gradebook submission not found")) {
        console.log("Scenario 20: Cross-school review/approval is REJECTED -> PASSED");
      } else {
        throw err;
      }
    }

    // --- SCENARIO 21: Cross-tenant review/approval attempt is REJECTED ---
    try {
      await workflowService.approveGradebook("other-tenant-id", school.id, { submissionId: pub2.id }, adminUser.id, "SCHOOL_ADMIN");
      throw new Error("Scenario 21 Failed: Cross-tenant approve should have failed");
    } catch (err: any) {
      if (err.message.includes("Gradebook submission not found")) {
        console.log("Scenario 21: Cross-tenant review/approval is REJECTED -> PASSED");
      } else {
        throw err;
      }
    }

    // --- SCENARIO 22: Invalid workflow transitions are REJECTED ---
    try {
      await workflowService.approveGradebook(tenant.id, school.id, { submissionId: pub2.id }, adminUser.id, "SCHOOL_ADMIN");
      throw new Error("Scenario 22 Failed: Approving PUBLISHED gradebook should fail");
    } catch (err: any) {
      if (err.message.includes("Cannot approve gradebook with status PUBLISHED")) {
        console.log("Scenario 22: Invalid workflow transitions are REJECTED -> PASSED");
      } else {
        throw err;
      }
    }

    // --- SCENARIO 23: Audit records created for each workflow transition ---
    const auditLogs = await kernel.db.workflowAuditLog.findMany({
      where: { tenantId: tenant.id, schoolId: school.id, gradebookSubmissionId: pub2.id },
      orderBy: { createdAt: "asc" },
    });

    if (auditLogs.length >= 6) {
      console.log(`Scenario 23: Audit records created for each workflow transition (${auditLogs.length} logs recorded) -> PASSED`);
    } else {
      throw new Error(`Scenario 23 Failed: Expected at least 6 audit logs got ${auditLogs.length}`);
    }

    // --- SCENARIO 24: Unassigned teacher submission attempt is REJECTED ---
    try {
      await teacherGradebookService.submitGradebook(
        tenant.id,
        school.id,
        unassignedUser.id,
        {
          classId: cls.id,
          armId: arm1.id,
          subjectId: subject.id,
          academicYearId: academicYear.id,
          termId: term.id,
        },
      );
      throw new Error("Scenario 24 Failed: Unassigned teacher should not be authorized to submit");
    } catch (err: any) {
      if (err.message.includes("is not authorized") || err.message.includes("is not assigned to teach")) {
        console.log("Scenario 24: Unassigned teacher submission attempt is REJECTED -> PASSED");
      } else {
        throw err;
      }
    }

    // --- SCENARIO 25: Direct publication attempt of REJECTED gradebook is REJECTED ---
    const subj2 = await kernel.db.subject.create({
      data: { tenantId: tenant.id, schoolId: school.id, name: "Physics" },
    });
    await kernel.db.teacherSubjectAssignment.create({
      data: {
        tenantId: tenant.id,
        schoolId: school.id,
        academicYearId: academicYear.id,
        termId: term.id,
        classId: cls.id,
        armId: arm1.id,
        subjectId: subj2.id,
        teacherId: primaryTeacherStaff.id,
        isPrimary: true,
        scope: AssignmentScope.ARM_SPECIFIC,
      },
    });

    await teacherGradebookService.saveGradebookDraft(
      tenant.id,
      school.id,
      primaryTeacherUser.id,
      {
        academicYearId: academicYear.id,
        termId: term.id,
        classId: cls.id,
        armId: arm1.id,
        subjectId: subj2.id,
        entries: [{ studentId: student.id, scores: [{ type: "CA1", maxScore: 20, score: 15 }] }],
      },
    );

    const subToReject = await teacherGradebookService.submitGradebook(
      tenant.id,
      school.id,
      primaryTeacherUser.id,
      {
        academicYearId: academicYear.id,
        termId: term.id,
        classId: cls.id,
        armId: arm1.id,
        subjectId: subj2.id,
      },
    );

    const rejectedSub = await workflowService.rejectGradebook(
      tenant.id,
      school.id,
      {
        submissionId: subToReject.submissionId,
        reason: "Test rejection for publication check",
      },
      adminUser.id,
      "SCHOOL_ADMIN",
    );

    try {
      await workflowService.publishGradebook(
        tenant.id,
        school.id,
        { submissionId: rejectedSub.id },
        adminUser.id,
        "SCHOOL_ADMIN",
      );
      throw new Error("Scenario 25 Failed: Direct publication of REJECTED gradebook should fail");
    } catch (err: any) {
      if (err.message.includes("Cannot publish gradebook with status REJECTED")) {
        console.log("Scenario 25: Direct publication attempt of REJECTED gradebook is REJECTED -> PASSED");
      } else {
        throw err;
      }
    }

    // --- SCENARIO 26: Rejection attempt of DRAFT gradebook is REJECTED ---
    const subj3 = await kernel.db.subject.create({
      data: { tenantId: tenant.id, schoolId: school.id, name: "Chemistry" },
    });
    await kernel.db.teacherSubjectAssignment.create({
      data: {
        tenantId: tenant.id,
        schoolId: school.id,
        academicYearId: academicYear.id,
        termId: term.id,
        classId: cls.id,
        armId: arm1.id,
        subjectId: subj3.id,
        teacherId: primaryTeacherStaff.id,
        isPrimary: true,
        scope: AssignmentScope.ARM_SPECIFIC,
      },
    });

    const draftRes = await teacherGradebookService.saveGradebookDraft(
      tenant.id,
      school.id,
      primaryTeacherUser.id,
      {
        academicYearId: academicYear.id,
        termId: term.id,
        classId: cls.id,
        armId: arm1.id,
        subjectId: subj3.id,
        entries: [{ studentId: student.id, scores: [{ type: "CA1", maxScore: 20, score: 10 }] }],
      },
    );

    try {
      await workflowService.rejectGradebook(
        tenant.id,
        school.id,
        { submissionId: draftRes.submissionId, reason: "Invalid" },
        adminUser.id,
        "SCHOOL_ADMIN",
      );
      throw new Error("Scenario 26 Failed: Rejecting DRAFT gradebook should fail");
    } catch (err: any) {
      if (err.message.includes("Cannot reject gradebook with status DRAFT")) {
        console.log("Scenario 26: Rejection attempt of DRAFT gradebook is REJECTED -> PASSED");
      } else {
        throw err;
      }
    }

    // --- SCENARIO 27: Approval attempt of DRAFT gradebook is REJECTED ---
    try {
      await workflowService.approveGradebook(
        tenant.id,
        school.id,
        { submissionId: draftRes.submissionId },
        adminUser.id,
        "SCHOOL_ADMIN",
      );
      throw new Error("Scenario 27 Failed: Approving DRAFT gradebook should fail");
    } catch (err: any) {
      if (err.message.includes("Cannot approve gradebook with status DRAFT")) {
        console.log("Scenario 27: Approval attempt of DRAFT gradebook is REJECTED -> PASSED");
      } else {
        throw err;
      }
    }

    // --- SCENARIO 28: Reopen attempt of non-PUBLISHED gradebook is REJECTED ---
    try {
      await workflowService.reopenGradebook(
        tenant.id,
        school.id,
        { submissionId: draftRes.submissionId, reason: "Invalid" },
        adminUser.id,
        "SUPER_ADMIN",
      );
      throw new Error("Scenario 28 Failed: Reopening DRAFT gradebook should fail");
    } catch (err: any) {
      if (err.message.includes("Cannot reopen gradebook with status DRAFT")) {
        console.log("Scenario 28: Reopen attempt of non-PUBLISHED gradebook is REJECTED -> PASSED");
      } else {
        throw err;
      }
    }
  });

  // Clean up test tenant records
  await tenantContext.run({ tenantId: tenant.id }, async () => {
    await kernel.db.workflowAuditLog.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.scoreAuditLog.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.gradebookSubmission.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.assessmentScore.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.subjectResult.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.teacherSubjectAssignment.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.enrollment.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.studentGuardian.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.student.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.guardian.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.staffProfile.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.subject.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.arm.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.class.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.term.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.academicYear.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.school.deleteMany({ where: { tenantId: tenant.id } });
    await kernel.db.tenant.delete({ where: { id: tenant.id } });
  });

  console.log("\n==================================================");
  console.log("ALL STEP 5 WORKFLOW & PUBLICATION TESTS PASSED!");
  console.log("==================================================\n");
}

main().catch((err) => {
  console.error("Step 5 Test Suite Failed:", err);
  process.exit(1);
});
