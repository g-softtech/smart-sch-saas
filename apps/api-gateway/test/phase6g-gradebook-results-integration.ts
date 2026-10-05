import { PrismaClient, StaffType, ResultStatus, WorkflowStatus } from '@saas/core-platform';
import { kernel, tenantContext } from '@saas/core-platform';
import { TeacherGradebookService } from '../src/modules/academics/services/teacher-gradebook.service';
import { TeacherAssignmentsService } from '../src/modules/academics/services/teacher-assignments.service';
import { AcademicsRepository } from '../src/modules/academics/repositories/academics.repository';
import { ResultsService } from '../src/modules/academics/services/results.service';
import { ResultsEngineService, MissingGradingConfigurationException } from '../src/modules/academics/services/results-engine.service';
import { ForbiddenException, ConflictException } from '@nestjs/common';
import assert from 'assert';

const testDbUrl = process.env.DATABASE_URL || 'postgresql://schoolos:schoolos_password@localhost:5432/schoolos_db';

if (!testDbUrl.includes('localhost') && !testDbUrl.includes('127.0.0.1')) {
  console.error(`FATAL DATABASE SAFETY VIOLATION: DATABASE_URL must point to local PostgreSQL, got: ${testDbUrl}`);
  process.exit(1);
}

process.env.DATABASE_URL = testDbUrl;
console.log(`[SAFE DB HOST VERIFIED]: ${testDbUrl}`);

const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
kernel.db = prisma as any;

async function runGradebookIntegrationTest() {
  console.log('--- Starting Phase 6G Gradebook -> ResultsEngine Integration Test ---');
  const ts = Date.now();
  const tenantId = `t-gbook-${ts}`;
  const schoolId = `s-gbook-${ts}`;
  const userId = `u-teacher-${ts}`;
  const teacherStaffId = `stf-teacher-${ts}`;
  const studentId = `stu-gbook-${ts}`;
  const enrollmentId = `enr-gbook-${ts}`;

  const resultsEngine = new ResultsEngineService();
  const resultsService = new ResultsService(resultsEngine);
  const repo = new AcademicsRepository();
  const assignmentsService = new TeacherAssignmentsService(repo);
  const gradebookService = new TeacherGradebookService(assignmentsService, resultsService, resultsEngine);

  try {
    // 1. Setup Tenant, School, User, Staff Profile
    await prisma.tenant.create({ data: { id: tenantId, name: 'Gradebook Test Tenant', slug: tenantId } });
    await prisma.school.create({ data: { id: schoolId, tenantId, name: 'Gradebook Test School' } });
    await prisma.user.create({ data: { id: userId, email: `${userId}@example.com` } });
    await prisma.staffProfile.create({
      data: {
        id: teacherStaffId,
        tenantId,
        schoolId,
        userId,
        staffNumber: `STF-${ts}`,
        firstName: 'Jane',
        lastName: 'Teacher',
        gender: 'FEMALE',
        type: StaffType.TEACHING,
        status: 'ACTIVE',
        joiningDate: new Date(),
      },
    });

    // 2. Setup Academic Infrastructure
    const ay = await prisma.academicYear.create({
      data: { tenantId, schoolId, name: `AY-${ts}`, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
    });
    const term1 = await prisma.term.create({
      data: { tenantId, academicYearId: ay.id, name: `Term 1-${ts}`, startDate: new Date('2026-01-01'), endDate: new Date('2026-04-30') },
    });
    const term2 = await prisma.term.create({
      data: { tenantId, academicYearId: ay.id, name: `Term 2 (No Config)-${ts}`, startDate: new Date('2026-05-01'), endDate: new Date('2026-08-31') },
    });

    const targetClass = await prisma.class.create({ data: { tenantId, schoolId, name: `Class 1-${ts}` } });
    const subject = await prisma.subject.create({ data: { tenantId, schoolId, name: `Mathematics-${ts}` } });

    // 3. Setup Student & Enrollment
    await prisma.student.create({
      data: {
        id: studentId,
        tenantId,
        schoolId,
        studentNumber: `STU-${ts}`,
        firstName: 'Alice',
        lastName: 'Student',
        gender: 'FEMALE',
        admissionDate: new Date(),
        status: 'ACTIVE',
      },
    });

    await prisma.enrollment.create({
      data: {
        id: enrollmentId,
        tenantId,
        schoolId,
        studentId,
        academicYearId: ay.id,
        classId: targetClass.id,
        status: 'ACTIVE',
        enrolledAt: new Date(),
      },
    });

    // 4. Setup Grading Scale & Boundaries
    const scale = await prisma.gradingScale.create({
      data: { tenantId, schoolId, name: `Scale 100-${ts}` },
    });
    await prisma.gradeBoundary.createMany({
      data: [
        { tenantId, schoolId, gradingScaleId: scale.id, minScore: 70, grade: 'A', remark: 'EXCELLENT' },
        { tenantId, schoolId, gradingScaleId: scale.id, minScore: 60, grade: 'B', remark: 'VERY GOOD' },
        { tenantId, schoolId, gradingScaleId: scale.id, minScore: 50, grade: 'C', remark: 'GOOD' },
        { tenantId, schoolId, gradingScaleId: scale.id, minScore: 0, grade: 'F', remark: 'FAIL' },
      ],
    });

    // 5. Setup AcademicGradingConfig (for Term 1 only)
    await prisma.academicGradingConfig.create({
      data: { tenantId, schoolId, academicYearId: ay.id, termId: term1.id, gradingScaleId: scale.id },
    });

    // 5b. Setup Assessment Types
    const caType = await prisma.assessmentType.create({
      data: { tenantId, schoolId, code: 'MANUAL_CA', name: 'Continuous Assessment', isSystem: true, isActive: true },
    });
    const examType = await prisma.assessmentType.create({
      data: { tenantId, schoolId, code: 'EXAM', name: 'Terminal Exam', isSystem: true, isActive: true },
    });

    // 6. Setup AssessmentComponents (CA = MANUAL_CA 40%, EXAM = 60%)
    const caComp = await prisma.assessmentComponent.create({
      data: {
        tenantId,
        schoolId,
        academicYearId: ay.id,
        termId: term1.id,
        classId: targetClass.id,
        subjectId: subject.id,
        assessmentTypeId: caType.id,
        title: 'Continuous Assessment',
        maxScore: 40,
        weight: 40,
      },
    });

    const examComp = await prisma.assessmentComponent.create({
      data: {
        tenantId,
        schoolId,
        academicYearId: ay.id,
        termId: term1.id,
        classId: targetClass.id,
        subjectId: subject.id,
        assessmentTypeId: examType.id,
        title: 'Terminal Exam',
        maxScore: 60,
        weight: 60,
      },
    });

    // 7. Setup TeacherSubjectAssignment
    await prisma.teacherSubjectAssignment.create({
      data: {
        tenantId,
        schoolId,
        teacherId: teacherStaffId,
        academicYearId: ay.id,
        termId: term1.id,
        classId: targetClass.id,
        subjectId: subject.id,
        scope: 'CLASS_WIDE',
        status: 'ACTIVE',
      },
    });

    // ALSO setup TeacherSubjectAssignment for Term 2 (so teacher has assignment, but term 2 lacks grading config)
    await prisma.teacherSubjectAssignment.create({
      data: {
        tenantId,
        schoolId,
        teacherId: teacherStaffId,
        academicYearId: ay.id,
        termId: term2.id,
        classId: targetClass.id,
        subjectId: subject.id,
        scope: 'CLASS_WIDE',
        status: 'ACTIVE',
      },
    });

    console.log('[STEP 1-4 PASSED]: Seeded infrastructure, grading scale, components, and assignments.');

    // 8. Execute REAL saveDraftGradebook()
    await tenantContext.run({ tenantId }, async () => {
      const draftResult = await gradebookService.saveDraftGradebook(tenantId, schoolId, userId, {
        academicYearId: ay.id,
        termId: term1.id,
        classId: targetClass.id,
        subjectId: subject.id,
        entries: [
          {
            studentId,
            scores: [
              { assessmentComponentId: caComp.id, score: 32, maxScore: 40 },
              { assessmentComponentId: examComp.id, score: 48, maxScore: 60 },
            ],
          },
        ],
      });

      assert.strictEqual(draftResult.count, 1, 'Should save 1 draft entry');
      console.log('[STEP 5 PASSED]: saveDraftGradebook executed successfully.');

      // 9. Verify SubjectResult calculations
      const res = await prisma.subjectResult.findFirst({
        where: { tenantId, schoolId, enrollmentId, subjectId: subject.id, termId: term1.id },
        include: { scores: true },
      });

      assert.ok(res, 'SubjectResult must exist in DB');
      assert.strictEqual(res.totalScore, 80, 'Weighted total score must be 80');
      assert.strictEqual(res.grade, 'A', 'Grade must be A');
      assert.strictEqual(res.gradingScaleId, scale.id, 'gradingScaleId must match scale');
      console.log(`[STEP 5-6 PASSED]: SubjectResult verified (totalScore: ${res.totalScore}, grade: ${res.grade}, scaleId: ${res.gradingScaleId}).`);

      // Verify AssessmentScores component ID link
      assert.strictEqual(res.scores.length, 2, 'Must have 2 score records');
      const caScore = res.scores.find((s) => s.assessmentComponentId === caComp.id);
      const examScore = res.scores.find((s) => s.assessmentComponentId === examComp.id);
      assert.strictEqual(caScore?.assessmentComponentId, caComp.id, 'CA score component ID must match');
      assert.strictEqual(examScore?.assessmentComponentId, examComp.id, 'EXAM score component ID must match');
      console.log('[STEP 6 PASSED]: AssessmentScore assessmentComponentId linkage verified.');

      // 10. Verify Transaction Rollback when Grading Config is missing (Term 2)
      let rollbackErrorCaught = false;
      try {
        await gradebookService.saveDraftGradebook(tenantId, schoolId, userId, {
          academicYearId: ay.id,
          termId: term2.id,
          classId: targetClass.id,
          subjectId: subject.id,
          entries: [
            {
              studentId,
              scores: [{ assessmentComponentId: caComp.id, score: 20, maxScore: 40 }],
            },
          ],
        });
      } catch (err: any) {
        rollbackErrorCaught = true;
        assert.ok(
          err instanceof MissingGradingConfigurationException || err instanceof ConflictException || err.message.includes('MissingGradingConfigurationException'),
          `Expected MissingGradingConfigurationException, got ${err.message}`
        );
      }
      assert.strictEqual(rollbackErrorCaught, true, 'Save draft gradebook MUST throw when grading config is missing');

      const term2Res = await prisma.subjectResult.findFirst({
        where: { tenantId, schoolId, enrollmentId, subjectId: subject.id, termId: term2.id },
      });
      assert.strictEqual(term2Res, null, 'Transaction rollback verified: No SubjectResult created for term 2');
      console.log('[STEP 7 PASSED]: Missing grading config transaction rollback verified.');

      // 11. Verify Published SubjectResults protection
      await prisma.subjectResult.update({
        where: { id: res.id },
        data: { status: ResultStatus.PUBLISHED },
      });

      let publishedProtectionCaught = false;
      try {
        await gradebookService.saveDraftGradebook(tenantId, schoolId, userId, {
          academicYearId: ay.id,
          termId: term1.id,
          classId: targetClass.id,
          subjectId: subject.id,
          entries: [
            {
              studentId,
              scores: [
                { assessmentComponentId: caComp.id, score: 35, maxScore: 40 },
                { assessmentComponentId: examComp.id, score: 55, maxScore: 60 },
              ],
            },
          ],
        });
      } catch (err: any) {
        publishedProtectionCaught = true;
        assert.ok(err instanceof ForbiddenException || err.message.includes('cannot be modified') || err.message.includes('PUBLISHED'), `Expected ForbiddenException for published result, got: ${err.message}`);
      }
      assert.strictEqual(publishedProtectionCaught, true, 'Published result protection verified.');
      console.log('[STEP 8 PASSED]: Published result protection verified.');

      // 12. Verify Authorized Reopen path permits recalculation
      await prisma.subjectResult.update({
        where: { id: res.id },
        data: { status: ResultStatus.DRAFT },
      });

      const updatedDraftResult = await gradebookService.saveDraftGradebook(tenantId, schoolId, userId, {
        academicYearId: ay.id,
        termId: term1.id,
        classId: targetClass.id,
        subjectId: subject.id,
        entries: [
          {
            studentId,
            scores: [
              { assessmentComponentId: caComp.id, score: 36, maxScore: 40 },
              { assessmentComponentId: examComp.id, score: 54, maxScore: 60 },
            ],
          },
        ],
      });

      assert.strictEqual(updatedDraftResult.count, 1, 'Saved reopened draft entry');
      const reopenedRes = await prisma.subjectResult.findFirst({
        where: { id: res.id },
      });
      assert.strictEqual(reopenedRes?.totalScore, 90, 'Reopened recalculation totalScore must be 90');
      assert.strictEqual(reopenedRes?.grade, 'A', 'Reopened grade must be A');
      console.log(`[STEP 9 PASSED]: Authorized reopen recalculation verified (totalScore: ${reopenedRes?.totalScore}).`);
    });

    console.log('\n=== ALL TEST 1 (GRADEBOOK PATH) ASSERTIONS PASSED PERFECTLY ===\n');
  } finally {
    // Clean up test data
    console.log('Cleaning up Gradebook test data...');
    await prisma.scoreAuditLog.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.assessmentScore.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.subjectResult.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.gradebookSubmission.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.teacherSubjectAssignment.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.assessmentComponent.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.academicGradingConfig.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.gradeBoundary.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.gradingScale.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.enrollment.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.student.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.staffProfile.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.term.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.academicYear.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.subject.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.class.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.school.deleteMany({ where: { id: schoolId } }).catch(() => {});
    await prisma.tenant.deleteMany({ where: { id: tenantId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
    await prisma.$disconnect();
  }
}

runGradebookIntegrationTest().catch((err) => {
  console.error('TEST 1 FAILED WITH ERROR:', err);
  process.exit(1);
});
