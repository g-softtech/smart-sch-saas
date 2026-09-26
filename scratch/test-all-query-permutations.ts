import dotenv from 'dotenv';
dotenv.config();
import { kernel, tenantContext } from '@saas/core-platform';

async function main() {
  console.log('=== TESTING ALL QUERY PERMUTATIONS FOR ATTENDANCE ROSTER ===');

  const tenant = await kernel.db.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found");

  await tenantContext.run({ tenantId: tenant.id }, async () => {
    const school = await kernel.db.school.findFirst();
    const class1B = await kernel.db.class.findFirst({ where: { name: 'Grade 1B' } });
    if (!school || !class1B) throw new Error("School or Grade 1B not found");

    console.log(`Tenant ID: ${tenant.id}`);
    console.log(`School ID: ${school.id}`);
    console.log(`Class ID: ${class1B.id}`);

    // Print all enrollments for Grade 1B
    const allGrade1BEnrollments = await kernel.db.enrollment.findMany({
      where: { classId: class1B.id },
      include: { student: true, class: true, arm: true, campus: true }
    });

    console.log(`\nAll Enrollments in DB for Class Grade 1B (${allGrade1BEnrollments.length}):`);
    allGrade1BEnrollments.forEach((e, i) => {
      console.log(`  [${i+1}] Student: ${e.student.firstName} ${e.student.lastName}`);
      console.log(`      ID: ${e.id}, StudentID: ${e.studentId}`);
      console.log(`      TenantID: ${e.tenantId}`);
      console.log(`      SchoolID: ${e.schoolId}`);
      console.log(`      CampusID: ${e.campusId}`);
      console.log(`      AcademicYearID: ${e.academicYearId}`);
      console.log(`      ClassID: ${e.classId}`);
      console.log(`      ArmID: ${e.armId}`);
      console.log(`      Status: ${e.status}`);
      console.log(`      EnrolledAt: ${e.enrolledAt.toISOString()}`);
    });

    // Test Permutation 1: armId filter
    // What if armId is passed as null vs non-null vs undefined?
    const armsInSchool = await kernel.db.arm.findMany({ where: { classId: class1B.id } });
    console.log(`\nArms in Grade 1B: ${armsInSchool.length}`);
    armsInSchool.forEach(a => console.log(`  Arm: ${a.name} (${a.id})`));

    // Test Permutation 2: Academic Year filter
    const ayList = await kernel.db.academicYear.findMany({ where: { schoolId: school.id } });
    console.log(`\nAcademic Years in School: ${ayList.length}`);
    ayList.forEach(ay => console.log(`  AY: ${ay.name} (${ay.id})`));

    // Test Permutation 3: Attendance Registers in DB for Grade 1B
    const registersFor1B = await kernel.db.attendanceRegister.findMany({
      where: { classId: class1B.id },
      include: { records: true }
    });
    console.log(`\nAttendance Registers in DB for Grade 1B (${registersFor1B.length}):`);
    registersFor1B.forEach((r, i) => {
      console.log(`  [${i+1}] Register ID: ${r.id}`);
      console.log(`      Date: ${r.date.toISOString()}`);
      console.log(`      ClassID: ${r.classId}`);
      console.log(`      ArmID: ${r.armId}`);
      console.log(`      CampusID: ${r.campusId}`);
      console.log(`      Records Count: ${r.records.length}`);
      r.records.forEach(rec => console.log(`        Record: Student ${rec.studentId}, Status: ${rec.status}`));
    });

    // Test Permutation 4: Date boundary queries
    // Test date '2026-09-26' with lte 00:00:00Z vs lte 23:59:59Z
    const dStart = new Date('2026-09-26T00:00:00.000Z');
    const dEnd = new Date('2026-09-26T23:59:59.999Z');

    const countStart = await kernel.db.enrollment.count({
      where: { tenantId: tenant.id, schoolId: school.id, classId: class1B.id, status: 'ACTIVE', enrolledAt: { lte: dStart } }
    });
    const countEnd = await kernel.db.enrollment.count({
      where: { tenantId: tenant.id, schoolId: school.id, classId: class1B.id, status: 'ACTIVE', enrolledAt: { lte: dEnd } }
    });

    console.log(`\nDate Query Test for 2026-09-26:`);
    console.log(`  enrolledAt <= 2026-09-26T00:00:00.000Z: ${countStart} students`);
    console.log(`  enrolledAt <= 2026-09-26T23:59:59.999Z: ${countEnd} students`);
  });
}

main().catch(console.error).finally(() => process.exit(0));
