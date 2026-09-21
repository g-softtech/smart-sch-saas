const { PrismaClient } = require('../packages/core-platform/node_modules/@prisma/client');
const fs = require('fs');
const path = require('path');

async function run() {
  const envFile = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
  let dbUrl = '';
  for (const line of envFile.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.split('=')[1].replace(/"/g, '').trim();
    }
  }

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  const testTenants = await prisma.tenant.findMany({
    where: { OR: [{ name: 'Manual Auth Test' }, { name: 'Other Auth Test' }] }
  });

  const tenantIds = testTenants.map(t => t.id);
  
  if (tenantIds.length === 0) {
    console.log("No test tenants found.");
    return;
  }
  console.log(`Found tenant IDs to delete: ${tenantIds.join(', ')}`);

  const testUsers = await prisma.user.findMany({
    where: { email: { startsWith: 'manual-' } }
  });
  const userIds = testUsers.map(u => u.id);
  console.log(`Found user IDs to delete: ${userIds.join(', ')}`);

  let recordsDeleted = 0;
  try {
    await prisma.$transaction(async (tx) => {
      const c_attRec = await tx.attendanceRecord.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_attReg = await tx.attendanceRegister.deleteMany({ where: { tenantId: { in: tenantIds } } });
      
      const c_staffCred = await tx.staffCredential.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_staffProf = await tx.staffProfile.deleteMany({ where: { tenantId: { in: tenantIds } } });
      
      const c_admRev = await tx.admissionReview.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_admApp = await tx.admissionApplication.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_applicant = await tx.applicant.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_pubForm = await tx.publishedAdmissionForm.deleteMany({ where: { tenantId: { in: tenantIds } } });

      const c_enrollments = await tx.enrollment.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_students = await tx.student.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_guardians = await tx.guardian.deleteMany({ where: { tenantId: { in: tenantIds } } });

      const c_arms = await tx.arm.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_subjects = await tx.subject.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_subjectGroups = await tx.subjectGroup.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_classes = await tx.class.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_terms = await tx.term.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_academicYears = await tx.academicYear.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_departments = await tx.department.deleteMany({ where: { tenantId: { in: tenantIds } } });

      const c_usa = await tx.userSchoolAccess.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_camp = await tx.campus.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_sch = await tx.school.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_mem = await tx.userTenantMembership.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_role = await tx.role.deleteMany({ where: { tenantId: { in: tenantIds } } });
      const c_ten = await tx.tenant.deleteMany({ where: { id: { in: tenantIds } } });
      const c_user = await tx.user.deleteMany({ where: { id: { in: userIds } } });
      
      recordsDeleted = c_arms.count + c_subjects.count + c_subjectGroups.count + c_classes.count + c_terms.count + c_academicYears.count + c_departments.count + c_usa.count + c_camp.count + c_sch.count + c_mem.count + c_role.count + c_ten.count + c_user.count;
    }, { maxWait: 15000, timeout: 60000 });
    
    console.log(`✅ Smart cleanup successful. ${recordsDeleted} records deleted.`);
  } catch (e) {
    console.error(`❌ Cleanup error:`, e.message);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(console.error);
