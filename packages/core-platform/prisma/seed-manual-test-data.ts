import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$zhC0qm19jYLI655yuTfHfQ$Cln/AzbKehha/1uingeTjhe0URmaM+qrboP5DTuClqw';

const ADMIN_EMAILS = [
  'gbemijaiyeoba@gmail.com',
  'tosinjaiyeoba@yahoo.com',
];

const TEACHER_EMAILS = [
  'tayoawo64@gmail.com',
  'itunuawo18@gmail.com',
  'ibukunawo16@gmail.com',
  'sadeawo85@gmail.com',
  'tosinawo85@gmail.com',
];

const PERMISSIONS = [
  'website:manage_config',
  'website:manage_content',
  'admin:full_access',
  'finance:view',
  'finance:manage',
  'academic:manage_results',
  'academic:view_results'
];

async function seedPermissions(tenantId: string, roleName: string) {
  let role = await prisma.role.findFirst({ where: { tenantId, name: roleName } });
  if (!role) {
    role = await prisma.role.create({ data: { tenantId, name: roleName } });
  }

  for (const permName of PERMISSIONS) {
    let perm = await prisma.permission.findFirst({ where: { name: permName } });
    if (!perm) {
      perm = await prisma.permission.create({ data: { name: permName, description: `Seeded ${permName}` } });
    }
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
      update: {},
      create: { roleId: role.id, permissionId: perm.id }
    });
  }
  return role;
}

async function upsertUser(email: string) {
  let user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, passwordHash: PASSWORD_HASH, emailVerified: new Date() }
    });
  } else {
    // Ensure password is correct
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: PASSWORD_HASH }
    });
  }
  return user;
}

async function main() {
  console.log('Starting persistent manual-testing seed...');

  // Tenants to seed
  const tenantsToSeed = [
    { name: 'Demo Academy Group', slug: 'demo-academy', adminEmail: ADMIN_EMAILS[0], schools: ['Demo Academy Primary School', 'Demo Academy College'] },
    { name: 'Test Education Group', slug: 'test-education', adminEmail: ADMIN_EMAILS[1], schools: ['Test Education Primary School', 'Test Education College'] },
  ];

  let teacherEmailIndex = 0;

  for (const tConfig of tenantsToSeed) {
    // 1. Tenant
    let tenant = await prisma.tenant.findFirst({ where: { slug: tConfig.slug } });
    if (!tenant) {
      tenant = await prisma.tenant.create({ data: { name: tConfig.name, slug: tConfig.slug, status: 'ACTIVE' } });
    }

    // 2. Admin & Role
    const adminUser = await upsertUser(tConfig.adminEmail);
    const adminRole = await seedPermissions(tenant.id, 'ADMIN');

    await prisma.userTenantMembership.upsert({
      where: { userId_tenantId: { userId: adminUser.id, tenantId: tenant.id } },
      update: { roleId: adminRole.id },
      create: { userId: adminUser.id, tenantId: tenant.id, roleId: adminRole.id, state: 'PROVISIONED' }
    });

    for (let i = 0; i < tConfig.schools.length; i++) {
      const schoolName = tConfig.schools[i];
      const schoolPublicSlug = `${tConfig.slug}-s${i+1}`;
      
      let school = await prisma.school.findFirst({ where: { tenantId: tenant.id, name: schoolName } });
      if (!school) {
        school = await prisma.school.create({ data: { tenantId: tenant.id, name: schoolName, publicSlug: schoolPublicSlug } });
      }

      await prisma.userSchoolAccess.upsert({
        where: { userId_schoolId_campusId: { userId: adminUser.id, schoolId: school.id, campusId: '' } }, // Wait, campusId is optional, prisma considers null unique correctly if we query first.
        update: {},
        create: { userId: adminUser.id, tenantId: tenant.id, schoolId: school.id }
      }).catch(async () => {
        const existing = await prisma.userSchoolAccess.findFirst({ where: { userId: adminUser.id, schoolId: school.id } });
        if (!existing) {
           await prisma.userSchoolAccess.create({ data: { userId: adminUser.id, tenantId: tenant.id, schoolId: school.id } });
        }
      });

      const campusesToSeed = ['Main Campus', 'North Campus'];
      
      for (let c = 0; c < campusesToSeed.length; c++) {
        const campusName = campusesToSeed[c];
        let campus = await prisma.campus.findFirst({ where: { tenantId: tenant.id, schoolId: school.id, name: campusName } });
        if (!campus) {
          campus = await prisma.campus.create({ data: { tenantId: tenant.id, schoolId: school.id, name: campusName } });
        }

        // Academic Year & Term
        let acYear = await prisma.academicYear.findFirst({ where: { tenantId: tenant.id, schoolId: school.id, name: '2026/2027' } });
        if (!acYear) {
          acYear = await prisma.academicYear.create({ data: { tenantId: tenant.id, schoolId: school.id, name: '2026/2027', startDate: new Date('2026-09-01'), endDate: new Date('2027-07-01') } });
        }

        let term = await prisma.term.findFirst({ where: { tenantId: tenant.id, academicYearId: acYear.id, name: 'First Term' } });
        if (!term) {
          term = await prisma.term.create({ data: { tenantId: tenant.id, academicYearId: acYear.id, name: 'First Term', startDate: new Date('2026-09-01'), endDate: new Date('2026-12-15') } });
        }

        // Classes & Arms
        const classNames = ['Primary 1', 'Primary 2', 'Primary 3'];
        const armsData = [];
        
        for (const clsName of classNames) {
          let cls = await prisma.class.findFirst({ where: { tenantId: tenant.id, schoolId: school.id, name: clsName } });
          if (!cls) {
            cls = await prisma.class.create({ data: { tenantId: tenant.id, schoolId: school.id, name: clsName } });
          }

          let arm = await prisma.arm.findFirst({ where: { tenantId: tenant.id, classId: cls.id, campusId: campus.id, name: 'A' } });
          if (!arm) {
            arm = await prisma.arm.create({ data: { tenantId: tenant.id, classId: cls.id, campusId: campus.id, name: 'A' } });
          }
          armsData.push({ clsName, class: cls, arm });

          // Students (5 per class/arm)
          for (let s = 1; s <= 5; s++) {
            const studentNum = `STU-${tConfig.slug.substring(0,3).toUpperCase()}-S${i+1}-C${c+1}-${clsName.replace(' ','')}-${s}`;
            let student = await prisma.student.findFirst({ where: { tenantId: tenant.id, schoolId: school.id, studentNumber: studentNum } });
            if (!student) {
              student = await prisma.student.create({
                data: {
                  tenantId: tenant.id, schoolId: school.id, studentNumber: studentNum,
                  firstName: `Demo`, lastName: `Student`, middleName: `${clsName} A0${s}`, gender: 'MALE', admissionDate: new Date()
                }
              });
            }
            
            // Enrollment
            let enroll = await prisma.enrollment.findFirst({
               where: { tenantId: tenant.id, studentId: student.id, academicYearId: acYear.id }
            });
            if (!enroll) {
               await prisma.enrollment.create({
                 data: { tenantId: tenant.id, studentId: student.id, schoolId: school.id, campusId: campus.id, academicYearId: acYear.id, classId: cls.id, armId: arm.id, status: 'ACTIVE' }
               });
            }
          }
        }

        // Subjects & Group
        let subjGroup = await prisma.subjectGroup.findFirst({ where: { tenantId: tenant.id, schoolId: school.id, name: 'Core Subjects' } });
        if (!subjGroup) {
          subjGroup = await prisma.subjectGroup.create({ data: { tenantId: tenant.id, schoolId: school.id, name: 'Core Subjects' } });
        }

        const subjNames = ['Mathematics', 'English', 'Science'];
        const subjectRecords = [];
        for (const sName of subjNames) {
          let subj = await prisma.subject.findFirst({ where: { tenantId: tenant.id, schoolId: school.id, name: sName } });
          if (!subj) {
            subj = await prisma.subject.create({ data: { tenantId: tenant.id, schoolId: school.id, name: sName, subjectGroupId: subjGroup.id } });
          }
          subjectRecords.push(subj);
        }

        // Teachers (3 per campus)
        for (let t = 0; t < 3; t++) {
          const tEmail = teacherEmailIndex < TEACHER_EMAILS.length 
                         ? TEACHER_EMAILS[teacherEmailIndex++] 
                         : `seed.teacher.${tConfig.slug}-s${i+1}-c${c+1}-t${t+1}@schoolos.test`;
          
          const tUser = await upsertUser(tEmail);
          
          // Role assignment
          await prisma.userTenantMembership.upsert({
            where: { userId_tenantId: { userId: tUser.id, tenantId: tenant.id } },
            update: { roleId: adminRole.id }, // For manual test convenience, giving teachers admin perms so they can do everything, or create a 'TEACHER' role. Let's create a TEACHER role.
            create: { userId: tUser.id, tenantId: tenant.id, roleId: adminRole.id, state: 'PROVISIONED' }
          }).catch(async () => {
             const exist = await prisma.userTenantMembership.findFirst({ where: { userId: tUser.id, tenantId: tenant.id }});
             if (!exist) { await prisma.userTenantMembership.create({ data: { userId: tUser.id, tenantId: tenant.id, roleId: adminRole.id }}); }
          });

          let staffProfile = await prisma.staffProfile.findFirst({ where: { tenantId: tenant.id, userId: tUser.id } });
          if (!staffProfile) {
            staffProfile = await prisma.staffProfile.create({ data: { tenantId: tenant.id, schoolId: school.id, userId: tUser.id, staffNumber: `TCH-${Date.now()}-${t}`, firstName: 'Teacher', lastName: `${subjNames[t]}`, joiningDate: new Date(), type: 'TEACHING' } });
          }

          let staffCampus = await prisma.staffCampusAssignment.findFirst({ where: { tenantId: tenant.id, staffId: staffProfile.id, campusId: campus.id } });
          if (!staffCampus) {
             await prisma.staffCampusAssignment.create({ data: { tenantId: tenant.id, staffId: staffProfile.id, campusId: campus.id, isPrimary: true } });
          }

          // Assign to subject & class arms
          const subj = subjectRecords[t];
          for (const d of armsData) {
            let assignment = await prisma.teacherSubjectAssignment.findFirst({
              where: { tenantId: tenant.id, schoolId: school.id, teacherId: staffProfile.id, academicYearId: acYear.id, termId: term.id, classId: d.class.id, armId: d.arm.id, subjectId: subj.id }
            });
            if (!assignment) {
              await prisma.teacherSubjectAssignment.create({
                data: { tenantId: tenant.id, schoolId: school.id, teacherId: staffProfile.id, academicYearId: acYear.id, termId: term.id, classId: d.class.id, armId: d.arm.id, subjectId: subj.id }
              });
            }
          }
        }

      }
    }
  }

  console.log('Persistent seed complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => { prisma.$disconnect(); });
