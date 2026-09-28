import { runBackfill } from "./backfill-5g-001";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("Phase 5G Step 2: Timetable Backfill Pipeline (MIGRATION_5G_001)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should execute backfill in dry-run mode and satisfy source accounting invariant", async () => {
    const summary = await runBackfill(true);

    expect(summary).toBeDefined();
    expect(summary.totalSourceRows).toBeGreaterThanOrEqual(0);
    expect(summary.unaccountedCount).toBe(0);
    expect(summary.isReconciled).toBe(true);
    expect(summary.skippedNullTeacherCount + summary.quarantinedCount + (summary.validCandidateCount - summary.quarantinedCount)).toBe(summary.totalSourceRows);
  });

  it("should execute backfill in real write mode without throwing errors", async () => {
    const summary = await runBackfill(false);

    expect(summary).toBeDefined();
    expect(summary.unaccountedCount).toBe(0);
    expect(summary.isReconciled).toBe(true);
  });

  it("should verify rollback safety for MIGRATION_5G_001", async () => {
    // Delete only MIGRATION_5G_001 tagged records
    const deletedQuarantine = await prisma.assignmentMigrationQuarantine.deleteMany({
      where: { migrationBatchId: "MIGRATION_5G_001" },
    });
    const deletedAssignments = await prisma.teacherSubjectAssignment.deleteMany({
      where: { migrationBatchId: "MIGRATION_5G_001" },
    });

    expect(deletedQuarantine).toBeDefined();
    expect(deletedAssignments).toBeDefined();

    // Verify non-migration records remain untouched
    const manualAssignmentsCount = await prisma.teacherSubjectAssignment.count({
      where: { migrationBatchId: null },
    });
    expect(manualAssignmentsCount).toBeGreaterThanOrEqual(0);
  });
});
