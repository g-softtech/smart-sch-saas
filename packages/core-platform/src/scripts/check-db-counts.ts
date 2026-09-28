import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkCounts() {
  const tenants = await prisma.tenant.count();
  const schools = await prisma.school.count();
  const staff = await prisma.staffProfile.count();
  const classes = await prisma.class.count();
  const arms = await prisma.arm.count();
  const subjects = await prisma.subject.count();
  const timetableEntries = await prisma.timetableEntry.count();

  console.log(`--- DATABASE ROW COUNTS ---`);
  console.log(`Tenants: ${tenants}`);
  console.log(`Schools: ${schools}`);
  console.log(`StaffProfiles: ${staff}`);
  console.log(`Classes: ${classes}`);
  console.log(`Arms: ${arms}`);
  console.log(`Subjects: ${subjects}`);
  console.log(`TimetableEntries: ${timetableEntries}`);
}

checkCounts()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
  });
