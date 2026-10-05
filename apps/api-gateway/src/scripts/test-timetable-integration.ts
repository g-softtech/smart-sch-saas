import { PrismaClient } from "@saas/core-platform";
import { TimetableService } from "../modules/academics/services/timetable.service";

const testDbUrl = process.env.DATABASE_URL || 'postgresql://schoolos:schoolos_password@localhost:5432/schoolos_db';
if (!testDbUrl.includes('localhost') && !testDbUrl.includes('127.0.0.1')) {
  console.error(`FATAL DATABASE SAFETY VIOLATION: DATABASE_URL must point to local PostgreSQL, got: ${testDbUrl}`);
  process.exit(1);
}
process.env.DATABASE_URL = testDbUrl;

const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
const service = new TimetableService();

async function runTests() {
  console.log("=== Starting Timetable Integration Tests ===");
  const ts = Date.now();
  const tenantId = `t-time-${ts}`;
  const schoolId = `s-time-${ts}`;
  const userId = `u-time-${ts}`;
  const teacherId = `stf-time-${ts}`;

  try {
    // 1. Setup Tenant, School, User, Staff
    await prisma.tenant.create({ data: { id: tenantId, name: 'Timetable Test Tenant', slug: tenantId } });
    await prisma.school.create({ data: { id: schoolId, tenantId, name: 'Timetable Test School' } });
    await prisma.user.create({ data: { id: userId, email: `${userId}@example.com` } });
    const teacher = await prisma.staffProfile.create({
      data: {
        id: teacherId, tenantId, schoolId, userId, staffNumber: `STF-${ts}`,
        firstName: 'Bob', lastName: 'Teacher', gender: 'MALE',
        type: 'TEACHING', status: 'ACTIVE', joiningDate: new Date(),
      }
    });

    const ay = await prisma.academicYear.create({ data: { tenantId, schoolId, name: `AY-${ts}`, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') }});
    const term = await prisma.term.create({ data: { tenantId, academicYearId: ay.id, name: `Term 1-${ts}`, startDate: new Date('2026-01-01'), endDate: new Date('2026-04-30') }});
    const cls = await prisma.class.create({ data: { tenantId, schoolId, name: `Class-${ts}` }});
    const campus = await prisma.campus.create({ data: { tenantId, schoolId, name: `Campus-${ts}` }});
    const arm = await prisma.arm.create({ data: { tenantId, classId: cls.id, campusId: campus.id, name: `Arm-${ts}` }});
    const subject = await prisma.subject.create({ data: { tenantId, schoolId, name: `Subject-${ts}` }});
  
  // 1. Create Period
  console.log("1. Create Period");
  let period = await service.createPeriod(tenantId, schoolId, {
    academicYearId: ay.id,
    name: "Test Period " + Date.now(),
    startTime: "08:00",
    endTime: "08:45",
    isBreak: false
  });
  console.log("✅ Success");

  // 2. Update Period
  console.log("2. Update Period");
  period = await service.updatePeriod(tenantId, schoolId, period.id, {
    name: period.name + " Updated"
  });
  console.log("✅ Success");

  // 3. Create Entry
  console.log("3. Create Entry");
  let entry = await service.createEntry(tenantId, schoolId, {
    academicYearId: ay.id,
    termId: term.id,
    classId: cls.id,
    subjectId: subject.id,
    periodId: period.id,
    dayOfWeek: "MONDAY",
    teacherId: teacher.id
  });
  console.log("✅ Success");

  // 4. Update Entry
  console.log("4. Update Entry");
  entry = await service.updateEntry(tenantId, schoolId, entry.id, {
    dayOfWeek: "TUESDAY"
  });
  console.log("✅ Success");

  // 5. Cross-school rejection (Period Update)
  console.log("5. Cross-school Period Update Rejection");
  try {
    await service.updatePeriod(tenantId, "fake-school-id", period.id, { name: "Hacked" });
    throw new Error("Should have failed");
  } catch(e: any) {
    if (e.message !== "Period not found") throw e;
    console.log("✅ Rejected");
  }

  // 6. Cross-school rejection (Entry Update)
  console.log("6. Cross-school Entry Update Rejection");
  try {
    await service.updateEntry(tenantId, "fake-school-id", entry.id, { dayOfWeek: "FRIDAY" });
    throw new Error("Should have failed");
  } catch(e: any) {
    if (e.message !== "Timetable entry not found") throw e;
    console.log("✅ Rejected");
  }

  // 7. Teacher double booking check
  console.log("7. Teacher Double Booking");
  const period2 = await service.createPeriod(tenantId, schoolId, {
    academicYearId: ay.id,
    name: "Test Period 2 " + Date.now(),
    startTime: "09:00",
    endTime: "09:45",
    isBreak: false
  });
  const entry2 = await service.createEntry(tenantId, schoolId, {
    academicYearId: ay.id, termId: term.id, classId: cls.id, subjectId: subject.id,
    periodId: period2.id, dayOfWeek: "WEDNESDAY", teacherId: teacher.id
  });
  try {
    await service.updateEntry(tenantId, schoolId, entry2.id, { periodId: period.id, dayOfWeek: "TUESDAY" });
    throw new Error("Should have failed double booking");
  } catch(e: any) {
    if (!e.message.includes("clash")) throw e;
    console.log("✅ Prevented");
  }

  // 8. Class-wide vs Arm conflict
  console.log("8. Class-wide vs Arm Conflict");
  try {
    await service.createEntry(tenantId, schoolId, {
      academicYearId: ay.id, termId: term.id, classId: cls.id, armId: arm.id, subjectId: subject.id,
      periodId: period.id, dayOfWeek: "TUESDAY"
    });
    throw new Error("Should have failed arm vs class");
  } catch (e: any) {
    if (!e.message.includes("clash")) throw e;
    console.log("✅ Prevented");
  }

  // 9. Period deletion with dependent entries rejected
  console.log("9. Period Deletion with Dependencies");
  try {
    await service.deletePeriod(tenantId, schoolId, period.id);
    throw new Error("Should have failed due to deps");
  } catch (e: any) {
    if (!e.message.includes("associated with it")) throw e;
    console.log("✅ Rejected");
  }

  // 10. Entry Deletion
  console.log("10. Delete Entry");
  await service.deleteEntry(tenantId, schoolId, entry.id);
  await service.deleteEntry(tenantId, schoolId, entry2.id);
  console.log("✅ Success");

  // 11. Period Deletion (now allowed)
  console.log("11. Delete Period");
  await service.deletePeriod(tenantId, schoolId, period.id);
  await service.deletePeriod(tenantId, schoolId, period2.id);
  console.log("✅ Success");

  console.log("=== All DB Integration Tests Passed ===");
  } finally {
    console.log("Cleaning up test data...");
    await prisma.timetableEntry.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.timetablePeriod.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.subject.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.arm.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.campus.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.class.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.term.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.academicYear.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.staffProfile.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
    await prisma.school.deleteMany({ where: { id: schoolId } }).catch(() => {});
    await prisma.tenant.deleteMany({ where: { id: tenantId } }).catch(() => {});
    await prisma.$disconnect();
  }
}

runTests().catch(e => {
  console.error("Test Failed:", e);
  process.exit(1);
});
