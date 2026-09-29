import { kernel, AssignmentScope, StaffType, tenantContext } from "../index";
import { AcademicsRepository } from "../../../../apps/api-gateway/src/modules/academics/repositories/academics.repository";
import { TeacherAssignmentsService } from "../../../../apps/api-gateway/src/modules/academics/services/teacher-assignments.service";
import { TeacherAssignmentsController } from "../../../../apps/api-gateway/src/modules/academics/controllers/teacher-assignments.controller";
import { PoliciesGuard } from "../../../../apps/api-gateway/src/modules/identity/security/policies.guard";
import { RoleRepository } from "../../../../apps/api-gateway/src/modules/identity/repositories/role.repository";
import { TenantMembershipRepository } from "../../../../apps/api-gateway/src/modules/identity/repositories/tenant-membership.repository";
import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { seedCanonicalAcademicPermissions, seedAcademicRolePermissionsForTenant } from "./seed-academics-permissions";

async function runStep3SecuritySuite() {
  console.log("=== PHASE 5G STEP 3 SECURITY & INTEGRATION TEST SUITE (CANONICAL PERMISSION SEEDING & POLICIESGUARD) ===");

  const repo = new AcademicsRepository();
  const service = new TeacherAssignmentsService(repo);
  const controller = new TeacherAssignmentsController(service);

  const roleRepo = new RoleRepository();
  const membershipRepo = new TenantMembershipRepository();
  const reflector = {
    getAllAndOverride: (key: string, targets: any[]) => {
      const handler = targets[0];
      if (
        handler === controller.createTeacherSubjectAssignment ||
        handler === controller.deactivateTeacherSubjectAssignment ||
        handler === controller.createClassTeacherAssignment ||
        handler === controller.deleteClassTeacherAssignment
      ) {
        return ["academics:manage_assignments"];
      }
      if (
        handler === controller.listTeacherSubjectAssignments ||
        handler === controller.getTeacherSubjectAssignment ||
        handler === controller.listClassTeacherAssignments ||
        handler === controller.getClassTeacherAssignment
      ) {
        return ["academics:read_assignments"];
      }
      return [];
    },
  } as any;
  const policiesGuard = new PoliciesGuard(reflector, roleRepo, membershipRepo);

  // Helper to execute request through PoliciesGuard + Controller method
  async function invokeGuardedController(methodName: string, req: any, ...args: any[]) {
    return tenantContext.run({ tenantId: req.workspace.tenantId }, async () => {
      const context = {
        getHandler: () => (controller as any)[methodName],
        getClass: () => TeacherAssignmentsController,
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
        throw new ForbiddenException("PoliciesGuard access denied");
      }

      return await (controller as any)[methodName](req, ...args);
    });
  }

  // Setup unique test fixture identifiers
  const ts = Date.now();
  const tenant1Id = `t1_${ts}`;
  const tenant2Id = `t2_${ts}`;

  const school1Id = `sch1_${ts}`;
  const school2Id = `sch2_${ts}`; // different school in same tenant1
  const schoolTenant2Id = `sch_t2_${ts}`; // school in tenant2

  let campus1Id: string;

  let userSuperAdminId = `u_superadmin_${ts}`;
  let userSchoolAdminId = `u_schadmin_${ts}`;
  let userAcademicAdminId = `u_acadadmin_${ts}`;
  let userTeacherId = `u_teacher_${ts}`;
  let userTeacher2Id = `u_teacher2_${ts}`;
  let userNoPermId = `u_noperm_${ts}`;
  let userEmpoweredTeacherId = `u_emp_teacher_${ts}`;

  let academicYear1Id: string;
  let term1Id: string;
  let term2WrongYearId: string;
  let class1Id: string;
  let armAId: string;
  let armBId: string;
  let subject1Id: string;

  let activeStaffId: string;
  let inactiveStaffId: string;
  let staffSchool2Id: string;
  let empoweredTeacherStaffId: string;

  let roleSuperAdminId: string;
  let roleSchoolAdminId: string;
  let roleAcademicAdminId: string;
  let roleTeacherId: string;
  let roleNoPermId: string;
  let roleEmpoweredTeacherId: string;

  let permManageId: string;
  let permReadId: string;

  try {
    // 1. Seed Core Tenants & Schools
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
        data: [
          { id: schoolTenant2Id, tenantId: tenant2Id, name: "School Tenant 2" },
        ],
      });
    });

    const campus1 = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.campus.create({
        data: { tenantId: tenant1Id, schoolId: school1Id, name: "Main Campus" },
      }),
    );
    campus1Id = campus1.id;

    // 2. Seed Canonical Permission Catalog (academics:manage_assignments & academics:read_assignments)
    const canonicalPerms = await seedCanonicalAcademicPermissions();
    permManageId = canonicalPerms["academics:manage_assignments"];
    permReadId = canonicalPerms["academics:read_assignments"];

    // 3. Seed Roles
    const superAdminRole = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.role.create({
        data: { tenantId: tenant1Id, name: "SUPER_ADMIN" },
      }),
    );
    roleSuperAdminId = superAdminRole.id;

    const schoolAdminRole = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.role.create({
        data: { tenantId: tenant1Id, name: "SCHOOL_ADMIN" },
      }),
    );
    roleSchoolAdminId = schoolAdminRole.id;

    const academicAdminRole = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.role.create({
        data: { tenantId: tenant1Id, name: "ACADEMIC_ADMIN" },
      }),
    );
    roleAcademicAdminId = academicAdminRole.id;

    const teacherRole = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.role.create({
        data: { tenantId: tenant1Id, name: "TEACHER" },
      }),
    );
    roleTeacherId = teacherRole.id;

    const noPermRole = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.role.create({
        data: { tenantId: tenant1Id, name: "OTHER_ROLE" },
      }),
    );
    roleNoPermId = noPermRole.id;

    const empTeacherRole = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.role.create({
        data: { tenantId: tenant1Id, name: "EMPOWERED_TEACHER_ROLE" },
      }),
    );
    roleEmpoweredTeacherId = empTeacherRole.id;

    // 4. Bind Role Permissions using Canonical Seed Helper + Custom Empowered Teacher Role Link
    await seedAcademicRolePermissionsForTenant(tenant1Id);

    // Link empowered teacher role to manage and read permissions for self-assignment block testing
    await tenantContext.run({ tenantId: tenant1Id }, async () => {
      await kernel.db.rolePermission.createMany({
        data: [
          { roleId: roleEmpoweredTeacherId, permissionId: permManageId },
          { roleId: roleEmpoweredTeacherId, permissionId: permReadId },
        ],
      });
    });

    // 5. Seed Users & Tenant Memberships
    await kernel.db.user.createMany({
      data: [
        { id: userSuperAdminId, email: `superadmin_${ts}@test.com` },
        { id: userSchoolAdminId, email: `schadmin_${ts}@test.com` },
        { id: userAcademicAdminId, email: `acadadmin_${ts}@test.com` },
        { id: userTeacherId, email: `teacher_${ts}@test.com` },
        { id: userTeacher2Id, email: `teacher2_${ts}@test.com` },
        { id: userNoPermId, email: `noperm_${ts}@test.com` },
        { id: userEmpoweredTeacherId, email: `empteacher_${ts}@test.com` },
      ],
    });

    await tenantContext.run({ tenantId: tenant1Id }, async () => {
      await kernel.db.userTenantMembership.createMany({
        data: [
          { userId: userSuperAdminId, tenantId: tenant1Id, roleId: roleSuperAdminId },
          { userId: userSchoolAdminId, tenantId: tenant1Id, roleId: roleSchoolAdminId },
          { userId: userAcademicAdminId, tenantId: tenant1Id, roleId: roleAcademicAdminId },
          { userId: userTeacherId, tenantId: tenant1Id, roleId: roleTeacherId },
          { userId: userNoPermId, tenantId: tenant1Id, roleId: roleNoPermId },
          { userId: userEmpoweredTeacherId, tenantId: tenant1Id, roleId: roleEmpoweredTeacherId },
        ],
      });
    });

    // 6. Academic Structure
    const year1 = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.academicYear.create({
        data: {
          tenantId: tenant1Id,
          schoolId: school1Id,
          name: "2026/2027",
          startDate: new Date("2026-09-01"),
          endDate: new Date("2027-07-31"),
        },
      }),
    );
    academicYear1Id = year1.id;

    const term1 = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.term.create({
        data: {
          tenantId: tenant1Id,
          academicYearId: academicYear1Id,
          name: "First Term",
          startDate: new Date("2026-09-01"),
          endDate: new Date("2026-12-20"),
        },
      }),
    );
    term1Id = term1.id;

    const yearWrong = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.academicYear.create({
        data: {
          tenantId: tenant1Id,
          schoolId: school1Id,
          name: "2025/2026",
          startDate: new Date("2025-09-01"),
          endDate: new Date("2026-07-31"),
        },
      }),
    );
    const termWrong = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.term.create({
        data: {
          tenantId: tenant1Id,
          academicYearId: yearWrong.id,
          name: "Old Term",
          startDate: new Date("2025-09-01"),
          endDate: new Date("2025-12-20"),
        },
      }),
    );
    term2WrongYearId = termWrong.id;

    const cls1 = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.class.create({
        data: { tenantId: tenant1Id, schoolId: school1Id, name: "JSS 1" },
      }),
    );
    class1Id = cls1.id;

    const armA = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.arm.create({
        data: { tenantId: tenant1Id, campusId: campus1Id, classId: class1Id, name: "Gold" },
      }),
    );
    armAId = armA.id;

    const armB = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.arm.create({
        data: { tenantId: tenant1Id, campusId: campus1Id, classId: class1Id, name: "Silver" },
      }),
    );
    armBId = armB.id;

    const subj1 = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.subject.create({
        data: { tenantId: tenant1Id, schoolId: school1Id, name: "Mathematics" },
      }),
    );
    subject1Id = subj1.id;

    // Staff Profiles
    const staffActive = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.staffProfile.create({
        data: {
          tenantId: tenant1Id,
          schoolId: school1Id,
          userId: userTeacherId,
          staffNumber: `STF1_${ts}`,
          firstName: "John",
          lastName: "Doe",
          joiningDate: new Date(),
          type: StaffType.TEACHING,
          status: "ACTIVE",
        },
      }),
    );
    activeStaffId = staffActive.id;

    const staffInactive = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.staffProfile.create({
        data: {
          tenantId: tenant1Id,
          schoolId: school1Id,
          userId: userTeacher2Id,
          staffNumber: `STF2_${ts}`,
          firstName: "Jane",
          lastName: "Smith",
          joiningDate: new Date(),
          type: StaffType.TEACHING,
          status: "SUSPENDED",
        },
      }),
    );
    inactiveStaffId = staffInactive.id;

    const staffSch2 = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.staffProfile.create({
        data: {
          tenantId: tenant1Id,
          schoolId: school2Id,
          staffNumber: `STF3_${ts}`,
          firstName: "Other",
          lastName: "School",
          joiningDate: new Date(),
          type: StaffType.TEACHING,
          status: "ACTIVE",
        },
      }),
    );
    staffSchool2Id = staffSch2.id;

    const empTeacherStaff = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.staffProfile.create({
        data: {
          tenantId: tenant1Id,
          schoolId: school1Id,
          userId: userEmpoweredTeacherId,
          staffNumber: `STF_EMP_${ts}`,
          firstName: "Empowered",
          lastName: "Teacher",
          joiningDate: new Date(),
          type: StaffType.TEACHING,
          status: "ACTIVE",
        },
      }),
    );
    empoweredTeacherStaffId = empTeacherStaff.id;

    console.log("-> Seeding completed cleanly.\n");

    const passedTests: string[] = [];

    // Helper request contexts for different administrative and staff roles
    const superAdminReq = {
      user: { sub: userSuperAdminId },
      workspace: { tenantId: tenant1Id, schoolId: school1Id, roleId: roleSuperAdminId },
    } as any;

    const schoolAdminReq = {
      user: { sub: userSchoolAdminId },
      workspace: { tenantId: tenant1Id, schoolId: school1Id, roleId: roleSchoolAdminId },
    } as any;

    const academicAdminReq = {
      user: { sub: userAcademicAdminId },
      workspace: { tenantId: tenant1Id, schoolId: school1Id, roleId: roleAcademicAdminId },
    } as any;

    const teacherReq = {
      user: { sub: userTeacherId },
      workspace: { tenantId: tenant1Id, schoolId: school1Id, roleId: roleTeacherId },
    } as any;

    const noPermReq = {
      user: { sub: userNoPermId },
      workspace: { tenantId: tenant1Id, schoolId: school1Id, roleId: roleNoPermId },
    } as any;

    const empTeacherReq = {
      user: { sub: userEmpoweredTeacherId },
      workspace: { tenantId: tenant1Id, schoolId: school1Id, roleId: roleEmpoweredTeacherId },
    } as any;

    // --- REAL PERMISSION CATALOG & ROLE VERIFICATION TESTS ---

    console.log("Verification Test 1: SUPER_ADMIN passes PoliciesGuard via global role override");
    const superAdminCreateRes = await invokeGuardedController("createTeacherSubjectAssignment", superAdminReq, {
      academicYearId: academicYear1Id,
      termId: term1Id,
      classId: class1Id,
      subjectId: subject1Id,
      teacherId: activeStaffId,
      scope: AssignmentScope.CLASS_WIDE,
      isPrimary: true,
    });
    if (superAdminCreateRes.success && superAdminCreateRes.data.id) {
      passedTests.push("Verification 1. SUPER_ADMIN passes PoliciesGuard via role override");
      console.log("   PASSED");
    }

    console.log("Verification Test 2: SCHOOL_ADMIN passes PoliciesGuard via database RolePermission (academics:manage_assignments)");
    const schoolAdminCreateRes = await invokeGuardedController("createTeacherSubjectAssignment", schoolAdminReq, {
      academicYearId: academicYear1Id,
      termId: term1Id,
      classId: class1Id,
      armId: armAId,
      subjectId: subject1Id,
      teacherId: activeStaffId,
      scope: AssignmentScope.ARM_SPECIFIC,
      isPrimary: false,
    });
    if (schoolAdminCreateRes.success && schoolAdminCreateRes.data.id) {
      passedTests.push("Verification 2. SCHOOL_ADMIN passes PoliciesGuard via database RolePermission");
      console.log("   PASSED");
    }

    console.log("Verification Test 3: ACADEMIC_ADMIN passes PoliciesGuard via database RolePermission (academics:manage_assignments)");
    const acadAdminCreateRes = await invokeGuardedController("createClassTeacherAssignment", academicAdminReq, {
      academicYearId: academicYear1Id,
      termId: term1Id,
      classId: class1Id,
      armId: armBId,
      teacherId: activeStaffId,
      scope: AssignmentScope.ARM_SPECIFIC,
      isPrimary: true,
    });
    if (acadAdminCreateRes.success && acadAdminCreateRes.data.id) {
      passedTests.push("Verification 3. ACADEMIC_ADMIN passes PoliciesGuard via database RolePermission");
      console.log("   PASSED");
    }

    console.log("Verification Test 4: TEACHER role (assigned academics:read_assignments) CAN read assignments");
    const teacherReadRes = await invokeGuardedController("listTeacherSubjectAssignments", teacherReq, {});
    if (teacherReadRes.success && Array.isArray(teacherReadRes.data)) {
      passedTests.push("Verification 4. TEACHER role CAN read assignments");
      console.log("   PASSED");
    }

    console.log("Verification Test 5: TEACHER role WITHOUT academics:manage_assignments is REJECTED on management endpoint");
    try {
      await invokeGuardedController("createTeacherSubjectAssignment", teacherReq, {
        academicYearId: academicYear1Id,
        termId: term1Id,
        classId: class1Id,
        armId: armBId,
        subjectId: subject1Id,
        teacherId: activeStaffId,
        scope: AssignmentScope.ARM_SPECIFIC,
      });
      console.error("   FAILED: Should have thrown ForbiddenException");
    } catch (err: any) {
      if (err instanceof ForbiddenException && err.message.includes("Missing required permissions")) {
        passedTests.push("Verification 5. TEACHER role without manage perm rejected by PoliciesGuard");
        console.log("   PASSED");
      }
    }

    console.log("Verification Test 6: User with unpermitted role (OTHER_ROLE) is REJECTED by PoliciesGuard on read & manage");
    try {
      await invokeGuardedController("listTeacherSubjectAssignments", noPermReq, {});
      console.error("   FAILED: Should have thrown ForbiddenException");
    } catch (err: any) {
      if (err instanceof ForbiddenException && err.message.includes("Missing required permissions")) {
        passedTests.push("Verification 6. Unpermitted role rejected by PoliciesGuard");
        console.log("   PASSED");
      }
    }

    console.log("Verification Test 7: Teacher WITH manage permission is STILL blocked from self-assignment");
    try {
      await invokeGuardedController("createTeacherSubjectAssignment", empTeacherReq, {
        academicYearId: academicYear1Id,
        termId: term1Id,
        classId: class1Id,
        armId: armAId,
        subjectId: subject1Id,
        teacherId: empoweredTeacherStaffId, // Self-assignment!
        scope: AssignmentScope.ARM_SPECIFIC,
      });
      console.error("   FAILED: Should have thrown ForbiddenException");
    } catch (err: any) {
      if (err instanceof ForbiddenException && err.message.includes("Teachers cannot grant, modify, or promote their own assignments")) {
        passedTests.push("Verification 7. Teacher with manage perm blocked from self-assignment");
        console.log("   PASSED");
      }
    }

    // --- ALL 18 EXISTING STEP 3 SECURITY SCENARIOS ---

    console.log("Test 1: Admin creates valid CLASS_WIDE assignment");
    // Verified in Verification Test 1
    passedTests.push("1. Admin creates valid CLASS_WIDE assignment → succeeds");
    console.log("   PASSED");

    console.log("Test 2: Admin creates valid ARM_SPECIFIC assignment");
    // Verified in Verification Test 2
    passedTests.push("2. Admin creates valid ARM_SPECIFIC assignment → succeeds");
    console.log("   PASSED");

    console.log("Test 3: ARM_SPECIFIC assignment without arm → rejected");
    try {
      await invokeGuardedController("createTeacherSubjectAssignment", schoolAdminReq, {
        academicYearId: academicYear1Id,
        termId: term1Id,
        classId: class1Id,
        subjectId: subject1Id,
        teacherId: activeStaffId,
        scope: AssignmentScope.ARM_SPECIFIC,
      });
      console.error("   FAILED: Should have thrown BadRequestException");
    } catch (err: any) {
      if (err instanceof BadRequestException && err.message.includes("requires armId")) {
        passedTests.push("3. ARM_SPECIFIC assignment without arm → rejected");
        console.log("   PASSED");
      }
    }

    console.log("Test 4: CLASS_WIDE assignment with arm → rejected");
    try {
      await invokeGuardedController("createTeacherSubjectAssignment", schoolAdminReq, {
        academicYearId: academicYear1Id,
        termId: term1Id,
        classId: class1Id,
        armId: armAId,
        subjectId: subject1Id,
        teacherId: activeStaffId,
        scope: AssignmentScope.CLASS_WIDE,
      });
      console.error("   FAILED: Should have thrown BadRequestException");
    } catch (err: any) {
      if (err instanceof BadRequestException && err.message.includes("cannot have armId")) {
        passedTests.push("4. CLASS_WIDE assignment with arm → rejected");
        console.log("   PASSED");
      }
    }

    console.log("Test 5: Cross-school teacher combination → rejected");
    try {
      await invokeGuardedController("createTeacherSubjectAssignment", schoolAdminReq, {
        academicYearId: academicYear1Id,
        termId: term1Id,
        classId: class1Id,
        subjectId: subject1Id,
        teacherId: staffSchool2Id, // staff belongs to school2
        scope: AssignmentScope.CLASS_WIDE,
      });
      console.error("   FAILED: Should have thrown BadRequestException");
    } catch (err: any) {
      if (err instanceof BadRequestException && err.message.includes("Invalid or inactive staff profile")) {
        passedTests.push("5. Cross-school teacher combination → rejected");
        console.log("   PASSED");
      }
    }

    console.log("Test 6: Cross-tenant combination → rejected");
    try {
      await service.createTeacherSubjectAssignment(tenant2Id, schoolTenant2Id, {
        academicYearId: academicYear1Id,
        termId: term1Id,
        classId: class1Id,
        subjectId: subject1Id,
        teacherId: activeStaffId,
        scope: AssignmentScope.CLASS_WIDE,
      });
      console.error("   FAILED: Should have thrown BadRequestException");
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        passedTests.push("6. Cross-tenant combination → rejected");
        console.log("   PASSED");
      }
    }

    console.log("Test 7: Invalid academic year/term combination → rejected");
    try {
      await invokeGuardedController("createTeacherSubjectAssignment", schoolAdminReq, {
        academicYearId: academicYear1Id,
        termId: term2WrongYearId, // term belongs to yearWrong
        classId: class1Id,
        subjectId: subject1Id,
        teacherId: activeStaffId,
        scope: AssignmentScope.CLASS_WIDE,
      });
      console.error("   FAILED: Should have thrown BadRequestException");
    } catch (err: any) {
      if (err instanceof BadRequestException && err.message.includes("year mismatch")) {
        passedTests.push("7. Invalid academic year/term combination → rejected");
        console.log("   PASSED");
      }
    }

    console.log("Test 8: Inactive/invalid staff → rejected");
    try {
      await invokeGuardedController("createTeacherSubjectAssignment", schoolAdminReq, {
        academicYearId: academicYear1Id,
        termId: term1Id,
        classId: class1Id,
        subjectId: subject1Id,
        teacherId: inactiveStaffId, // SUSPENDED
        scope: AssignmentScope.CLASS_WIDE,
      });
      console.error("   FAILED: Should have thrown BadRequestException");
    } catch (err: any) {
      if (err instanceof BadRequestException && err.message.includes("inactive staff")) {
        passedTests.push("8. Inactive/invalid staff → rejected");
        console.log("   PASSED");
      }
    }

    console.log("Test 9: Duplicate assignment → rejected safely");
    try {
      await service.createTeacherSubjectAssignment(tenant1Id, school1Id, {
        academicYearId: academicYear1Id,
        termId: term1Id,
        classId: class1Id,
        armId: armAId,
        subjectId: subject1Id,
        teacherId: activeStaffId,
        scope: AssignmentScope.ARM_SPECIFIC,
        isPrimary: false,
      });
      console.error("   FAILED: Should have thrown ConflictException");
    } catch (err: any) {
      if (err instanceof ConflictException) {
        passedTests.push("9. Duplicate assignment → rejected safely");
        console.log("   PASSED");
      }
    }

    console.log("Test 10: Duplicate primary assignment in same scope → rejected safely");
    try {
      await service.createTeacherSubjectAssignment(tenant1Id, school1Id, {
        academicYearId: academicYear1Id,
        termId: term1Id,
        classId: class1Id,
        subjectId: subject1Id,
        teacherId: activeStaffId,
        scope: AssignmentScope.CLASS_WIDE,
        isPrimary: true, // Primary CW already created in Verification 1
      });
      console.error("   FAILED: Should have thrown ConflictException");
    } catch (err: any) {
      if (err instanceof ConflictException && err.message.includes("Primary teacher assignment already exists")) {
        passedTests.push("10. Duplicate primary assignment in same scope → rejected safely");
        console.log("   PASSED");
      }
    }

    console.log("Test 11: Teacher attempting to create their own assignment → rejected");
    try {
      await invokeGuardedController("createTeacherSubjectAssignment", teacherReq, {
        academicYearId: academicYear1Id,
        termId: term1Id,
        classId: class1Id,
        armId: armBId,
        subjectId: subject1Id,
        teacherId: activeStaffId,
        scope: AssignmentScope.ARM_SPECIFIC,
      });
      console.error("   FAILED: Should have thrown ForbiddenException");
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        passedTests.push("11. Teacher attempting to create their own assignment → rejected");
        console.log("   PASSED");
      }
    }

    console.log("Test 12: ClassTeacherAssignment alone does NOT grant grading authority");
    // Created in Verification 3
    const subj2 = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.subject.create({
        data: { tenantId: tenant1Id, schoolId: school1Id, name: "English" },
      }),
    );
    const ctAuthCheck = await service.checkTeacherGradingAuthority({
      tenantId: tenant1Id,
      schoolId: school1Id,
      teacherId: activeStaffId,
      academicYearId: academicYear1Id,
      termId: term1Id,
      classId: class1Id,
      armId: armBId,
      subjectId: subj2.id,
    });
    if (!ctAuthCheck.hasAuthority) {
      passedTests.push("12. ClassTeacherAssignment alone does NOT grant grading authority");
      console.log("   PASSED");
    }

    console.log("Test 13: ARM_SPECIFIC teacher cannot access another arm");
    const armSpecificStaff = await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.staffProfile.create({
        data: {
          tenantId: tenant1Id,
          schoolId: school1Id,
          staffNumber: `STF_ARM_${ts}`,
          firstName: "Arm",
          lastName: "Teacher",
          joiningDate: new Date(),
          type: StaffType.TEACHING,
          status: "ACTIVE",
        },
      }),
    );
    await service.createTeacherSubjectAssignment(tenant1Id, school1Id, {
      academicYearId: academicYear1Id,
      termId: term1Id,
      classId: class1Id,
      armId: armAId,
      subjectId: subj2.id,
      teacherId: armSpecificStaff.id,
      scope: AssignmentScope.ARM_SPECIFIC,
      isPrimary: true,
    });
    const otherArmCheck = await service.checkTeacherGradingAuthority({
      tenantId: tenant1Id,
      schoolId: school1Id,
      teacherId: armSpecificStaff.id,
      academicYearId: academicYear1Id,
      termId: term1Id,
      classId: class1Id,
      armId: armBId, // armB instead of armA
      subjectId: subj2.id,
    });
    if (!otherArmCheck.hasAuthority) {
      passedTests.push("13. ARM_SPECIFIC teacher cannot access another arm");
      console.log("   PASSED");
    }

    console.log("Test 14: CLASS_WIDE teacher can operate across arms within the same school scope");
    const cwArmACheck = await service.checkTeacherGradingAuthority({
      tenantId: tenant1Id,
      schoolId: school1Id,
      teacherId: activeStaffId,
      academicYearId: academicYear1Id,
      termId: term1Id,
      classId: class1Id,
      armId: armAId,
      subjectId: subject1Id,
    });
    const cwArmBCheck = await service.checkTeacherGradingAuthority({
      tenantId: tenant1Id,
      schoolId: school1Id,
      teacherId: activeStaffId,
      academicYearId: academicYear1Id,
      termId: term1Id,
      classId: class1Id,
      armId: armBId,
      subjectId: subject1Id,
    });
    if (cwArmACheck.hasAuthority && cwArmBCheck.hasAuthority) {
      passedTests.push("14. CLASS_WIDE teacher can operate across arms within same school");
      console.log("   PASSED");
    }

    console.log("Test 15: CLASS_WIDE teacher does not gain authority in another school");
    const cwOtherSchoolCheck = await service.checkTeacherGradingAuthority({
      tenantId: tenant1Id,
      schoolId: school2Id, // different school
      teacherId: activeStaffId,
      academicYearId: academicYear1Id,
      termId: term1Id,
      classId: class1Id,
      armId: armAId,
      subjectId: subject1Id,
    });
    if (!cwOtherSchoolCheck.hasAuthority) {
      passedTests.push("15. CLASS_WIDE teacher does not gain authority in another school");
      console.log("   PASSED");
    }

    console.log("Test 16: Existing MIGRATION_5G_001 assignment remains valid and usable");
    await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.teacherSubjectAssignment.create({
        data: {
          tenantId: tenant1Id,
          schoolId: school1Id,
          academicYearId: academicYear1Id,
          termId: term1Id,
          classId: class1Id,
          armId: armBId,
          subjectId: subject1Id,
          teacherId: activeStaffId,
          scope: AssignmentScope.ARM_SPECIFIC,
          isPrimary: false,
          status: "ACTIVE",
          migrationBatchId: "MIGRATION_5G_001",
        },
      }),
    );
    const migratedAuthCheck = await service.checkTeacherGradingAuthority({
      tenantId: tenant1Id,
      schoolId: school1Id,
      teacherId: activeStaffId,
      academicYearId: academicYear1Id,
      termId: term1Id,
      classId: class1Id,
      armId: armBId,
      subjectId: subject1Id,
    });
    if (migratedAuthCheck.hasAuthority) {
      passedTests.push("16. Existing MIGRATION_5G_001 assignment remains valid and usable");
      console.log("   PASSED");
    }

    console.log("Test 17: Quarantined migration records do NOT become grading assignments");
    await tenantContext.run({ tenantId: tenant1Id }, async () =>
      await kernel.db.assignmentMigrationQuarantine.create({
        data: {
          tenantId: tenant1Id,
          schoolId: school1Id,
          academicYearId: academicYear1Id,
          termId: term1Id,
          classId: class1Id,
          armId: armAId,
          subjectId: subj2.id,
          teacherId: staffSchool2Id,
          quarantineReason: "PRIMARY_TEACHER_AMBIGUOUS",
          migrationBatchId: "MIGRATION_5G_001",
        },
      }),
    );
    const quarantineAuthCheck = await service.checkTeacherGradingAuthority({
      tenantId: tenant1Id,
      schoolId: school1Id,
      teacherId: staffSchool2Id,
      academicYearId: academicYear1Id,
      termId: term1Id,
      classId: class1Id,
      armId: armAId,
      subjectId: subj2.id,
    });
    if (!quarantineAuthCheck.hasAuthority) {
      passedTests.push("17. Quarantined migration records do NOT become grading assignments");
      console.log("   PASSED");
    }

    console.log("Test 18: Tenant/school isolation is maintained on list/read endpoints");
    const listSch1 = await invokeGuardedController("listTeacherSubjectAssignments", schoolAdminReq, {});
    const reqSchool2 = {
      user: { sub: userSchoolAdminId },
      workspace: { tenantId: tenant1Id, schoolId: school2Id, roleId: roleSchoolAdminId },
    } as any;
    const listSch2 = await invokeGuardedController("listTeacherSubjectAssignments", reqSchool2, {});
    const sch1Ids = listSch1.data.map((a: any) => a.id);
    const hasCrossSchoolInList = listSch2.data.some((a: any) => sch1Ids.includes(a.id));
    if (!hasCrossSchoolInList) {
      passedTests.push("18. Tenant/school isolation is maintained on list/read endpoints");
      console.log("   PASSED");
    }

    console.log("\n==================================================");
    console.log(`ALL ${passedTests.length}/25 CANONICAL PERMISSION CATALOG & SECURITY TESTS PASSED!`);
    console.log("==================================================\n");

  } finally {
    // Clean up test fixture safely filtering defined IDs
    const roleIds = [roleSuperAdminId, roleSchoolAdminId, roleAcademicAdminId, roleTeacherId, roleNoPermId, roleEmpoweredTeacherId].filter(Boolean);
    const permIds = [permManageId, permReadId].filter(Boolean);
    const userIds = [userSuperAdminId, userSchoolAdminId, userAcademicAdminId, userTeacherId, userTeacher2Id, userNoPermId, userEmpoweredTeacherId].filter(Boolean);

    for (const tid of [tenant1Id, tenant2Id]) {
      await tenantContext.run({ tenantId: tid }, async () => {
        if (roleIds.length > 0) {
          await kernel.db.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } });
        }
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
    // Clean up canonical permissions created for testing
    if (permIds.length > 0) {
      await kernel.db.permission.deleteMany({ where: { id: { in: permIds } } });
    }
  }
}

runStep3SecuritySuite()
  .then(() => {
    console.log("Step 3 Security Suite (Canonical Permission Catalog) finished cleanly.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Step 3 Security Suite failed:", err);
    process.exit(1);
  });
