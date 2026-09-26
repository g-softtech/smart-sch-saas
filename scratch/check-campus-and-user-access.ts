import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CAMPUS & USER ACCESS FORENSIC CHECK ===');

  const users = await prisma.user.findMany({
    include: {
      schoolAccess: true,
      memberships: {
        include: {
          role: true
        }
      }
    }
  });

  console.log('\n--- USERS & ACCESS ---');
  users.forEach(u => {
    console.log(`User: ${u.email} (ID: ${u.id}, GlobalRole: ${u.globalRole})`);
    console.log(`  Memberships:`, u.memberships.map(m => ({ tenantId: m.tenantId, role: m.role?.name })));
    console.log(`  SchoolAccess:`, u.schoolAccess.map(sa => ({ schoolId: sa.schoolId, campusId: sa.campusId, role: sa.role })));
  });

  const enrollments = await prisma.enrollment.findMany({
    include: {
      student: true,
      campus: true
    }
  });

  console.log('\n--- ENROLLMENTS DETAILS ---');
  enrollments.forEach(e => {
    console.log(`Enrollment ID: ${e.id}`);
    console.log(`  Student: ${e.student.firstName} ${e.student.lastName} (ID: ${e.studentId})`);
    console.log(`  ClassId: ${e.classId}`);
    console.log(`  ArmId: ${e.armId}`);
    console.log(`  CampusId: ${e.campusId} (${e.campus?.name || 'No Campus / Null'})`);
    console.log(`  Status: ${e.status}`);
    console.log(`  EnrolledAt: ${e.enrolledAt.toISOString()}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
