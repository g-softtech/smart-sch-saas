import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env.test' });

import { Test, TestingModule } from '@nestjs/testing';
import { AdmissionsService } from '../src/modules/admissions/services/admissions.service';
import { AdmissionsModule } from '../src/modules/admissions/admissions.module';
import { StudentsModule } from '../src/modules/students/students.module';
import {
  kernel,
  tenantContext,
  ApplicationStatus,
  AdmissionReviewDecision,
  GenderEnum,
} from '@saas/core-platform';

import { JwtService } from '@nestjs/jwt';

const runAsTenant = (tenantId: string, fn: () => Promise<void>) => {
  return tenantContext.run({ tenantId }, fn);
};

describe('AdmissionsService (Real PostgreSQL Integration)', () => {
  let service: AdmissionsService;

  // Test Entities
  let tenantA_id: string;
  let tenantB_id: string;
  let schoolA_id: string;
  let yearA_id: string;
  let classA_id: string;
  let formA_id: string;
  let publicTokenA: string;

  beforeAll(async () => {
    // 1. Establish DB Connection
    console.log('INTEGRATION TEST DATABASE_URL:', process.env.DATABASE_URL);

    // 2. Setup Test Database State
    const tenantA = await kernel.db.tenant.create({
      data: { name: 'Admissions Tenant A', slug: 'adm-tenant-a' },
    });
    tenantA_id = tenantA.id;

    const tenantB = await kernel.db.tenant.create({
      data: { name: 'Admissions Tenant B', slug: 'adm-tenant-b' },
    });
    tenantB_id = tenantB.id;

    await runAsTenant(tenantA_id, async () => {
      const schoolA = await kernel.db.school.create({
        data: { tenantId: tenantA_id, name: 'Admissions School A' },
      });
      schoolA_id = schoolA.id;

      const yearA = await kernel.db.academicYear.create({
        data: { tenantId: tenantA_id, schoolId: schoolA_id, name: '2026/2027' },
      });
      yearA_id = yearA.id;

      const classA = await kernel.db.class.create({
        data: { tenantId: tenantA_id, schoolId: schoolA_id, name: 'Year 7' },
      });
      classA_id = classA.id;
    });

    // 3. Init Nest Context for Services
    const module: TestingModule = await Test.createTestingModule({
      imports: [AdmissionsModule, StudentsModule],
      providers: [
        { provide: JwtService, useValue: {} },
      ],
    }).compile();

    service = module.get<AdmissionsService>(AdmissionsService);

    // 4. Publish a form for Tenant A
    await runAsTenant(tenantA_id, async () => {
      const form = await service.publishForm({
        schoolId: schoolA_id,
        academicYearId: yearA_id,
        targetClassId: classA_id,
        title: 'Year 7 Admissions',
        fieldsSchema: {
          previousSchool: { type: 'string', required: true, maxLength: 50 },
          age: { type: 'number' },
          hasSiblings: { type: 'boolean' },
          enrollmentDate: { type: 'date' },
          state: { type: 'select', options: ['Lagos', 'Abuja'] },
          reportCard: { type: 'file', required: true }
        },
        workflowStages: [
          { key: 'DOCUMENT_REVIEW', name: 'Document Review' },
          { key: 'INTERVIEW', name: 'Interview' }
        ],
      });
      formA_id = form.id;
      publicTokenA = form.publicToken;
    });
  });

  afterAll(async () => {
    // Cleanup in correct order to respect foreign key constraints
    await runAsTenant(tenantA_id, async () => {
      await kernel.db.admissionReview.deleteMany();
      await kernel.db.admissionApplication.deleteMany();
      await kernel.db.applicant.deleteMany();
      await kernel.db.publishedAdmissionForm.deleteMany();
      await kernel.db.enrollment.deleteMany();
      await kernel.db.student.deleteMany();
      await kernel.db.class.deleteMany({ where: { schoolId: schoolA_id } });
      await kernel.db.academicYear.deleteMany({ where: { schoolId: schoolA_id } });
      await kernel.db.school.deleteMany({ where: { tenantId: tenantA_id } });
    });

    await kernel.db.tenant.deleteMany({ where: { id: { in: [tenantA_id, tenantB_id] } } });
  });

  describe('Public Security & Application Submission', () => {
    it('should submit an application using the public token', async () => {
      const result = await service.submitApplication(publicTokenA, {
        applicant: {
          firstName: 'Chidi',
          lastName: 'Eze',
          gender: GenderEnum.MALE,
        },
        formData: { 
          previousSchool: 'Greenwood Primary',
          reportCard: 'doc_987654321',
          age: 11,
          state: 'Lagos'
        }
      });

      expect(result.id).toBeDefined();
      expect(result.trackingToken).toBeDefined();
      expect(result.status).toBe(ApplicationStatus.SUBMITTED);
      expect(result.tenantId).toBe(tenantA_id); // Tenant inherently derived from token!
    });

    it('should fail with NotFound if invalid public token provided', async () => {
      await expect(
        service.submitApplication('invalid_token', {
          applicant: { firstName: 'Ghost', lastName: 'App' },
          formData: {}
        })
      ).rejects.toThrow('Admission form not found or inactive');
    });

    it('should fail if missing required field', async () => {
      await expect(
        service.submitApplication(publicTokenA, {
          applicant: { firstName: 'Ghost', lastName: 'App' },
          formData: { previousSchool: 'School' } // missing reportCard
        })
      ).rejects.toThrow('Missing required field: reportCard');
    });

    it('should fail on wrong field type', async () => {
      await expect(
        service.submitApplication(publicTokenA, {
          applicant: { firstName: 'Ghost', lastName: 'App' },
          formData: { previousSchool: 'School', reportCard: 'doc_1', age: '11' } // age should be number
        })
      ).rejects.toThrow('Field age must be a number');
    });

    it('should fail on invalid SELECT option', async () => {
      await expect(
        service.submitApplication(publicTokenA, {
          applicant: { firstName: 'Ghost', lastName: 'App' },
          formData: { previousSchool: 'School', reportCard: 'doc_1', state: 'New York' }
        })
      ).rejects.toThrow('Field state has an invalid select option');
    });

    it('should fail on unexpected field', async () => {
      await expect(
        service.submitApplication(publicTokenA, {
          applicant: { firstName: 'Ghost', lastName: 'App' },
          formData: { previousSchool: 'School', reportCard: 'doc_1', randomField: 'attack' }
        })
      ).rejects.toThrow('Unexpected field: randomField');
    });

    it('should fail on invalid string length', async () => {
      await expect(
        service.submitApplication(publicTokenA, {
          applicant: { firstName: 'Ghost', lastName: 'App' },
          formData: { previousSchool: 'A'.repeat(51), reportCard: 'doc_1' } // maxLength is 50
        })
      ).rejects.toThrow('Field previousSchool exceeds maximum length');
    });

    it('should fail on raw binary FILE value', async () => {
      await expect(
        service.submitApplication(publicTokenA, {
          applicant: { firstName: 'Ghost', lastName: 'App' },
          formData: { previousSchool: 'School', reportCard: Buffer.from('fake binary') as any }
        })
      ).rejects.toThrow('Field reportCard (file) must be a stable internal object key string');
    });

    it('should fail on expiring/presigned URL FILE value', async () => {
      await expect(
        service.submitApplication(publicTokenA, {
          applicant: { firstName: 'Ghost', lastName: 'App' },
          formData: { previousSchool: 'School', reportCard: 'https://s3.aws.com/bucket/doc?expires=123' }
        })
      ).rejects.toThrow('Field reportCard (file) cannot be a URL');
    });

    it('should reject canonical Applicant fields in dynamic formData', async () => {
      await expect(
        service.submitApplication(publicTokenA, {
          applicant: { firstName: 'Ghost', lastName: 'App' },
          formData: { previousSchool: 'School', reportCard: 'doc_1', firstName: 'Hacker' }
        })
      ).rejects.toThrow("Canonical applicant field 'firstName' is not allowed in dynamic formData");
    });
  });

  describe('Stage Concurrency (Compare-and-Set)', () => {
    let appId: string;
    
    beforeAll(async () => {
      const app = await service.submitApplication(publicTokenA, {
        applicant: { firstName: 'Ngozi', lastName: 'Okafor' },
        formData: { previousSchool: 'School', reportCard: 'doc_1' }
      });
      appId = app.id;
    });

    it('should advance to UNDER_REVIEW and begin DOCUMENT_REVIEW', async () => {
      const result = await service.startReview(appId);
      expect(result.status).toBe(ApplicationStatus.UNDER_REVIEW);
      expect(result.currentStageKey).toBe('DOCUMENT_REVIEW');
    });

    it('should successfully pass DOCUMENT_REVIEW stage', async () => {
      await runAsTenant(tenantA_id, async () => {
        const result = await service.submitReview(appId, 'reviewer1', {
          decision: AdmissionReviewDecision.STAGE_PASS
        });
        expect(result.success).toBe(true);

        const app = await kernel.db.admissionApplication.findUnique({ where: { id: appId } });
        expect(app?.currentStageKey).toBe('INTERVIEW');
      });
    });

    it('should handle genuinely concurrent review decisions cleanly', async () => {
      // 1. Submit a fresh application
      const concurrentApp = await service.submitApplication(publicTokenA, {
        applicant: { firstName: 'Concurrent', lastName: 'Review' },
        formData: { previousSchool: 'School', reportCard: 'doc_1' }
      });
      await service.startReview(concurrentApp.id);

      await runAsTenant(tenantA_id, async () => {
        // 2. Fire 2 concurrent submitReview requests
        const attempts = await Promise.allSettled([
          service.submitReview(concurrentApp.id, 'reviewer1', { decision: AdmissionReviewDecision.STAGE_PASS }),
          service.submitReview(concurrentApp.id, 'reviewer2', { decision: AdmissionReviewDecision.STAGE_PASS })
        ]);

        const successes = attempts.filter(r => r.status === 'fulfilled');
        const conflicts = attempts.filter(r => r.status === 'rejected');

        // 3. Exactly one winner
        expect(successes.length).toBe(1);
        expect(conflicts.length).toBe(1);

        if (conflicts[0].status === 'rejected') {
           expect(conflicts[0].reason.status).toBe(409); // ConflictException is HTTP 409
        }

        // 4. Verify only one AdmissionReview was created for this stage
        const reviews = await kernel.db.admissionReview.findMany({
          where: { applicationId: concurrentApp.id }
        });
        expect(reviews.length).toBe(1); // no extra/stale review

        // 5. Verify the stage advanced correctly without skipping
        const appFinal = await kernel.db.admissionApplication.findUnique({ where: { id: concurrentApp.id } });
        expect(appFinal?.currentStageKey).toBe('INTERVIEW');
      });
    });
  });

  describe('Enrollment Concurrency & Transaction Boundaries (Batch 3C -> 3B)', () => {
    let approvedAppId: string;

    beforeAll(async () => {
      const app = await service.submitApplication(publicTokenA, {
        applicant: { firstName: 'Bola', lastName: 'Tinubu', gender: GenderEnum.MALE },
        formData: { previousSchool: 'School', reportCard: 'doc_1' }
      });
      approvedAppId = app.id;

      await service.startReview(approvedAppId);
      
      await runAsTenant(tenantA_id, async () => {
        await service.submitReview(approvedAppId, 'rev1', { decision: AdmissionReviewDecision.STAGE_PASS }); // passes Document
        await service.submitReview(approvedAppId, 'rev1', { decision: AdmissionReviewDecision.STAGE_PASS }); // passes Interview -> APPROVED
      });
    });

    it('should prevent two simultaneous enrollment requests from creating two students', async () => {
      await runAsTenant(tenantA_id, async () => {
        // Fire 5 concurrent enroll attempts
        const attempts = Array.from({ length: 5 }).map(() =>
          service.enroll(approvedAppId).catch((err) => err)
        );

        const results = await Promise.all(attempts);

        // Exactly 1 should succeed
        const successes = results.filter((r) => r && r.student);
        const conflicts = results.filter((r) => r.status === 409 || r.message?.includes('already enrolled'));

        expect(successes.length).toBe(1);
        expect(conflicts.length).toBe(4);

        // Verify Student & Enrollment created
        const student = successes[0].student;
        const enrollment = successes[0].enrollment;
        
        expect(student).toBeDefined();
        expect(student.firstName).toBe('Bola');
        expect(enrollment).toBeDefined();

        // Verify Application is linked
        const app = await kernel.db.admissionApplication.findUnique({ where: { id: approvedAppId } });
        expect(app?.status).toBe(ApplicationStatus.ENROLLED);
        expect(app?.studentId).toBe(student.id);
      });
    });

    it('should strictly rollback if StudentsService throws during enrollment (Atomicity)', async () => {
      // 1. Create a new approved application
      const app = await service.submitApplication(publicTokenA, {
        applicant: { firstName: 'Rollback', lastName: 'Test', gender: GenderEnum.FEMALE },
        formData: { previousSchool: 'School', reportCard: 'doc_1' }
      });
      await service.startReview(app.id);
      await runAsTenant(tenantA_id, async () => {
        await service.submitReview(app.id, 'r', { decision: AdmissionReviewDecision.STAGE_PASS });
        await service.submitReview(app.id, 'r', { decision: AdmissionReviewDecision.STAGE_PASS });
      });

      // 2. Mock StudentsService.createEnrollment to throw (e.g. partial index unique violation)
      // We can do this by forcing a failure, or replacing the method temporarily
      const originalCreateEnrollment = (service as any).studentsService.createEnrollment.bind((service as any).studentsService);
      (service as any).studentsService.createEnrollment = async () => {
        throw new Error('Simulated Downstream Failure');
      };

      // 3. Attempt enrollment
      await runAsTenant(tenantA_id, async () => {
        await expect(service.enroll(app.id)).rejects.toThrow('Simulated Downstream Failure');
      });

      // 4. Verify Application remains APPROVED and Student is NOT created
      const appPost = await kernel.db.admissionApplication.findUnique({ where: { id: app.id } });
      expect(appPost?.status).toBe(ApplicationStatus.APPROVED);
      expect(appPost?.studentId).toBeNull();

      // Check that 'Rollback Test' student was not left stranded
      const strandedStudent = await kernel.db.student.findFirst({
        where: { firstName: 'Rollback', lastName: 'Test' }
      });
      expect(strandedStudent).toBeNull();

      // Restore method
      (service as any).studentsService.createEnrollment = originalCreateEnrollment;

      // 5. Retry enrollment and prove it can succeed
      await runAsTenant(tenantA_id, async () => {
        const retryResult = await service.enroll(app.id);
        expect(retryResult.student).toBeDefined();
        
        const appFinal = await kernel.db.admissionApplication.findUnique({ where: { id: app.id } });
        expect(appFinal?.status).toBe(ApplicationStatus.ENROLLED);
        expect(appFinal?.studentId).toBe(retryResult.student.id);
      });
    });
  });
});
