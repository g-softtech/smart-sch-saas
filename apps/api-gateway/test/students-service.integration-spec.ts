import * as dotenv from 'dotenv';
// MUST use .env.test which points to localhost!
dotenv.config({ path: '../../.env.test' });

import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from '../src/modules/students/services/students.service';
import { StudentsRepository } from '../src/modules/students/repositories/students.repository';
import { kernel, tenantContext, EnrollmentStatus, StudentStatus } from '@saas/core-platform';

  describe('StudentsService (Real PostgreSQL Integration)', () => {
  let service: StudentsService;
  let repo: StudentsRepository;

  // Tenant/School setup state
  let tenantA_id: string;
  let tenantB_id: string;
  let schoolA_id: string;
  let schoolB_id: string;
  let yearA_id: string;
  let classA_id: string;
  let armA_id: string;

  // Helper to run code within a mock tenant context
  const runAsTenant = (tenantId: string, fn: () => Promise<any>) => {
    return tenantContext.run({ tenantId }, fn);
  };

  beforeAll(async () => {
    // 1. Verify DATABASE_URL points to localhost to avoid touching Neon
    const dbUrl = process.env.DATABASE_URL;
    console.log('INTEGRATION TEST DATABASE_URL:', dbUrl);
    if (!dbUrl || !dbUrl.includes('localhost')) {
      throw new Error('FATAL: DATABASE_URL must point to localhost for integration tests! Current URL: ' + dbUrl);
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [StudentsService, StudentsRepository],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
    repo = module.get<StudentsRepository>(StudentsRepository);

    // 2. Setup Base Entities (Tenants, Schools, Years, Classes, Arms)
    await kernel.db.$executeRawUnsafe('TRUNCATE TABLE "plt_tenants" CASCADE;');

    // Tenant A
    const tenantA = await kernel.db.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a' } });
    tenantA_id = tenantA.id;
    await runAsTenant(tenantA_id, async () => {
      const schoolA = await kernel.db.school.create({ data: { tenantId: tenantA_id, name: 'School A' } });
      schoolA_id = schoolA.id;
      const campusA = await kernel.db.campus.create({ data: { tenantId: tenantA_id, schoolId: schoolA_id, name: 'Campus A' } });
      const yearA = await kernel.db.academicYear.create({ data: { tenantId: tenantA_id, schoolId: schoolA_id, name: 'Year A' } });
      yearA_id = yearA.id;
      const classA = await kernel.db.class.create({ data: { tenantId: tenantA_id, schoolId: schoolA_id, name: 'Class A' } });
      classA_id = classA.id;
      const armA = await kernel.db.arm.create({ data: { tenantId: tenantA_id, classId: classA_id, campusId: campusA.id, name: 'Arm A' } });
      armA_id = armA.id;
    });

    // Tenant B
    const tenantB = await kernel.db.tenant.create({ data: { name: 'Tenant B', slug: 'tenant-b' } });
    tenantB_id = tenantB.id;
    await runAsTenant(tenantB_id, async () => {
      const schoolB = await kernel.db.school.create({ data: { tenantId: tenantB_id, name: 'School B' } });
      schoolB_id = schoolB.id;
    });
  });

  afterAll(async () => {
    // Cleanup
    await kernel.db.$executeRawUnsafe('TRUNCATE TABLE "plt_tenants" CASCADE;');
    await kernel.db.$disconnect();
  });


  describe('Tenant Isolation & School Integrity', () => {
    it('should create a student under Tenant A', async () => {
      await runAsTenant(tenantA_id, async () => {
        const student = await service.createStudent({
          schoolId: schoolA_id,
          firstName: 'John',
          lastName: 'Doe',
          gender: 'MALE',
          admissionDate: new Date(),
        });
        expect(student).toBeDefined();
        expect(student.tenantId).toBe(tenantA_id);
        expect(student.schoolId).toBe(schoolA_id);
      });
    });

    it('should prevent Tenant A from creating a student in School B', async () => {
      await runAsTenant(tenantA_id, async () => {
        await expect(service.createStudent({
          schoolId: schoolB_id, // Belongs to Tenant B
          firstName: 'Bad',
          lastName: 'Actor',
          gender: 'MALE',
          admissionDate: new Date(),
        })).rejects.toThrow('School not found or does not belong to the active tenant');
      });
    });

    it('should prevent Tenant B from reading Tenant A students', async () => {
      // First ensure there's a student in A
      let studentAId: string;
      await runAsTenant(tenantA_id, async () => {
        const students = await service.listStudents();
        expect(students.length).toBeGreaterThan(0);
        studentAId = students[0].id;
      });

      // Tenant B tries to list (should see 0)
      await runAsTenant(tenantB_id, async () => {
        const students = await service.listStudents();
        expect(students.length).toBe(0);
      });

      // Tenant B tries to get directly (should be prevented by kernel)
      await runAsTenant(tenantB_id, async () => {
        await expect(service.getStudent(studentAId)).rejects.toThrow('not found');
      });
    });
  });

  describe('Student Numbers Concurrency', () => {
    it('should generate sequential numbers concurrently without duplicates', async () => {
      await runAsTenant(tenantA_id, async () => {
        const count = 10;
        const promises = Array.from({ length: count }).map((_, i) =>
          service.createStudent({
            schoolId: schoolA_id,
            firstName: `Concurrent${i}`,
            lastName: 'Student',
            gender: 'FEMALE',
            admissionDate: new Date(),
          })
        );
        const students = await Promise.all(promises);
        
        // Ensure all are created
        expect(students.length).toBe(count);

        // Ensure unique student numbers
        const numbers = new Set(students.map(s => s.studentNumber));
        expect(numbers.size).toBe(count);

        // Verify format (e.g. STU-0002)
        const numberStrings = Array.from(numbers);
        expect(numberStrings[0]).toMatch(/^STU-\d{4}$/);
      });
    });
  });

  describe('Active Enrollment Constraint', () => {
    let studentId: string;

    beforeAll(async () => {
      await runAsTenant(tenantA_id, async () => {
        const student = await service.createStudent({
          schoolId: schoolA_id,
          firstName: 'Enroll',
          lastName: 'Test',
          gender: 'MALE',
          admissionDate: new Date(),
        });
        studentId = student.id;
      });
    });

    it('should allow first ACTIVE enrollment', async () => {
      await runAsTenant(tenantA_id, async () => {
        const enrollment = await service.createEnrollment({
          studentId,
          academicYearId: yearA_id,
          classId: classA_id,
          armId: armA_id,
        });
        expect(enrollment).toBeDefined();
        expect(enrollment.status).toBe(EnrollmentStatus.ACTIVE);
      });
    });

    it('should prevent second ACTIVE enrollment for the same year', async () => {
      await runAsTenant(tenantA_id, async () => {
        await expect(service.createEnrollment({
          studentId,
          academicYearId: yearA_id,
          classId: classA_id,
          armId: armA_id,
        })).rejects.toThrow('Student already has an ACTIVE enrollment');
      });
    });
  });

  describe('Transaction Boundaries (Transfer & Withdraw)', () => {
    let studentId: string;
    let enrollmentId: string;

    beforeAll(async () => {
      await runAsTenant(tenantA_id, async () => {
        const student = await service.createStudent({
          schoolId: schoolA_id,
          firstName: 'Transfer',
          lastName: 'Test',
          gender: 'FEMALE',
          admissionDate: new Date(),
        });
        studentId = student.id;
        
        const enrollment = await service.createEnrollment({
          studentId,
          academicYearId: yearA_id,
          classId: classA_id,
        });
        enrollmentId = enrollment.id;
      });
    });

    it('should transfer student, altering status to TRANSFERRED and creating new ACTIVE', async () => {
      await runAsTenant(tenantA_id, async () => {
        // We'll just transfer to the same class but different arm for simplicity
        const newClass = await kernel.db.class.create({ data: { tenantId: tenantA_id, schoolId: schoolA_id, name: 'Class A2' } });

        const newEnrollment = await service.transferEnrollment({
          enrollmentId,
          newClassId: newClass.id,
          notes: 'Moved class',
        });

        expect(newEnrollment.status).toBe(EnrollmentStatus.ACTIVE);
        expect(newEnrollment.classId).toBe(newClass.id);

        // Fetch old enrollment
        const oldEnrollment = await kernel.db.enrollment.findUnique({ where: { id: enrollmentId } });
        expect(oldEnrollment?.status).toBe(EnrollmentStatus.TRANSFERRED);
        expect(oldEnrollment?.notes).toBe('Moved class');
      });
    });

    it('should withdraw student, altering status to WITHDRAWN and student status to WITHDRAWN', async () => {
      await runAsTenant(tenantA_id, async () => {
        // get the new active enrollment
        const enrollments = await service.listEnrollments(studentId);
        const activeEnrollment = enrollments.find(e => e.status === EnrollmentStatus.ACTIVE);
        
        expect(activeEnrollment).toBeDefined();

        await service.withdrawStudent({
          enrollmentId: activeEnrollment!.id,
          studentId,
          notes: 'Leaving',
        });

        const withdrawnEnr = await kernel.db.enrollment.findUnique({ where: { id: activeEnrollment!.id } });
        expect(withdrawnEnr?.status).toBe(EnrollmentStatus.WITHDRAWN);
        expect(withdrawnEnr?.notes).toBe('Leaving');

        const student = await kernel.db.student.findUnique({ where: { id: studentId } });
        expect(student?.status).toBe(StudentStatus.WITHDRAWN);
      });
    });
  });

  describe('Guardian Relationships', () => {
    let studentId: string;
    let guardianId: string;

    beforeAll(async () => {
      await runAsTenant(tenantA_id, async () => {
        const student = await service.createStudent({
          schoolId: schoolA_id,
          firstName: 'Guard',
          lastName: 'Test',
          gender: 'MALE',
          admissionDate: new Date(),
        });
        studentId = student.id;

        const guardian = await service.createGuardian({
          firstName: 'Guard',
          lastName: 'Parent',
        });
        guardianId = guardian.id;
      });
    });

    it('should link guardian and set primary', async () => {
      await runAsTenant(tenantA_id, async () => {
        const link = await service.linkGuardian({
          studentId,
          guardianId,
          relationship: 'FATHER',
          isPrimary: true,
        });

        expect(link.isPrimary).toBe(true);
      });
    });

    it('should unset old primary when linking new primary', async () => {
      await runAsTenant(tenantA_id, async () => {
        const newGuard = await service.createGuardian({
          firstName: 'New',
          lastName: 'Parent',
        });

        await service.linkGuardian({
          studentId,
          guardianId: newGuard.id,
          relationship: 'MOTHER',
          isPrimary: true,
        });

        // check first link
        const firstLink = await kernel.db.studentGuardian.findFirst({ where: { studentId, guardianId } });
        expect(firstLink?.isPrimary).toBe(false);

        // check second link
        const secondLink = await kernel.db.studentGuardian.findFirst({ where: { studentId, guardianId: newGuard.id } });
        expect(secondLink?.isPrimary).toBe(true);
      });
    });
  });
});
