import { PrismaClient, StaffType, ResultStatus, WorkflowStatus, ScoreProvenance, CBTAttemptStatus, CBTStatus, AssessmentComponentType } from '@saas/core-platform';
import { kernel, tenantContext } from '@saas/core-platform';
import { CBTCompilerService } from '../src/modules/cbt/services/cbt-compiler.service';
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

async function runCbtIntegrationTest() {
  console.log('--- Starting Phase 6G CBT -> ResultsEngine Integration Test ---');
  const ts = Date.now();
  const tenantId = `t-cbt-${ts}`;
  const schoolId = `s-cbt-${ts}`;
  const userId = `u-cbt-teacher-${ts}`;
  const teacherStaffId = `stf-cbt-teacher-${ts}`;
  const studentId = `stu-cbt-${ts}`;
  const enrollmentId = `enr-cbt-${ts}`;

  const resultsEngine = new ResultsEngineService();
  const resultsService = new ResultsService(resultsEngine);
  const cbtCompiler = new CBTCompilerService(resultsService, resultsEngine);

  try {
    // 1. Setup Tenant, School, User, Staff Profile
    await prisma.tenant.create({ data: { id: tenantId, name: 'CBT Test Tenant', slug: tenantId } });
    await prisma.school.create({ data: { id: schoolId, tenantId, name: 'CBT Test School' } });
    await prisma.user.create({ data: { id: userId, email: `${userId}@example.com` } });
    await prisma.staffProfile.create({
      data: {
        id: teacherStaffId,
        tenantId,
        schoolId,
        userId,
        staffNumber: `STF-CBT-${ts}`,
        firstName: 'Bob',
        lastName: 'Instructor',
        gender: 'MALE',
        type: StaffType.TEACHING,
        status: 'ACTIVE',
        joiningDate: new Date(),
      },
    });

    // 2. Setup Academic Infrastructure
    const ay = await prisma.academicYear.create({
      data: { tenantId, schoolId, name: `AY-CBT-${ts}`, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
    });
    const term1 = await prisma.term.create({
      data: { tenantId, academicYearId: ay.id, name: `Term 1 CBT-${ts}`, startDate: new Date('2026-01-01'), endDate: new Date('2026-04-30') },
    });
    const term2NoConfig = await prisma.term.create({
      data: { tenantId, academicYearId: ay.id, name: `Term 2 CBT No Config-${ts}`, startDate: new Date('2026-05-01'), endDate: new Date('2026-08-31') },
    });

    const targetClass = await prisma.class.create({ data: { tenantId, schoolId, name: `Class CBT-${ts}` } });
    const subject = await prisma.subject.create({ data: { tenantId, schoolId, name: `Physics-${ts}` } });

    // 3. Setup Student & Enrollment
    await prisma.student.create({
      data: {
        id: studentId,
        tenantId,
        schoolId,
        studentNumber: `STU-CBT-${ts}`,
        firstName: 'Charlie',
        lastName: 'Candidate',
        gender: 'MALE',
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
      data: { tenantId, schoolId, name: `CBT Scale 100-${ts}` },
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

    // 6. Setup AssessmentComponent for Exam (100% weight for clean total score evaluation)
    const examComp = await prisma.assessmentComponent.create({
      data: {
        tenantId,
        schoolId,
        academicYearId: ay.id,
        termId: term1.id,
        classId: targetClass.id,
        subjectId: subject.id,
        type: AssessmentComponentType.EXAM,
        title: 'CBT Terminal Exam Component',
        maxScore: 100,
        weight: 100,
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

    // 8. Setup CBT Exam & Graded Attempt
    const exam = await prisma.cBTExam.create({
      data: {
        tenantId,
        schoolId,
        assessmentComponentId: examComp.id,
        teacherId: teacherStaffId,
        title: 'Midterm CBT Physics Exam',
        status: CBTStatus.CLOSED,
        availableFrom: new Date('2026-01-01'),
        availableTo: new Date('2026-12-31'),
        durationMinutes: 60,
      },
    });

    const attempt = await prisma.cBTAttempt.create({
      data: {
        tenantId,
        schoolId,
        examId: exam.id,
        studentId,
        status: CBTAttemptStatus.GRADED,
        totalScore: 88,
      },
    });

    console.log('[STEP 1-8 PASSED]: Seeded CBT Exam, Graded Attempt, and Academic context.');

    // 9. Execute REAL compileToGradebook()
    await tenantContext.run({ tenantId }, async () => {
      const compileRes = await cbtCompiler.compileToGradebook(tenantId, schoolId, exam.id, userId);

      assert.strictEqual(compileRes.success, true, 'Compiler must return success: true');
      assert.strictEqual(compileRes.compiledCount, 1, 'Compiler must compile 1 attempt');
      console.log('[STEP 9 PASSED]: compileToGradebook executed successfully.');

      // 10. Verify AssessmentScore persistence & properties
      const res = await prisma.subjectResult.findFirst({
        where: { tenantId, schoolId, enrollmentId, subjectId: subject.id, termId: term1.id },
        include: { scores: true },
      });

      assert.ok(res, 'SubjectResult must exist in DB');
      assert.strictEqual(res.totalScore, 88, 'SubjectResult totalScore must be 88');
      assert.strictEqual(res.grade, 'A', 'SubjectResult grade must be A');
      assert.strictEqual(res.gradingScaleId, scale.id, 'gradingScaleId must match scale');
      console.log(`[STEP 10 PASSED]: SubjectResult verified (totalScore: ${res.totalScore}, grade: ${res.grade}, scaleId: ${res.gradingScaleId}).`);

      const scoreRecord = res.scores[0];
      assert.ok(scoreRecord, 'AssessmentScore record must exist');
      assert.strictEqual(scoreRecord.assessmentComponentId, examComp.id, 'assessmentComponentId must match exam component');
      assert.strictEqual(scoreRecord.provenance, ScoreProvenance.CBT, 'provenance must be CBT');
      console.log('[STEP 10-11 PASSED]: AssessmentScore verified (componentId & CBT provenance).');

      // 11. Test Idempotency (run compilation again)
      const idempotencyRes = await cbtCompiler.compileToGradebook(tenantId, schoolId, exam.id, userId);
      assert.strictEqual(idempotencyRes.compiledCount, 0, 'Second compilation run must skip unchanged score (compiledCount === 0)');
      console.log('[STEP 12 PASSED]: Idempotency verified.');

      // 12. Verify MANUAL score protection (CBT provenance cannot overwrite MANUAL score)
      await prisma.assessmentScore.update({
        where: { id: scoreRecord.id },
        data: { provenance: ScoreProvenance.MANUAL, score: 95 },
      });

      await prisma.cBTAttempt.update({
        where: { id: attempt.id },
        data: { totalScore: 70 },
      });

      const manualOverrideRes = await cbtCompiler.compileToGradebook(tenantId, schoolId, exam.id, userId);
      assert.strictEqual(manualOverrideRes.skippedCount, 1, 'Compiler must skip attempt because score provenance is MANUAL');

      const protectedScoreRecord = await prisma.assessmentScore.findUnique({ where: { id: scoreRecord.id } });
      assert.strictEqual(protectedScoreRecord?.score, 95, 'Manual score 95 must remain un-overwritten');
      assert.strictEqual(protectedScoreRecord?.provenance, ScoreProvenance.MANUAL, 'Score provenance must remain MANUAL');
      console.log('[STEP 13 PASSED]: Manual score protection verified.');

      // 13. Verify Missing Grading Configuration Rollback
      // Setup second exam in term 2 (which has no grading config)
      const examCompTerm2 = await prisma.assessmentComponent.create({
        data: {
          tenantId,
          schoolId,
          academicYearId: ay.id,
          termId: term2NoConfig.id,
          classId: targetClass.id,
          subjectId: subject.id,
          type: AssessmentComponentType.EXAM,
          title: 'Term 2 CBT Component',
          maxScore: 100,
          weight: 100,
        },
      });

      await prisma.teacherSubjectAssignment.create({
        data: {
          tenantId,
          schoolId,
          teacherId: teacherStaffId,
          academicYearId: ay.id,
          termId: term2NoConfig.id,
          classId: targetClass.id,
          subjectId: subject.id,
          scope: 'CLASS_WIDE',
          status: 'ACTIVE',
        },
      });

      const examTerm2 = await prisma.cBTExam.create({
        data: {
          tenantId,
          schoolId,
          assessmentComponentId: examCompTerm2.id,
          teacherId: teacherStaffId,
          title: 'Term 2 CBT Exam',
          status: CBTStatus.CLOSED,
          availableFrom: new Date('2026-05-01'),
          availableTo: new Date('2026-08-31'),
          durationMinutes: 60,
        },
      });

      await prisma.cBTAttempt.create({
        data: {
          tenantId,
          schoolId,
          examId: examTerm2.id,
          studentId,
          status: CBTAttemptStatus.GRADED,
          totalScore: 75,
        },
      });

      let missingConfigCaught = false;
      try {
        await cbtCompiler.compileToGradebook(tenantId, schoolId, examTerm2.id, userId);
      } catch (err: any) {
        missingConfigCaught = true;
        assert.ok(
          err instanceof MissingGradingConfigurationException || err instanceof ConflictException || err.message.includes('MissingGradingConfigurationException'),
          `Expected MissingGradingConfigurationException, got ${err.message}`
        );
      }
      assert.strictEqual(missingConfigCaught, true, 'Compiler MUST throw when grading config is missing');

      const term2SubjectRes = await prisma.subjectResult.findFirst({
        where: { tenantId, schoolId, enrollmentId, subjectId: subject.id, termId: term2NoConfig.id },
      });
      assert.strictEqual(term2SubjectRes, null, 'Transaction rollback verified: No SubjectResult written for term 2');
      console.log('[STEP 14 PASSED]: Missing grading config rollback verified for CBT.');

      // 14. Verify Published-Result Protection
      const submission = await prisma.gradebookSubmission.findFirst({
        where: { tenantId, schoolId, academicYearId: ay.id, termId: term1.id, classId: targetClass.id, subjectId: subject.id },
      });
      if (submission) {
        await prisma.gradebookSubmission.update({
          where: { id: submission.id },
          data: { status: WorkflowStatus.PUBLISHED },
        });
      }

      let publishedConflictCaught = false;
      try {
        await cbtCompiler.compileToGradebook(tenantId, schoolId, exam.id, userId);
      } catch (err: any) {
        publishedConflictCaught = true;
        assert.ok(err instanceof ConflictException || err.message.includes('cannot be modified') || err.message.includes('PUBLISHED'), `Expected ConflictException for published submission, got: ${err.message}`);
      }
      assert.strictEqual(publishedConflictCaught, true, 'Published gradebook submission protection verified.');
      console.log('[STEP 15 PASSED]: Published-result protection verified for CBT.');

      // 15. Verify Authorized Reopen Flow
      if (submission) {
        await prisma.gradebookSubmission.update({
          where: { id: submission.id },
          data: { status: WorkflowStatus.DRAFT },
        });
      }
      await prisma.subjectResult.update({
        where: { id: res.id },
        data: { status: ResultStatus.DRAFT },
      });
      // Revert score provenance back to CBT so compiler processes update
      await prisma.assessmentScore.update({
        where: { id: scoreRecord.id },
        data: { provenance: ScoreProvenance.CBT },
      });

      const reopenedCompileRes = await cbtCompiler.compileToGradebook(tenantId, schoolId, exam.id, userId);
      assert.strictEqual(reopenedCompileRes.compiledCount, 1, 'Authorized reopen must allow compiler to update scores');

      const reopenedRes = await prisma.subjectResult.findFirst({ where: { id: res.id } });
      assert.strictEqual(reopenedRes?.totalScore, 70, 'Updated attempt score 70 must be reflected');
      assert.strictEqual(reopenedRes?.grade, 'A', 'Grade 70 must be A according to boundaries');
      console.log(`[STEP 16 PASSED]: Authorized reopen recalculation verified (totalScore: ${reopenedRes?.totalScore}).`);
    });

    console.log('\n=== ALL TEST 2 (CBT PATH) ASSERTIONS PASSED PERFECTLY ===\n');
  } finally {
    // Clean up test data
    console.log('Cleaning up CBT test data...');
    await prisma.scoreAuditLog.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.cBTAttemptAnswer.deleteMany({ where: { attempt: { tenantId } } }).catch(() => {});
    await prisma.cBTAttempt.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.cBTQuestion.deleteMany({ where: { exam: { tenantId } } }).catch(() => {});
    await prisma.cBTExam.deleteMany({ where: { tenantId } }).catch(() => {});
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

runCbtIntegrationTest().catch((err) => {
  console.error('TEST 2 FAILED WITH ERROR:', err);
  process.exit(1);
});
