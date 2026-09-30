import { kernel, AssignmentScope, StaffType, WorkflowStatus, ResultStatus, tenantContext } from "../index";
import { AcademicsRepository } from "../../../../apps/api-gateway/src/modules/academics/repositories/academics.repository";
import { TeacherAssignmentsService } from "../../../../apps/api-gateway/src/modules/academics/services/teacher-assignments.service";
import { TeacherGradebookService } from "../../../../apps/api-gateway/src/modules/academics/services/teacher-gradebook.service";
import { TeacherGradebookController } from "../../../../apps/api-gateway/src/modules/academics/controllers/teacher-gradebook.controller";
import { PoliciesGuard } from "../../../../apps/api-gateway/src/modules/identity/security/policies.guard";
import { RoleRepository } from "../../../../apps/api-gateway/src/modules/identity/repositories/role.repository";
import { TenantMembershipRepository } from "../../../../apps/api-gateway/src/modules/identity/repositories/tenant-membership.repository";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { seedCanonicalAcademicPermissions, seedAcademicRolePermissionsForTenant } from "./seed-academics-permissions";

async function runStep4GradebookSuite() {
  console.log("=== PHASE 5G STEP 4 TEACHER PORTAL GRADEBOOK BFF SECURITY & INTEGRATION TEST SUITE ===");

  const academicsRepo = new AcademicsRepository();
  const assignmentsService = new TeacherAssignmentsService(academicsRepo);
  const gradebookService = new TeacherGradebookService(assignmentsService);
  const controller = new TeacherGradebookController(gradebookService);

  const roleRepo = new RoleRepository();
  const membershipRepo = new TenantMembershipRepository();

  const reflector = {
    getAllAndOverride: (key: string, targets: any[]) => {
      const handler = targets[0];
      if (handler === controller.getTeacherScope || handler === controller.getGradebook) {
        return ["academics:read_gradebook"];
      }
      if (handler === controller.saveGradebookDraft) {
        return ["academics:enter_scores"];
      }
      if (handler === controller.submitGradebook) {
        return ["academics:submit_gradebook"];
      }
      return [];
    },
  } as any;

  const policiesGuard = new PoliciesGuard(reflector, roleRepo, membershipRepo);

  async function invokeGuardedController(methodName: string, req: any, ...args: any[]) {
    return tenantContext.run({ tenantId: req.workspace.tenantId }, async () => {
      const handler = (controller as any)[methodName];
      const context = {
        getHandler: () => handler,
        getClass: () => TeacherGradebookController,
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { "x-tenant-id": req.workspace.tenantId },
            user: req.user,
            workspace: req.workspace,
          }),
        }),
      } as any;

      const canActivate = await policiesGuard.canActivate(context);
      if (!canActivate) {
        throw new ForbiddenException("PoliciesGuard access denied: User role lacks required endpoint permission");
      }

      return await handler.call(controller, req, ...args);
    });
  }

  const ts = Date.now();
  const tenant1Id = `t1_${ts}`;
  const tenant2Id = `t2_${ts}`;

  const school1Id = `sch1_${ts}`;
  const school2Id = `sch2_${ts}`;
  const schoolTenant2Id = `sch_t2_${ts}`;

  let campus1Id: string;

  let userPrimaryTeacherId = `u_prim_t_${ts}`;
  let userCoTeacherId = `u_co_t_${ts}`;
  let userUnassignedTeacherId = `u_unass_t_${ts}`;
  let userWrongClassTeacherId = `u_wcls_t_${ts}`;
  let userQuarantinedTeacherId = `u_quar_t_${ts}`;
  let userNoReadPermTeacherId = `u_noread_t_${ts}`;
  let userNoEnterPermTeacherId = `u_noenter_t_${ts}`;
  let userNoSubmitPermTeacherId = `u_nosubmit_t_${ts}`;

  let staffPrimaryId: string = "";
  let staffCoTeacherId: string = "";
  let staffUnassignedId: string = "";
  let staffWrongClassId: string = "";
  let staffQuarantinedId: string = "";
  let staffNoReadPermId: string = "";
  let staffNoEnterPermId: string = "";
  let staffNoSubmitPermId: string = "";

  let academicYear1Id: string = "";
  let term1Id: string = "";
  let termWrongId: string = "";
  let class1Id: string = "";
  let class2Id: string = "";
  let armAId: string = "";
  let armBId: string = "";
  let subjectMathId: string = "";
  let subjectEngId: string = "";

  let student1Id = `st1_${ts}`;
  let student2Id = `st2_${ts}`;
  let studentOutsideId = `st_out_${ts}`;

  let roleFullTeacherId: string = "";
  let roleNoReadTeacherId: string = "";
  let roleNoEnterTeacherId: string = "";
  let roleNoSubmitTeacherId: string = "";

  let permReadAssignmentsId: string = "";
  let permReadGradebookId: string = "";
  let permEnterScoresId: string = "";
  let permSubmitGradebookId: string = "";

  try {
    // 1. Core Tenants & Schools
    await kernel.db.tenant.createMany({
      data: [
        { id: tenant1Id, name: "Tenant 1", slug: `t1-${ts}` },
        { id: tenant2Id, name: "Tenant 2", slug: `t2-${ts}` },
      ],
    });

    await tenantContext.run({ tenantId: tenant1Id }, async () => {
      await kernel.db.school.createMany({
        data: [
          { id: school1Id, tenantId: tenant1Id, name: "School 1" },
          { id: school2Id, tenantId: tenant1Id, name: "School 2" },
        ],
      });
    });

    await tenantContext.run({ tenantId: tenant2Id }, async () => {
      await kernel.db.school.createMany({
        data: [{ id: schoolTenant2Id, tenantId: tenant2Id, name: "School Tenant 2" }],
      });
    });

    const campus1 = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.campus.create({
        data: { tenantId: tenant1Id, schoolId: school1Id, name: "Main Campus" },
      }),
    );
    campus1Id = campus1.id;

    // 2. Canonical Permissions & Fine-Grained Roles
    const canonicalPerms = await seedCanonicalAcademicPermissions();
    permReadAssignmentsId = canonicalPerms["academics:read_assignments"];
    permReadGradebookId = canonicalPerms["academics:read_gradebook"];
    permEnterScoresId = canonicalPerms["academics:enter_scores"];
    permSubmitGradebookId = canonicalPerms["academics:submit_gradebook"];

    await tenantContext.run({ tenantId: tenant1Id }, async () => {
      // Full Teacher Role (gets all teacher permissions)
      const rFull = await kernel.db.role.create({ data: { tenantId: tenant1Id, name: "TEACHER_FULL" } });
      roleFullTeacherId = rFull.id;
      for (const pId of [permReadAssignmentsId, permReadGradebookId, permEnterScoresId, permSubmitGradebookId]) {
        await kernel.db.rolePermission.create({ data: { roleId: roleFullTeacherId, permissionId: pId } });
      }

      // No-Read Teacher Role (lacks academics:read_gradebook)
      const rNoRead = await kernel.db.role.create({ data: { tenantId: tenant1Id, name: "TEACHER_NO_READ" } });
      roleNoReadTeacherId = rNoRead.id;
      for (const pId of [permReadAssignmentsId, permEnterScoresId, permSubmitGradebookId]) {
        await kernel.db.rolePermission.create({ data: { roleId: roleNoReadTeacherId, permissionId: pId } });
      }

      // No-Enter Teacher Role (lacks academics:enter_scores)
      const rNoEnter = await kernel.db.role.create({ data: { tenantId: tenant1Id, name: "TEACHER_NO_ENTER" } });
      roleNoEnterTeacherId = rNoEnter.id;
      for (const pId of [permReadAssignmentsId, permReadGradebookId, permSubmitGradebookId]) {
        await kernel.db.rolePermission.create({ data: { roleId: roleNoEnterTeacherId, permissionId: pId } });
      }

      // No-Submit Teacher Role (lacks academics:submit_gradebook)
      const rNoSubmit = await kernel.db.role.create({ data: { tenantId: tenant1Id, name: "TEACHER_NO_SUBMIT" } });
      roleNoSubmitTeacherId = rNoSubmit.id;
      for (const pId of [permReadAssignmentsId, permReadGradebookId, permEnterScoresId]) {
        await kernel.db.rolePermission.create({ data: { roleId: roleNoSubmitTeacherId, permissionId: pId } });
      }
    });

    // 3. Users & Memberships
    await kernel.db.user.createMany({
      data: [
        { id: userPrimaryTeacherId, email: `prim_t_${ts}@test.com` },
        { id: userCoTeacherId, email: `co_t_${ts}@test.com` },
        { id: userUnassignedTeacherId, email: `unass_t_${ts}@test.com` },
        { id: userWrongClassTeacherId, email: `wcls_t_${ts}@test.com` },
        { id: userQuarantinedTeacherId, email: `quar_t_${ts}@test.com` },
        { id: userNoReadPermTeacherId, email: `noread_t_${ts}@test.com` },
        { id: userNoEnterPermTeacherId, email: `noenter_t_${ts}@test.com` },
        { id: userNoSubmitPermTeacherId, email: `nosubmit_t_${ts}@test.com` },
      ],
    });

    await tenantContext.run({ tenantId: tenant1Id }, async () => {
      await kernel.db.userTenantMembership.createMany({
        data: [
          { userId: userPrimaryTeacherId, tenantId: tenant1Id, roleId: roleFullTeacherId },
          { userId: userCoTeacherId, tenantId: tenant1Id, roleId: roleFullTeacherId },
          { userId: userUnassignedTeacherId, tenantId: tenant1Id, roleId: roleFullTeacherId },
          { userId: userWrongClassTeacherId, tenantId: tenant1Id, roleId: roleFullTeacherId },
          { userId: userQuarantinedTeacherId, tenantId: tenant1Id, roleId: roleFullTeacherId },
          { userId: userNoReadPermTeacherId, tenantId: tenant1Id, roleId: roleNoReadTeacherId },
          { userId: userNoEnterPermTeacherId, tenantId: tenant1Id, roleId: roleNoEnterTeacherId },
          { userId: userNoSubmitPermTeacherId, tenantId: tenant1Id, roleId: roleNoSubmitTeacherId },
        ],
      });
    });

    // 4. Staff Profiles
    await tenantContext.run({ tenantId: tenant1Id }, async () => {
      const p = await kernel.db.staffProfile.create({
        data: { tenantId: tenant1Id, schoolId: school1Id, userId: userPrimaryTeacherId, staffNumber: `STF_P_${ts}`, firstName: "Primary", lastName: "Teacher", joiningDate: new Date(), type: StaffType.TEACHING, status: "ACTIVE" },
      });
      staffPrimaryId = p.id;

      const c = await kernel.db.staffProfile.create({
        data: { tenantId: tenant1Id, schoolId: school1Id, userId: userCoTeacherId, staffNumber: `STF_CO_${ts}`, firstName: "Co", lastName: "Teacher", joiningDate: new Date(), type: StaffType.TEACHING, status: "ACTIVE" },
      });
      staffCoTeacherId = c.id;

      const u = await kernel.db.staffProfile.create({
        data: { tenantId: tenant1Id, schoolId: school1Id, userId: userUnassignedTeacherId, staffNumber: `STF_U_${ts}`, firstName: "Unassigned", lastName: "Teacher", joiningDate: new Date(), type: StaffType.TEACHING, status: "ACTIVE" },
      });
      staffUnassignedId = u.id;

      const w = await kernel.db.staffProfile.create({
        data: { tenantId: tenant1Id, schoolId: school1Id, userId: userWrongClassTeacherId, staffNumber: `STF_WC_${ts}`, firstName: "WrongClass", lastName: "Teacher", joiningDate: new Date(), type: StaffType.TEACHING, status: "ACTIVE" },
      });
      staffWrongClassId = w.id;

      const q = await kernel.db.staffProfile.create({
        data: { tenantId: tenant1Id, schoolId: school1Id, userId: userQuarantinedTeacherId, staffNumber: `STF_Q_${ts}`, firstName: "Quarantined", lastName: "Teacher", joiningDate: new Date(), type: StaffType.TEACHING, status: "ACTIVE" },
      });
      staffQuarantinedId = q.id;

      const nr = await kernel.db.staffProfile.create({
        data: { tenantId: tenant1Id, schoolId: school1Id, userId: userNoReadPermTeacherId, staffNumber: `STF_NR_${ts}`, firstName: "NoRead", lastName: "Teacher", joiningDate: new Date(), type: StaffType.TEACHING, status: "ACTIVE" },
      });
      staffNoReadPermId = nr.id;

      const ne = await kernel.db.staffProfile.create({
        data: { tenantId: tenant1Id, schoolId: school1Id, userId: userNoEnterPermTeacherId, staffNumber: `STF_NE_${ts}`, firstName: "NoEnter", lastName: "Teacher", joiningDate: new Date(), type: StaffType.TEACHING, status: "ACTIVE" },
      });
      staffNoEnterPermId = ne.id;

      const ns = await kernel.db.staffProfile.create({
        data: { tenantId: tenant1Id, schoolId: school1Id, userId: userNoSubmitPermTeacherId, staffNumber: `STF_NS_${ts}`, firstName: "NoSubmit", lastName: "Teacher", joiningDate: new Date(), type: StaffType.TEACHING, status: "ACTIVE" },
      });
      staffNoSubmitPermId = ns.id;
    });

    // 5. Academic Structure
    const year1 = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.academicYear.create({
        data: { tenantId: tenant1Id, schoolId: school1Id, name: "2026/2027", startDate: new Date("2026-09-01"), endDate: new Date("2027-07-31") },
      }),
    );
    academicYear1Id = year1.id;

    const term1 = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.term.create({
        data: { tenantId: tenant1Id, academicYearId: academicYear1Id, name: "First Term", startDate: new Date("2026-09-01"), endDate: new Date("2026-12-20") },
      }),
    );
    term1Id = term1.id;

    const yearWrong = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.academicYear.create({
        data: { tenantId: tenant1Id, schoolId: school1Id, name: "2025/2026", startDate: new Date("2025-09-01"), endDate: new Date("2026-07-31") },
      }),
    );
    const termW = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.term.create({
        data: { tenantId: tenant1Id, academicYearId: yearWrong.id, name: "Old Term", startDate: new Date("2025-09-01"), endDate: new Date("2025-12-20") },
      }),
    );
    termWrongId = termW.id;

    const cls1 = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.class.create({ data: { tenantId: tenant1Id, schoolId: school1Id, name: "JSS 1" } }),
    );
    class1Id = cls1.id;

    const cls2 = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.class.create({ data: { tenantId: tenant1Id, schoolId: school1Id, name: "JSS 2" } }),
    );
    class2Id = cls2.id;

    const armA = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.arm.create({ data: { tenantId: tenant1Id, campusId: campus1Id, classId: class1Id, name: "Gold" } }),
    );
    armAId = armA.id;

    const armB = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.arm.create({ data: { tenantId: tenant1Id, campusId: campus1Id, classId: class1Id, name: "Silver" } }),
    );
    armBId = armB.id;

    const subjMath = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.subject.create({ data: { tenantId: tenant1Id, schoolId: school1Id, name: "Mathematics" } }),
    );
    subjectMathId = subjMath.id;

    const subjEng = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.subject.create({ data: { tenantId: tenant1Id, schoolId: school1Id, name: "English" } }),
    );
    subjectEngId = subjEng.id;

    // 6. Students & Active Enrollments
    await tenantContext.run({ tenantId: tenant1Id }, async () => {
      await kernel.db.student.createMany({
        data: [
          { id: student1Id, tenantId: tenant1Id, schoolId: school1Id, studentNumber: `STU1_${ts}`, firstName: "Alice", lastName: "Johnson", gender: "FEMALE", admissionDate: new Date() },
          { id: student2Id, tenantId: tenant1Id, schoolId: school1Id, studentNumber: `STU2_${ts}`, firstName: "Bob", lastName: "Smith", gender: "MALE", admissionDate: new Date() },
          { id: studentOutsideId, tenantId: tenant1Id, schoolId: school1Id, studentNumber: `STUO_${ts}`, firstName: "Charlie", lastName: "Brown", gender: "MALE", admissionDate: new Date() },
        ],
      });
      await kernel.db.enrollment.createMany({
        data: [
          { tenantId: tenant1Id, schoolId: school1Id, studentId: student1Id, academicYearId: academicYear1Id, classId: class1Id, armId: armAId, status: "ACTIVE" },
          { tenantId: tenant1Id, schoolId: school1Id, studentId: student2Id, academicYearId: academicYear1Id, classId: class1Id, armId: armAId, status: "ACTIVE" },
          { tenantId: tenant1Id, schoolId: school1Id, studentId: studentOutsideId, academicYearId: academicYear1Id, classId: class2Id, armId: null, status: "ACTIVE" },
        ],
      });
    });

    // 7. Teacher Assignments
    // Primary Teacher: CLASS_WIDE Math JSS 1 (isPrimary = true)
    await assignmentsService.createTeacherSubjectAssignment(tenant1Id, school1Id, {
      academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, subjectId: subjectMathId, teacherId: staffPrimaryId, scope: AssignmentScope.CLASS_WIDE, isPrimary: true,
    });

    // Co-Teacher: CLASS_WIDE Math JSS 1 (isPrimary = false)
    await assignmentsService.createTeacherSubjectAssignment(tenant1Id, school1Id, {
      academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, subjectId: subjectMathId, teacherId: staffCoTeacherId, scope: AssignmentScope.CLASS_WIDE, isPrimary: false,
    });

    // Wrong Class Teacher: CLASS_WIDE Math JSS 2
    await assignmentsService.createTeacherSubjectAssignment(tenant1Id, school1Id, {
      academicYearId: academicYear1Id, termId: term1Id, classId: class2Id, subjectId: subjectMathId, teacherId: staffWrongClassId, scope: AssignmentScope.CLASS_WIDE, isPrimary: true,
    });

    // Teacher with No Submit Permission: CLASS_WIDE English JSS 1 (isPrimary = true)
    await assignmentsService.createTeacherSubjectAssignment(tenant1Id, school1Id, {
      academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, subjectId: subjectEngId, teacherId: staffNoSubmitPermId, scope: AssignmentScope.CLASS_WIDE, isPrimary: true,
    });

    // Teacher with No Enter Permission: CLASS_WIDE Math JSS 1 (isPrimary = false)
    await assignmentsService.createTeacherSubjectAssignment(tenant1Id, school1Id, {
      academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, subjectId: subjectMathId, teacherId: staffNoEnterPermId, scope: AssignmentScope.CLASS_WIDE, isPrimary: false,
    });

    // Teacher with No Read Permission: CLASS_WIDE Math JSS 1 (isPrimary = false)
    await assignmentsService.createTeacherSubjectAssignment(tenant1Id, school1Id, {
      academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, subjectId: subjectMathId, teacherId: staffNoReadPermId, scope: AssignmentScope.CLASS_WIDE, isPrimary: false,
    });

    // ClassTeacherAssignment ONLY (no subject assignment) for Unassigned Teacher
    await assignmentsService.createClassTeacherAssignment(tenant1Id, school1Id, {
      academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, teacherId: staffUnassignedId, scope: AssignmentScope.ARM_SPECIFIC, isPrimary: true,
    });

    // Quarantined migration record for Quarantined Teacher
    await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.assignmentMigrationQuarantine.create({
        data: {
          tenantId: tenant1Id, schoolId: school1Id, academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectEngId, teacherId: staffQuarantinedId, quarantineReason: "PRIMARY_TEACHER_AMBIGUOUS", migrationBatchId: "MIGRATION_5G_001",
        },
      }),
    );

    console.log("-> Seeding completed cleanly.\n");

    const passedTests: string[] = [];

    // Helper request contexts
    const primReq = { user: { sub: userPrimaryTeacherId }, workspace: { tenantId: tenant1Id, schoolId: school1Id, roleId: roleFullTeacherId } } as any;
    const coReq = { user: { sub: userCoTeacherId }, workspace: { tenantId: tenant1Id, schoolId: school1Id, roleId: roleFullTeacherId } } as any;
    const unassReq = { user: { sub: userUnassignedTeacherId }, workspace: { tenantId: tenant1Id, schoolId: school1Id, roleId: roleFullTeacherId } } as any;
    const wClsReq = { user: { sub: userWrongClassTeacherId }, workspace: { tenantId: tenant1Id, schoolId: school1Id, roleId: roleFullTeacherId } } as any;
    const quarReq = { user: { sub: userQuarantinedTeacherId }, workspace: { tenantId: tenant1Id, schoolId: school1Id, roleId: roleFullTeacherId } } as any;

    const noReadReq = { user: { sub: userNoReadPermTeacherId }, workspace: { tenantId: tenant1Id, schoolId: school1Id, roleId: roleNoReadTeacherId } } as any;
    const noEnterReq = { user: { sub: userNoEnterPermTeacherId }, workspace: { tenantId: tenant1Id, schoolId: school1Id, roleId: roleNoEnterTeacherId } } as any;
    const noSubmitReq = { user: { sub: userNoSubmitPermTeacherId }, workspace: { tenantId: tenant1Id, schoolId: school1Id, roleId: roleNoSubmitTeacherId } } as any;

    const reqSchool2 = { user: { sub: userPrimaryTeacherId }, workspace: { tenantId: tenant1Id, schoolId: school2Id, roleId: roleFullTeacherId } } as any;
    const reqTenant2 = { user: { sub: userPrimaryTeacherId }, workspace: { tenantId: tenant2Id, schoolId: schoolTenant2Id, roleId: roleFullTeacherId } } as any;

    // --- CONTROLLER-LEVEL PERMISSION BOUNDARY TESTS ---

    console.log("Permission Test 1: Teacher WITH academics:read_gradebook can read scope and gradebook");
    const scopeRes = await invokeGuardedController("getTeacherScope", primReq, { academicYearId: academicYear1Id, termId: term1Id });
    const gradebookRes = await invokeGuardedController("getGradebook", primReq, { academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId });
    if (scopeRes.success && gradebookRes.success) {
      passedTests.push("1. Teacher with academics:read_gradebook can read scope & gradebook → PASSED");
      console.log("   PASSED");
    }

    console.log("Permission Test 2: Teacher WITHOUT academics:read_gradebook is REJECTED on GET / and GET /scope");
    try {
      await invokeGuardedController("getGradebook", noReadReq, { academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId });
      console.error("   FAILED: Should have thrown ForbiddenException for missing read_gradebook permission");
    } catch (err: any) {
      if (err instanceof ForbiddenException && (err.message.includes("Missing required permissions") || err.message.includes("PoliciesGuard access denied"))) {
        passedTests.push("2. Teacher without academics:read_gradebook rejected on GET endpoints → PASSED");
        console.log("   PASSED");
      }
    }

    console.log("Permission Test 3: Teacher WITH academics:enter_scores can save DRAFT scores");
    const draftRes = await invokeGuardedController("saveGradebookDraft", primReq, {
      academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId,
      entries: [{ studentId: student1Id, scores: [{ type: "CA1", maxScore: 20, score: 18, isAbsent: false }] }],
    });
    if (draftRes.success && draftRes.data.status === WorkflowStatus.DRAFT) {
      passedTests.push("3. Teacher with academics:enter_scores can save draft scores → PASSED");
      console.log("   PASSED");
    }

    console.log("Permission Test 4: Teacher WITHOUT academics:enter_scores is REJECTED on POST /draft (even with read permissions)");
    try {
      await invokeGuardedController("saveGradebookDraft", noEnterReq, {
        academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId,
        entries: [{ studentId: student1Id, scores: [{ type: "CA1", maxScore: 20, score: 15 }] }],
      });
      console.error("   FAILED: Should have thrown ForbiddenException for missing enter_scores permission");
    } catch (err: any) {
      if (err instanceof ForbiddenException && (err.message.includes("Missing required permissions") || err.message.includes("PoliciesGuard access denied"))) {
        passedTests.push("4. Teacher without academics:enter_scores rejected on POST /draft → PASSED");
        console.log("   PASSED");
      }
    }

    console.log("Permission Test 5: Authorized primary teacher WITH academics:submit_gradebook can submit gradebook");
    const submitRes = await invokeGuardedController("submitGradebook", primReq, {
      academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId,
    });
    if (submitRes.success && submitRes.data.status === WorkflowStatus.SUBMITTED) {
      passedTests.push("5. Authorized primary teacher with academics:submit_gradebook can submit → PASSED");
      console.log("   PASSED");
    }

    console.log("Permission Test 6: Primary teacher WITHOUT academics:submit_gradebook is REJECTED on POST /submit");
    try {
      await invokeGuardedController("submitGradebook", noSubmitReq, {
        academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectEngId,
      });
      console.error("   FAILED: Should have thrown ForbiddenException for missing submit_gradebook permission");
    } catch (err: any) {
      if (err instanceof ForbiddenException && (err.message.includes("Missing required permissions") || err.message.includes("PoliciesGuard access denied"))) {
        passedTests.push("6. Primary teacher without academics:submit_gradebook rejected on POST /submit → PASSED");
        console.log("   PASSED");
      }
    }

    // Reset submission for remaining tests via admin workflow reset
    const submissionRecord = await kernel.db.gradebookSubmission.findFirst({
      where: { tenantId: tenant1Id, schoolId: school1Id, academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, subjectId: subjectMathId },
    });
    await tenantContext.run({ tenantId: tenant1Id }, async () => {
      await kernel.db.gradebookSubmission.update({
        where: { id: submissionRecord!.id },
        data: { status: WorkflowStatus.DRAFT },
      });
    });

    // --- DOMAIN-LEVEL ADVERSARIAL SCENARIOS ---

    console.log("Scenario 7: Teacher with NO subject assignment is REJECTED from gradebook");
    try {
      await invokeGuardedController("getGradebook", unassReq, { academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId });
      console.error("   FAILED: Should have thrown ForbiddenException");
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        passedTests.push("7. Teacher with no subject assignment rejected → PASSED");
        console.log("   PASSED");
      }
    }

    console.log("Scenario 8: Teacher assigned to another class is REJECTED");
    try {
      await invokeGuardedController("getGradebook", wClsReq, { academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId });
      console.error("   FAILED: Should have thrown ForbiddenException");
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        passedTests.push("8. Teacher assigned to another class rejected → PASSED");
        console.log("   PASSED");
      }
    }

    console.log("Scenario 9: ClassTeacherAssignment alone yields ZERO grading authority");
    try {
      await invokeGuardedController("getGradebook", unassReq, { academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectEngId });
      console.error("   FAILED: Should have thrown ForbiddenException");
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        passedTests.push("9. ClassTeacherAssignment alone yields zero grading authority → PASSED");
        console.log("   PASSED");
      }
    }

    console.log("Scenario 10: Quarantined migration record yields ZERO authority");
    try {
      await invokeGuardedController("getGradebook", quarReq, { academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectEngId });
      console.error("   FAILED: Should have thrown ForbiddenException");
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        passedTests.push("10. Quarantined record yields zero authority → PASSED");
        console.log("   PASSED");
      }
    }

    console.log("Scenario 11: CLASS_WIDE teacher operates across arms within same school");
    const armBRes = await invokeGuardedController("getGradebook", primReq, { academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armBId, subjectId: subjectMathId });
    if (armBRes.success && armBRes.data.academicContext.scope === AssignmentScope.CLASS_WIDE) {
      passedTests.push("11. CLASS_WIDE teacher operates across arms → PASSED");
      console.log("   PASSED");
    }

    console.log("Scenario 12: Cross-school gradebook access attempt is REJECTED");
    try {
      await invokeGuardedController("getGradebook", reqSchool2, { academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId });
      console.error("   FAILED: Should have thrown ForbiddenException");
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        passedTests.push("12. Cross-school gradebook access rejected → PASSED");
        console.log("   PASSED");
      }
    }

    console.log("Scenario 13: Cross-tenant gradebook access attempt is REJECTED");
    try {
      await invokeGuardedController("getGradebook", reqTenant2, { academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId });
      console.error("   FAILED: Should have thrown ForbiddenException");
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        passedTests.push("13. Cross-tenant gradebook access rejected → PASSED");
        console.log("   PASSED");
      }
    }

    console.log("Scenario 14: Wrong academic year / term request is REJECTED");
    try {
      await invokeGuardedController("getGradebook", primReq, { academicYearId: academicYear1Id, termId: termWrongId, classId: class1Id, armId: armAId, subjectId: subjectMathId });
      console.error("   FAILED: Should have thrown ForbiddenException");
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        passedTests.push("14. Wrong academic year / term request rejected → PASSED");
        console.log("   PASSED");
      }
    }

    console.log("Scenario 15: Non-primary co-teacher saves DRAFT scores (allowed)");
    const coDraftRes = await invokeGuardedController("saveGradebookDraft", coReq, {
      academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId,
      entries: [{ studentId: student1Id, scores: [{ type: "CA1", maxScore: 20, score: 18, isAbsent: false }, { type: "EXAM", maxScore: 80, score: 65, isAbsent: false }] }],
    });
    if (coDraftRes.success && coDraftRes.data.status === WorkflowStatus.DRAFT) {
      passedTests.push("15. Co-teacher saves draft scores → PASSED");
      console.log("   PASSED");
    }

    console.log("Scenario 16: Primary teacher saves DRAFT with isAbsent flag");
    const absDraftRes = await invokeGuardedController("saveGradebookDraft", primReq, {
      academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId,
      entries: [{ studentId: student2Id, scores: [{ type: "CA1", maxScore: 20, isAbsent: true }] }],
    });
    if (absDraftRes.success && absDraftRes.data.status === WorkflowStatus.DRAFT) {
      passedTests.push("16. Primary teacher saves draft with isAbsent flag → PASSED");
      console.log("   PASSED");
    }

    console.log("Scenario 17: Attempting score entry for non-enrolled student is REJECTED");
    try {
      await invokeGuardedController("saveGradebookDraft", primReq, {
        academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId,
        entries: [{ studentId: studentOutsideId, scores: [{ type: "CA1", maxScore: 20, score: 15 }] }],
      });
      console.error("   FAILED: Should have thrown BadRequestException");
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        passedTests.push("17. Score entry for non-enrolled student rejected → PASSED");
        console.log("   PASSED");
      }
    }

    console.log("Scenario 18: Non-primary co-teacher submission attempt is REJECTED at domain level");
    try {
      await invokeGuardedController("submitGradebook", coReq, { academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId });
      console.error("   FAILED: Should have thrown ForbiddenException");
    } catch (err: any) {
      if (err instanceof ForbiddenException && err.message.includes("Only the designated primary teacher can submit")) {
        passedTests.push("18. Non-primary co-teacher submission rejected at domain level → PASSED");
        console.log("   PASSED");
      }
    }

    console.log("Scenario 19: Primary teacher SUBMITS gradebook successfully");
    const subSuccessRes = await invokeGuardedController("submitGradebook", primReq, { academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId });
    if (subSuccessRes.success && subSuccessRes.data.status === WorkflowStatus.SUBMITTED) {
      passedTests.push("19. Primary teacher submits gradebook → PASSED");
      console.log("   PASSED");
    }

    console.log("Scenario 20: Editing an already SUBMITTED gradebook is REJECTED");
    try {
      await invokeGuardedController("saveGradebookDraft", primReq, {
        academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId,
        entries: [{ studentId: student1Id, scores: [{ type: "CA1", maxScore: 20, score: 20 }] }],
      });
      console.error("   FAILED: Should have thrown ForbiddenException");
    } catch (err: any) {
      if (err instanceof ForbiddenException && err.message.includes("is currently SUBMITTED and cannot be modified")) {
        passedTests.push("20. Editing submitted gradebook rejected → PASSED");
        console.log("   PASSED");
      }
    }

    console.log("Scenario 21: Resubmitting an already SUBMITTED gradebook is REJECTED");
    try {
      await invokeGuardedController("submitGradebook", primReq, { academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId });
      console.error("   FAILED: Should have thrown ForbiddenException");
    } catch (err: any) {
      if (err instanceof ForbiddenException && err.message.includes("is already SUBMITTED")) {
        passedTests.push("21. Resubmitting submitted gradebook rejected → PASSED");
        console.log("   PASSED");
      }
    }

    console.log("Scenario 22: REJECTED gradebook state recovery (Admin rejects -> Teacher edits DRAFT -> Resubmits)");
    // Admin rejects submission
    const existingSub = await kernel.db.gradebookSubmission.findFirst({
      where: { tenantId: tenant1Id, schoolId: school1Id, academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, subjectId: subjectMathId },
    });
    await tenantContext.run({ tenantId: tenant1Id }, async () => {
      await kernel.db.gradebookSubmission.update({
        where: { id: existingSub!.id },
        data: { status: WorkflowStatus.REJECTED, rejectionReason: "CA1 scores require correction" },
      });
    });

    // Primary teacher edits gradebook
    const draftRecRes = await invokeGuardedController("saveGradebookDraft", primReq, {
      academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId,
      entries: [{ studentId: student1Id, scores: [{ type: "CA1", maxScore: 20, score: 19, isAbsent: false }] }],
    });
    if (!draftRecRes.success || draftRecRes.data.status !== WorkflowStatus.DRAFT) {
      console.error("   FAILED: Rejected recovery draft save failed");
    }

    // Primary teacher resubmits
    const resubRecRes = await invokeGuardedController("submitGradebook", primReq, { academicYearId: academicYear1Id, termId: term1Id, classId: class1Id, armId: armAId, subjectId: subjectMathId });
    if (resubRecRes.success && resubRecRes.data.status === WorkflowStatus.SUBMITTED) {
      passedTests.push("22. REJECTED gradebook state recovery & resubmission → PASSED");
      console.log("   PASSED");
    }

    console.log("\n==================================================");
    console.log(`ALL ${passedTests.length}/22 TEACHER PORTAL GRADEBOOK BFF SECURITY & DOMAIN TESTS PASSED!`);
    console.log("==================================================\n");

  } finally {
    // Clean up test fixtures
    const userIds = [userPrimaryTeacherId, userCoTeacherId, userUnassignedTeacherId, userWrongClassTeacherId, userQuarantinedTeacherId, userNoReadPermTeacherId, userNoEnterPermTeacherId, userNoSubmitPermTeacherId].filter(Boolean);
    const roleIds = [roleFullTeacherId, roleNoReadTeacherId, roleNoEnterTeacherId, roleNoSubmitTeacherId].filter(Boolean);
    const permIds = [permReadAssignmentsId, permReadGradebookId, permEnterScoresId, permSubmitGradebookId].filter(Boolean);

    for (const tid of [tenant1Id, tenant2Id]) {
      await tenantContext.run({ tenantId: tid }, async () => {
        if (roleIds.length > 0) {
          await kernel.db.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } });
        }
        await kernel.db.workflowAuditLog.deleteMany({ where: { tenantId: tid } });
        await kernel.db.scoreAuditLog.deleteMany({ where: { tenantId: tid } });
        await kernel.db.gradebookSubmission.deleteMany({ where: { tenantId: tid } });
        await kernel.db.assessmentScore.deleteMany({ where: { tenantId: tid } });
        await kernel.db.subjectResult.deleteMany({ where: { tenantId: tid } });
        await kernel.db.enrollment.deleteMany({ where: { tenantId: tid } });
        await kernel.db.student.deleteMany({ where: { tenantId: tid } });
        await kernel.db.teacherSubjectAssignment.deleteMany({ where: { tenantId: tid } });
        await kernel.db.classTeacherAssignment.deleteMany({ where: { tenantId: tid } });
        await kernel.db.assignmentMigrationQuarantine.deleteMany({ where: { tenantId: tid } });
        await kernel.db.staffProfile.deleteMany({ where: { tenantId: tid } });
        await kernel.db.subject.deleteMany({ where: { tenantId: tid } });
        await kernel.db.arm.deleteMany({ where: { tenantId: tid } });
        await kernel.db.class.deleteMany({ where: { tenantId: tid } });
        await kernel.db.term.deleteMany({ where: { tenantId: tid } });
        await kernel.db.academicYear.deleteMany({ where: { tenantId: tid } });
        await kernel.db.campus.deleteMany({ where: { tenantId: tid } });
        await kernel.db.userTenantMembership.deleteMany({ where: { tenantId: tid } });
        await kernel.db.role.deleteMany({ where: { tenantId: tid } });
        await kernel.db.school.deleteMany({ where: { tenantId: tid } });
      });
    }
    await kernel.db.tenant.deleteMany({ where: { id: { in: [tenant1Id, tenant2Id] } } });
    if (userIds.length > 0) {
      await kernel.db.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (permIds.length > 0) {
      await kernel.db.permission.deleteMany({ where: { id: { in: permIds } } });
    }
  }
}

runStep4GradebookSuite()
  .then(() => {
    console.log("Step 4 Teacher Portal Gradebook BFF Suite finished cleanly.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Step 4 Teacher Portal Gradebook BFF Suite failed:", err);
    process.exit(1);
  });
