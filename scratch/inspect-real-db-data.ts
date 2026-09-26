import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== FORENSIC DATABASE INSPECTION ===');

  const tenants = await prisma.tenant.findMany();
  console.log('\n--- TENANTS ---', JSON.stringify(tenants, null, 2));

  const schools = await prisma.school.findMany();
  console.log('\n--- SCHOOLS ---', JSON.stringify(schools, null, 2));

  const campuses = await prisma.campus.findMany();
  console.log('\n--- CAMPUSES ---', JSON.stringify(campuses, null, 2));

  const academicYears = await prisma.academicYear.findMany();
  console.log('\n--- ACADEMIC YEARS ---', JSON.stringify(academicYears, null, 2));

  const terms = await prisma.term.findMany();
  console.log('\n--- TERMS ---', JSON.stringify(terms, null, 2));

  const classes = await prisma.class.findMany();
  console.log('\n--- CLASSES ---', JSON.stringify(classes, null, 2));

  const arms = await prisma.arm.findMany();
  console.log('\n--- ARMS ---', JSON.stringify(arms, null, 2));

  const students = await prisma.student.findMany();
  console.log('\n--- STUDENTS ---', JSON.stringify(students, null, 2));

  const enrollments = await prisma.enrollment.findMany({
    include: {
      student: true,
      class: true,
      arm: true,
      campus: true
    }
  });
  console.log('\n--- ENROLLMENTS ---', JSON.stringify(enrollments, null, 2));

  const registers = await prisma.attendanceRegister.findMany({
    include: {
      records: true
    }
  });
  console.log('\n--- ATTENDANCE REGISTERS ---', JSON.stringify(registers, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
