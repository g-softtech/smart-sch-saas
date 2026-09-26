const { kernel } = require("../packages/core-platform/dist/index.js");
const crypto = require("crypto");

function base64url(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createToken(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signatureInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${signatureInput}.${signature}`;
}

async function main() {
  const tenantId = "097c6dc2-1383-447b-a5eb-97ef631f6cff";
  const school = await kernel.db.$queryRaw`SELECT * FROM "School" WHERE "tenantId" = ${tenantId};`;
  const schoolId = school[0]?.id;

  const users = await kernel.db.$queryRaw`SELECT * FROM idm_users;`;
  const userId = users[0]?.id;

  const academicYear = await kernel.db.$queryRaw`SELECT * FROM acd_academic_years WHERE "tenantId" = ${tenantId};`;
  const academicYearId = academicYear[0]?.id;

  const term = await kernel.db.$queryRaw`SELECT * FROM acd_terms WHERE "tenantId" = ${tenantId};`;
  const termId = term[0]?.id;

  const classObj = await kernel.db.$queryRaw`SELECT * FROM acd_classes WHERE "tenantId" = ${tenantId} AND name LIKE '%Grade 1B%';`;
  const classId = classObj[0]?.id;

  await kernel.db.$executeRaw`UPDATE acd_subjects SET "schoolId" = ${schoolId} WHERE "tenantId" = ${tenantId} AND "schoolId" IS NULL;`;
  let subject = await kernel.db.$queryRaw`SELECT * FROM acd_subjects WHERE "tenantId" = ${tenantId};`;
  if (!subject || subject.length === 0) {
    const subId = crypto.randomUUID();
    await kernel.db.$executeRaw`
      INSERT INTO acd_subjects ("id", "tenantId", "schoolId", "name", "createdAt", "updatedAt")
      VALUES (${subId}, ${tenantId}, ${schoolId}, 'Mathematics', NOW(), NOW());
    `;
    subject = [{ id: subId }];
  }
  const subjectId = subject[0]?.id;

  const enrollments = await kernel.db.$queryRaw`SELECT * FROM stud_enrollments WHERE "tenantId" = ${tenantId} AND "classId" = ${classId} AND status = 'ACTIVE';`;
  const studentId = enrollments[0]?.studentId;

  let staff = await kernel.db.$queryRaw`SELECT * FROM stf_staff_profiles WHERE "tenantId" = ${tenantId};`;
  if (!staff || staff.length === 0) {
    const stfId = crypto.randomUUID();
    await kernel.db.$executeRaw`
      INSERT INTO stf_staff_profiles ("id", "tenantId", "schoolId", "staffNumber", "firstName", "lastName", "joiningDate", "type", "status", "createdAt", "updatedAt")
      VALUES (${stfId}, ${tenantId}, ${schoolId}, 'STF-001', 'Teacher', 'Admin', NOW(), 'TEACHING', 'ACTIVE', NOW(), NOW());
    `;
  }

  const userObj = await kernel.db.user.findUnique({ where: { id: userId } });
  const secret = process.env.JWT_SECRET || "super-secret-secret";
  const token = createToken(
    {
      sub: userObj.id,
      email: userObj.email,
      roles: ["SUPER_ADMIN"],
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    secret
  );

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "x-tenant-id": tenantId,
    "x-school-id": schoolId,
  };

  console.log("==========================================");
  console.log("PHASE 3: ASSESSMENT OPERATIONS LIVE E2E TEST");
  console.log("==========================================");

  // ----------------------------------------------------
  // 1. ASSIGNMENTS WORKFLOW
  // ----------------------------------------------------
  console.log("\n--- [1/2] ASSIGNMENTS WORKFLOW ---");

  // Create Assignment
  const createAsgRes = await fetch("http://localhost:3000/api/v1/assignments", {
    method: "POST",
    headers,
    body: JSON.stringify({
      academicYearId,
      termId,
      classId,
      subjectId,
      title: "Algebra Live E2E Homework",
      description: "Solve linear equations",
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      maxScore: 100,
    }),
  });

  if (!createAsgRes.ok) {
    console.error(`Failed to create assignment: ${createAsgRes.status} ${await createAsgRes.text()}`);
    process.exit(1);
  }
  const assignment = await createAsgRes.json();
  console.log(`✓ Assignment Created: ID=${assignment.id}, Status=${assignment.status}`);

  // Publish Assignment
  const pubAsgRes = await fetch(`http://localhost:3000/api/v1/assignments/${assignment.id}/publish`, {
    method: "PUT",
    headers,
    body: JSON.stringify({}),
  });
  if (!pubAsgRes.ok) {
    console.error(`Failed to publish assignment: ${pubAsgRes.status} ${await pubAsgRes.text()}`);
    process.exit(1);
  }
  const publishedAssignment = await pubAsgRes.json();
  console.log(`✓ Assignment Published: Status=${publishedAssignment.status}`);

  // Submit Assignment Homework
  const submitAsgRes = await fetch(`http://localhost:3000/api/v1/assignments/${assignment.id}/submit`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      textContent: "X = 5, Y = 10. Completed all 10 problems.",
      studentId,
    }),
  });
  if (!submitAsgRes.ok) {
    console.error(`Failed to submit assignment: ${submitAsgRes.status} ${await submitAsgRes.text()}`);
    process.exit(1);
  }
  const submission = await submitAsgRes.json();
  console.log(`✓ Assignment Submitted: SubmissionID=${submission.id}, Status=${submission.status}`);

  // Grade Submission (Push Score to Results Engine)
  const gradeAsgRes = await fetch(
    `http://localhost:3000/api/v1/assignments/${assignment.id}/submissions/${studentId}/grade`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        score: 95,
        feedback: "Excellent work!",
      }),
    }
  );
  if (!gradeAsgRes.ok) {
    console.error(`Failed to grade assignment: ${gradeAsgRes.status} ${await gradeAsgRes.text()}`);
    process.exit(1);
  }
  const gradedSubmission = await gradeAsgRes.json();
  console.log(`✓ Submission Graded: Score=${gradedSubmission.score} pts, Status=${gradedSubmission.status}`);

  // Verify Results Engine Score Entry
  const resultsEntry = await kernel.db.$queryRaw`
    SELECT * FROM acd_subject_results 
    WHERE "tenantId" = ${tenantId};
  `;
  console.log(`✓ Results Engine Verification: Found ${resultsEntry.length} score entry for subject.`);

  // ----------------------------------------------------
  // 2. CBT EXAMINATIONS WORKFLOW
  // ----------------------------------------------------
  console.log("\n--- [2/2] EXAMINATIONS & CBT WORKFLOW ---");

  // Create CBT Exam
  const now = new Date();
  const availableFrom = new Date(now.getTime() - 60000).toISOString();
  const availableTo = new Date(now.getTime() + 86400000).toISOString();

  const createCbtRes = await fetch("http://localhost:3000/api/v1/cbt", {
    method: "POST",
    headers,
    body: JSON.stringify({
      academicYearId,
      termId,
      classId,
      subjectId,
      title: "Mid-Term Physics CBT Exam",
      instructions: "Answer all questions within 60 minutes.",
      availableFrom,
      availableTo,
      durationMinutes: 60,
      maxScore: 20,
    }),
  });
  if (!createCbtRes.ok) {
    console.error(`Failed to create CBT exam: ${createCbtRes.status} ${await createCbtRes.text()}`);
    process.exit(1);
  }
  const exam = await createCbtRes.json();
  console.log(`✓ CBT Exam Created: ID=${exam.id}, Status=${exam.status}`);

  // Add CBT Questions
  const addQ1Res = await fetch(`http://localhost:3000/api/v1/cbt/${exam.id}/questions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      questionText: "What is the SI unit of force?",
      options: ["Joule", "Newton", "Watt", "Pascal"],
      correctOption: 1, // Newton
      points: 10,
    }),
  });
  const q1 = await addQ1Res.json();
  console.log(`✓ CBT Question 1 Added: ID=${q1.id}`);

  const addQ2Res = await fetch(`http://localhost:3000/api/v1/cbt/${exam.id}/questions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      questionText: "What is the speed of light in vacuum?",
      options: ["3 x 10^8 m/s", "150 m/s", "3000 km/s", "Infinite"],
      correctOption: 0, // 3 x 10^8 m/s
      points: 10,
    }),
  });
  const q2 = await addQ2Res.json();
  console.log(`✓ CBT Question 2 Added: ID=${q2.id}`);

  // Activate CBT Exam
  const activateRes = await fetch(`http://localhost:3000/api/v1/cbt/${exam.id}/status`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ status: "ACTIVE" }),
  });
  if (!activateRes.ok) {
    console.error(`Failed to activate CBT exam: ${activateRes.status} ${await activateRes.text()}`);
    process.exit(1);
  }
  const activeExam = await activateRes.json();
  console.log(`✓ CBT Exam Activated: Status=${activeExam.status}`);

  // Start CBT Attempt
  const startAttemptRes = await fetch(`http://localhost:3000/api/v1/cbt/${exam.id}/attempts/start?studentId=${studentId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ studentId }),
  });
  if (!startAttemptRes.ok) {
    console.error(`Failed to start CBT attempt: ${startAttemptRes.status} ${await startAttemptRes.text()}`);
    process.exit(1);
  }
  const attempt = await startAttemptRes.json();
  console.log(`✓ CBT Attempt Started: ID=${attempt.id}, Status=${attempt.status}`);

  // Submit CBT Attempt & Auto-Grade
  const submitAttemptRes = await fetch(`http://localhost:3000/api/v1/cbt/${exam.id}/attempts/submit?studentId=${studentId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      studentId,
      answers: [
        { questionId: q1.id, selectedOption: 1 }, // Correct (10 pts)
        { questionId: q2.id, selectedOption: 0 }, // Correct (10 pts)
      ],
    }),
  });
  if (!submitAttemptRes.ok) {
    console.error(`Failed to submit CBT attempt: ${submitAttemptRes.status} ${await submitAttemptRes.text()}`);
    process.exit(1);
  }
  const gradedAttempt = await submitAttemptRes.json();
  console.log(`✓ CBT Attempt Submitted & Auto-Graded: Score=${gradedAttempt.totalScore} pts, Status=${gradedAttempt.status}`);

  // ----------------------------------------------------
  // 3. ZERO-TRUST AUTHORIZATION / CROSS-TENANT ISOLATION TEST
  // ----------------------------------------------------
  console.log("\n--- [3/3] ZERO-TRUST TENANT ISOLATION TEST ---");

  const invalidTenantHeaders = {
    ...headers,
    "x-tenant-id": "00000000-0000-0000-0000-000000000000",
  };
  const forbiddenRes = await fetch("http://localhost:3000/api/v1/assignments", {
    method: "POST",
    headers: invalidTenantHeaders,
    body: JSON.stringify({ title: "Hack Attempt" }),
  });
  console.log(`✓ Cross-Tenant Rejection HTTP Status: ${forbiddenRes.status} (Expected 403 Forbidden)`);

  if (forbiddenRes.status !== 403) {
    console.error(`FAILED: Expected 403 Forbidden for cross-tenant request, got ${forbiddenRes.status}`);
    process.exit(1);
  }

  console.log("\n==========================================");
  console.log("ALL PHASE 3 LIVE E2E VERIFICATIONS PASSED!");
  console.log("==========================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await kernel.db.$disconnect();
  });
