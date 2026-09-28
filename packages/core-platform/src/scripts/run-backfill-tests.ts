import { runBackfill } from "./backfill-5g-001";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTests() {
  console.log(`\n==================================================`);
  console.log(`Phase 5G Step 2: Timetable Backfill Test Suite`);
  console.log(`==================================================\n`);

  let testTenantId: string | null = null;

  try {
    // 1. Create clean fixture environment
    const tenant = await prisma.tenant.create({
      data: { name: "Test Backfill Tenant", slug: `test-backfill-${Date.now()}` },
    });
    testTenantId = tenant.id;

    const school = await prisma.school.create({
      data: { tenantId: testTenantId, name: "Test Backfill School" },
    });
    const testSchoolId = school.id;

    const academicYear = await prisma.academicYear.create({
      data: { tenantId: testTenantId, schoolId: testSchoolId, name: `2026/2027-${Date.now()}` },
    });
    const testAcademicYearId = academicYear.id;

    const term = await prisma.term.create({
      data: { tenantId: testTenantId, academicYearId: testAcademicYearId, name: `Term 1-${Date.now()}` },
    });
    const testTermId = term.id;

    const campus = await prisma.campus.create({
      data: { tenantId: testTenantId, schoolId: testSchoolId, name: "Main Campus" },
    });

    const cls = await prisma.class.create({
      data: { tenantId: testTenantId, schoolId: testSchoolId, name: `JSS 1-${Date.now()}` },
    });
    const testClassId = cls.id;

    const arm = await prisma.arm.create({
      data: { tenantId: testTenantId, classId: testClassId, campusId: campus.id, name: "Gold" },
    });
    const testArmId = arm.id;

    const subject = await prisma.subject.create({
      data: { tenantId: testTenantId, schoolId: testSchoolId, name: `Maths-${Date.now()}` },
    });
    const testSubjectId = subject.id;

    const period1 = await prisma.timetablePeriod.create({
      data: {
        tenantId: testTenantId,
        schoolId: testSchoolId,
        academicYearId: testAcademicYearId,
        name: `Period 1-${Date.now()}`,
        startTime: "08:00",
        endTime: "08:40",
      },
    });

    const period2 = await prisma.timetablePeriod.create({
      data: {
        tenantId: testTenantId,
        schoolId: testSchoolId,
        academicYearId: testAcademicYearId,
        name: `Period 2-${Date.now()}`,
        startTime: "08:40",
        endTime: "09:20",
      },
    });

    // Staff Profiles
    const staff1 = await prisma.staffProfile.create({
      data: {
        tenantId: testTenantId,
        schoolId: testSchoolId,
        staffNumber: `STF-01-${Date.now()}`,
        firstName: "Alice",
        lastName: "Teacher",
        joiningDate: new Date(),
        type: "TEACHING",
        status: "ACTIVE",
      },
    });
    const activeTeacher1Id = staff1.id;

    const staff2 = await prisma.staffProfile.create({
      data: {
        tenantId: testTenantId,
        schoolId: testSchoolId,
        staffNumber: `STF-02-${Date.now()}`,
        firstName: "Bob",
        lastName: "Teacher",
        joiningDate: new Date(),
        type: "TEACHING",
        status: "ACTIVE",
      },
    });
    const activeTeacher2Id = staff2.id;

    const inactiveStaff = await prisma.staffProfile.create({
      data: {
        tenantId: testTenantId,
        schoolId: testSchoolId,
        staffNumber: `STF-03-${Date.now()}`,
        firstName: "Charlie",
        lastName: "Inactive",
        joiningDate: new Date(),
        type: "TEACHING",
        status: "TERMINATED",
      },
    });
    const inactiveTeacherId = inactiveStaff.id;

    const otherSchool = await prisma.school.create({
      data: { tenantId: testTenantId, name: "Other School" },
    });
    const mismatchStaff = await prisma.staffProfile.create({
      data: {
        tenantId: testTenantId,
        schoolId: otherSchool.id,
        staffNumber: `STF-04-${Date.now()}`,
        firstName: "Dave",
        lastName: "Mismatch",
        joiningDate: new Date(),
        type: "TEACHING",
        status: "ACTIVE",
      },
    });
    const mismatchTeacherId = mismatchStaff.id;

    // --- Create Fixture Timetable Entries ---

    // 1. Single Teacher Valid Assignment (Slot A & Slot B duplicate for same teacher)
    await prisma.timetableEntry.create({
      data: {
        tenantId: testTenantId,
        schoolId: testSchoolId,
        academicYearId: testAcademicYearId,
        termId: testTermId,
        classId: testClassId,
        armId: testArmId,
        subjectId: testSubjectId,
        teacherId: activeTeacher1Id,
        periodId: period1.id,
        dayOfWeek: "MONDAY",
      },
    });
    await prisma.timetableEntry.create({
      data: {
        tenantId: testTenantId,
        schoolId: testSchoolId,
        academicYearId: testAcademicYearId,
        termId: testTermId,
        classId: testClassId,
        armId: testArmId,
        subjectId: testSubjectId,
        teacherId: activeTeacher1Id,
        periodId: period2.id,
        dayOfWeek: "TUESDAY",
      },
    });

    // 2. Null Teacher Slot (Break Slot)
    await prisma.timetableEntry.create({
      data: {
        tenantId: testTenantId,
        schoolId: testSchoolId,
        academicYearId: testAcademicYearId,
        termId: testTermId,
        classId: testClassId,
        armId: testArmId,
        subjectId: testSubjectId,
        teacherId: null,
        periodId: period1.id,
        dayOfWeek: "WEDNESDAY",
      },
    });

    // 3. Inactive Staff Slot (Quarantine: INACTIVE_OR_MISSING_STAFF)
    const cls2 = await prisma.class.create({
      data: { tenantId: testTenantId, schoolId: testSchoolId, name: `JSS 2-${Date.now()}` },
    });
    await prisma.timetableEntry.create({
      data: {
        tenantId: testTenantId,
        schoolId: testSchoolId,
        academicYearId: testAcademicYearId,
        termId: testTermId,
        classId: cls2.id,
        subjectId: testSubjectId,
        teacherId: inactiveTeacherId,
        periodId: period1.id,
        dayOfWeek: "THURSDAY",
      },
    });

    // 4. Mismatch Staff Slot (Quarantine: STAFF_TENANT_SCHOOL_MISMATCH)
    const cls3 = await prisma.class.create({
      data: { tenantId: testTenantId, schoolId: testSchoolId, name: `JSS 3-${Date.now()}` },
    });
    await prisma.timetableEntry.create({
      data: {
        tenantId: testTenantId,
        schoolId: testSchoolId,
        academicYearId: testAcademicYearId,
        termId: testTermId,
        classId: cls3.id,
        subjectId: testSubjectId,
        teacherId: mismatchTeacherId,
        periodId: period1.id,
        dayOfWeek: "FRIDAY",
      },
    });

    // 5. Multi-Teacher Ambiguity (Class SS 1 has Teacher 1 on Wed, Teacher 2 on Thu -> Quarantine: PRIMARY_TEACHER_AMBIGUOUS)
    const clsSS1 = await prisma.class.create({
      data: { tenantId: testTenantId, schoolId: testSchoolId, name: `SS 1-${Date.now()}` },
    });
    await prisma.timetableEntry.create({
      data: {
        tenantId: testTenantId,
        schoolId: testSchoolId,
        academicYearId: testAcademicYearId,
        termId: testTermId,
        classId: clsSS1.id,
        subjectId: testSubjectId,
        teacherId: activeTeacher1Id,
        periodId: period1.id,
        dayOfWeek: "WEDNESDAY",
      },
    });
    await prisma.timetableEntry.create({
      data: {
        tenantId: testTenantId,
        schoolId: testSchoolId,
        academicYearId: testAcademicYearId,
        termId: testTermId,
        classId: clsSS1.id,
        subjectId: testSubjectId,
        teacherId: activeTeacher2Id,
        periodId: period2.id,
        dayOfWeek: "THURSDAY",
      },
    });

    // Manual Assignment (migrationBatchId = null) to test Rollback Isolation
    const manualAssignment = await prisma.teacherSubjectAssignment.create({
      data: {
        tenantId: testTenantId,
        schoolId: testSchoolId,
        academicYearId: testAcademicYearId,
        termId: testTermId,
        classId: testClassId,
        subjectId: testSubjectId,
        teacherId: activeTeacher2Id,
        scope: "CLASS_WIDE",
        isPrimary: false,
        status: "ACTIVE",
        migrationBatchId: null, // Manual assignment
      },
    });

    // TEST 1: Dry-Run Classification
    console.log(`\nTEST 1: Testing Dry-Run Classification...`);
    const dryRunSummary = await runBackfill(true, prisma);
    console.log(`Dry-Run Summary:`, dryRunSummary);

    if (!dryRunSummary.isReconciled || dryRunSummary.unaccountedCount !== 0) {
      throw new Error(`Dry-Run Source Accounting Invariant Failed! Unaccounted: ${dryRunSummary.unaccountedCount}`);
    }
    if ((dryRunSummary.quarantineReasonsBreakdown["PRIMARY_TEACHER_AMBIGUOUS"] || 0) < 2) {
      throw new Error("Primary teacher ambiguity safeguard was NOT triggered for multi-teacher scope!");
    }
    console.log(`✔ TEST 1 PASSED: Dry-run classification & Primary Safeguard verified.`);

    // TEST 2: Real Write & Provenance Verification
    console.log(`\nTEST 2: Testing Real Execution & Database Writes...`);
    const realSummary = await runBackfill(false, prisma);
    console.log(`Real Summary:`, realSummary);

    if (!realSummary.isReconciled || realSummary.unaccountedCount !== 0) {
      throw new Error(`Real Write Source Accounting Invariant Failed! Unaccounted: ${realSummary.unaccountedCount}`);
    }

    const createdAssignments = await prisma.teacherSubjectAssignment.findMany({
      where: { tenantId: testTenantId, migrationBatchId: "MIGRATION_5G_001" },
    });
    console.log(`Created Assignments in Database: ${createdAssignments.length}`);
    if (createdAssignments.length !== realSummary.migratedAssignmentsCount) {
      throw new Error("Migrated assignments count mismatch in database!");
    }
    console.log(`✔ TEST 2 PASSED: Real execution database writes & provenance verified.`);

    // TEST 3: Rollback Isolation Test
    console.log(`\nTEST 3: Testing Batch Rollback Isolation (MIGRATION_5G_001)...`);
    const deletedQuarantines = await prisma.assignmentMigrationQuarantine.deleteMany({
      where: { tenantId: testTenantId, migrationBatchId: "MIGRATION_5G_001" },
    });
    const deletedAssignments = await prisma.teacherSubjectAssignment.deleteMany({
      where: { tenantId: testTenantId, migrationBatchId: "MIGRATION_5G_001" },
    });
    console.log(`Deleted Quarantines: ${deletedQuarantines.count}, Deleted Assignments: ${deletedAssignments.count}`);

    const manualStillExists = await prisma.teacherSubjectAssignment.findUnique({
      where: { id: manualAssignment.id },
    });
    if (!manualStillExists || manualStillExists.migrationBatchId !== null) {
      throw new Error("ROLLBACK ISOLATION FAILED: Manual assignment with migrationBatchId=null was improperly deleted or altered!");
    }
    console.log(`✔ TEST 3 PASSED: Rollback isolation verified. Manual assignment untouched.`);

    console.log(`\n==================================================`);
    console.log(`ALL BACKFILL PIPELINE TESTS PASSED SUCCESSFULLY!`);
    console.log(`==================================================\n`);
  } finally {
    if (testTenantId) {
      await prisma.teacherSubjectAssignment.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.assignmentMigrationQuarantine.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.timetableEntry.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.timetablePeriod.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.staffProfile.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.arm.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.class.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.subject.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.campus.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.term.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.academicYear.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.school.deleteMany({ where: { tenantId: testTenantId } });
      await prisma.tenant.deleteMany({ where: { id: testTenantId } });
    }
  }
}

runTests()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("Test execution failed:", err);
    prisma.$disconnect();
    process.exit(1);
  });
