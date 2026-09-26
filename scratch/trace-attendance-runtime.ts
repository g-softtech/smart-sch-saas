import dotenv from 'dotenv';
dotenv.config();
import { kernel, tenantContext } from '@saas/core-platform';

async function main() {
  console.log('=== FORENSIC RUNTIME TRACE FOR ATTENDANCE DEFECT ===');

  const tenant = await kernel.db.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found");
  
  await tenantContext.run({ tenantId: tenant.id }, async () => {
    const school = await kernel.db.school.findFirst();
    if (!school) throw new Error("No school found");
    
    // Find Grade 1B class
    const class1B = await kernel.db.class.findFirst({
      where: { tenantId: tenant.id, schoolId: school.id, name: 'Grade 1B' }
    });

    if (!class1B) {
      console.log('ERROR: Grade 1B class not found');
      return;
    }

    console.log(`Grade 1B Class ID: ${class1B.id}`);

    // Query 1: Raw count of active enrollments for Grade 1B
    const rawEnrollments = await kernel.db.enrollment.findMany({
      where: {
        tenantId: tenant.id,
        schoolId: school.id,
        classId: class1B.id,
        status: 'ACTIVE'
      },
      include: {
        student: true,
        class: true,
        arm: true
      }
    });

    console.log(`\n1. Database Reality: ${rawEnrollments.length} active enrollments in Grade 1B`);
    rawEnrollments.forEach((e, idx) => {
      console.log(`   [${idx + 1}] Student ID: ${e.studentId}, Name: ${e.student.firstName} ${e.student.lastName}, CampusID: ${e.campusId}, ArmID: ${e.armId}, EnrolledAt: ${e.enrolledAt.toISOString()}`);
    });

    // Query 2: Test getEligibleStudents with date '2026-09-26' (today)
    const dateStr = '2026-09-26';
    const dateObj = new Date(dateStr);
    dateObj.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(dateObj);
    endOfDay.setUTCHours(23, 59, 59, 999);

    console.log(`\n2. Testing getEligibleEnrollments with date = ${dateStr}`);
    console.log(`   dateObj (startOfDay): ${dateObj.toISOString()}`);
    console.log(`   endOfDay: ${endOfDay.toISOString()}`);

    // Test with campusId = undefined (School-wide context)
    const schoolWideEnrollments = await kernel.db.enrollment.findMany({
      where: {
        tenantId: tenant.id,
        schoolId: school.id,
        classId: class1B.id,
        status: 'ACTIVE',
        enrolledAt: { lte: endOfDay }
      },
      include: { student: true }
    });
    console.log(`   School-wide query (campusId undefined, enrolledAt <= endOfDay) returned: ${schoolWideEnrollments.length} students`);

    // Test with campusId = null vs campusId = "some-uuid"
    // Check if req.workspace in interceptor injects campusId!
    const campuses = await kernel.db.campus.findMany({ where: { tenantId: tenant.id, schoolId: school.id } });
    console.log(`\n3. Checking Campuses in School: ${campuses.length}`);
    campuses.forEach(c => console.log(`   Campus: ${c.name} (ID: ${c.id})`));

    if (campuses.length > 0) {
      for (const campus of campuses) {
        const campusEnrollments = await kernel.db.enrollment.findMany({
          where: {
            tenantId: tenant.id,
            schoolId: school.id,
            campusId: campus.id,
            classId: class1B.id,
            status: 'ACTIVE',
            enrolledAt: { lte: endOfDay }
          }
        });
        console.log(`   Campus-scoped query for campus '${campus.name}' (${campus.id}) returned: ${campusEnrollments.length} students`);
      }
    }
  });
}

main().catch(console.error).finally(() => process.exit(0));
