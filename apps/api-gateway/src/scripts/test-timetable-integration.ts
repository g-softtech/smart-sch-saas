import { PrismaClient } from "@saas/core-platform";
import { TimetableService } from "../modules/academics/services/timetable.service";

const prisma = new PrismaClient();
const service = new TimetableService();

async function runTests() {
  console.log("=== Starting Timetable Integration Tests ===");
  
  // Setup data
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found. Run seeds.");
  const school = await prisma.school.findFirst({ where: { tenantId: tenant.id } });
  if (!school) throw new Error("No school found. Run seeds.");
  
  const ay = await prisma.academicYear.findFirst({ where: { schoolId: school.id } });
  if (!ay) throw new Error("No AY found. Run seeds.");
  const term = await prisma.term.findFirst({ where: { academicYearId: ay.id } });
  const cls = await prisma.class.findFirst({ where: { schoolId: school.id } });
  const arm = await prisma.arm.findFirst({ where: { classId: cls.id } });
  const subject = await prisma.subject.findFirst({ where: { schoolId: school.id } });
  const teacher = await prisma.staffProfile.findFirst({ where: { schoolId: school.id } });

  if (!term || !cls || !arm || !subject || !teacher) {
    throw new Error("Missing reference data for test. Ensure term, class, arm, subject, teacher exist in school.");
  }

  const tenantId = tenant.id;
  const schoolId = school.id;
  
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
  process.exit(0);
}

runTests().catch(e => {
  console.error("Test Failed:", e);
  process.exit(1);
});
