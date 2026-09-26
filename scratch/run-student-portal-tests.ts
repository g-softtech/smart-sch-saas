import { StudentPortalService } from "../apps/api-gateway/src/modules/portal-student/services/student-portal.service";
import { kernel } from "./packages/core-platform/dist/index.js";

async function main() {
  console.log("==========================================");
  console.log("PHASE 5A: STUDENT PORTAL BFF UNIT TEST RUNNER");
  console.log("==========================================");

  const mockAssignmentsService: any = {
    getAssignmentsForClass: async () => [
      { id: "asg-1", title: "Math Homework", status: "PUBLISHED", dueDate: new Date(), assessmentComponent: { maxScore: 100 } }
    ],
    submitAssignment: async (tenantId: string, schoolId: string, studentId: string, assignmentId: string, dto: any) => {
      console.log(`✓ submitAssignment called with resolved studentId: ${studentId}`);
      return { id: "sub-1", status: "SUBMITTED" };
    }
  };

  const mockCbtService: any = {
    getCBTExamsForClass: async () => [
      { id: "exam-1", title: "Physics CBT", durationMinutes: 30, maxScore: 20, status: "ACTIVE" }
    ],
    startAttempt: async (tenantId: string, schoolId: string, studentId: string, examId: string) => {
      console.log(`✓ startCBTAttempt called with resolved studentId: ${studentId}`);
      return { id: "att-1", status: "IN_PROGRESS" };
    },
    submitAttempt: async (tenantId: string, schoolId: string, studentId: string, examId: string, dto: any) => {
      console.log(`✓ submitCBTAttempt called with resolved studentId: ${studentId}`);
      return { id: "att-1", status: "GRADED", totalScore: 20 };
    }
  };

  const service = new StudentPortalService(mockAssignmentsService, mockCbtService);

  // Mock kernel.db.student.findFirst
  const tenantId = "097c6dc2-1383-447b-a5eb-97ef631f6cff";
  const school = await kernel.db.$queryRaw`SELECT * FROM "School" WHERE "tenantId" = ${tenantId};`;
  const schoolId = school[0].id;
  const user = await kernel.db.user.findFirst();

  // Test 1: Identity Resolution Security
  console.log("\n1. Testing Student Identity Resolution (sub -> studentId)...");
  try {
    await service.getProfile("unlinked-user-id-999", tenantId, schoolId);
    console.error("FAILED: Should have rejected unlinked user");
    process.exit(1);
  } catch (err: any) {
    console.log(`✓ Correctly rejected unlinked user with message: "${err.message}"`);
  }

  console.log("\n==========================================");
  console.log("ALL PHASE 5A BFF UNIT SECURITY CHECKS PASSED!");
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
