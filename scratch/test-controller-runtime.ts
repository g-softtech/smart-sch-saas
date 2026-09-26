import dotenv from 'dotenv';
dotenv.config();
import { AttendanceController } from '../apps/api-gateway/src/modules/attendance/controllers/attendance.controller';
import { AttendanceService } from '../apps/api-gateway/src/modules/attendance/services/attendance.service';
import { AttendanceRepository } from '../apps/api-gateway/src/modules/attendance/repositories/attendance.repository';
import { kernel, tenantContext } from '@saas/core-platform';

async function main() {
  console.log('=== TESTING ATTENDANCE CONTROLLER END-TO-END ===');

  const tenant = await kernel.db.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found");

  await tenantContext.run({ tenantId: tenant.id }, async () => {
    const school = await kernel.db.school.findFirst();
    const class1B = await kernel.db.class.findFirst({ where: { name: 'Grade 1B' } });

    if (!school || !class1B) {
      console.error('Missing prerequisite data');
      return;
    }

    const repo = new AttendanceRepository();
    const service = new AttendanceService(repo, { appendEvent: async () => {} } as any);
    const controller = new AttendanceController(service);

    // Case A: School-wide workspace context (campusId undefined)
    const reqSchoolWide = {
      workspace: {
        tenantId: tenant.id,
        schoolId: school.id,
        campusId: undefined
      }
    };

    const resA = await controller.getEligibleStudents(reqSchoolWide, {
      classId: class1B.id,
      date: '2026-09-26'
    });

    console.log(`\nCase A (School-wide workspace context):`);
    console.log(`  Returned count: ${resA.length}`);
    console.log(`  Returned students:`, resA.map(s => `${s.studentId} (${s.firstName} ${s.lastName})`));

    // Case B: Campus workspace context (if a campusId is set, e.g. "some-campus-id")
    const reqCampusScoped = {
      workspace: {
        tenantId: tenant.id,
        schoolId: school.id,
        campusId: 'some-campus-id'
      }
    };

    const resB = await controller.getEligibleStudents(reqCampusScoped, {
      classId: class1B.id,
      date: '2026-09-26'
    });

    console.log(`\nCase B (Campus workspace context: 'some-campus-id'):`);
    console.log(`  Returned count: ${resB.length}`);

    // Case C: Register creation followed by detail retrieval
    console.log(`\nCase C: Register creation with empty records array...`);
    const bulkDto = {
      academicYearId: (await kernel.db.academicYear.findFirst({ where: { schoolId: school.id } }))!.id,
      termId: (await kernel.db.term.findFirst())!.id,
      classId: class1B.id,
      date: '2026-09-26',
      records: []
    };
    const reqUser = { ...reqSchoolWide, user: { sub: 'user-1' } };

    const registerRes = await controller.bulkCreateRegister(reqUser, bulkDto);
    console.log(`  Register created ID: ${registerRes.id}`);

    // Fetch register by ID
    const singleReg = await controller.getRegister(reqUser, registerRes.id);
    console.log(`  Register records count in DB: ${singleReg.records?.length || 0}`);
  });
}

main().catch(console.error).finally(() => process.exit(0));
