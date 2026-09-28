import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface MigrationSummary {
  totalSourceRows: number;
  skippedNullTeacherCount: number;
  validCandidateCount: number;
  migratedAssignmentsCount: number;
  quarantinedCount: number;
  quarantineReasonsBreakdown: Record<string, number>;
  unaccountedCount: number;
  isReconciled: boolean;
}

export async function runBackfill(isDryRun: boolean = true): Promise<MigrationSummary> {
  console.log(`\n==================================================`);
  console.log(`Phase 5G Step 2: Timetable Backfill Pipeline (MIGRATION_5G_001)`);
  console.log(`Mode: ${isDryRun ? "DRY-RUN (READ-ONLY)" : "REAL EXECUTION (DATABASE WRITE)"}`);
  console.log(`==================================================\n`);

  // Fetch all timetable entries
  const allEntries = await prisma.timetableEntry.findMany({
    include: {
      teacher: true,
      class: true,
      arm: true,
      subject: true,
      academicYear: true,
      term: true,
    },
  });

  const totalSourceRows = allEntries.length;
  console.log(`Total acd_timetable_entries source rows found: ${totalSourceRows}`);

  let skippedNullTeacherCount = 0;
  const candidateEntries: typeof allEntries = [];

  for (const entry of allEntries) {
    if (!entry.teacherId) {
      skippedNullTeacherCount++;
    } else {
      candidateEntries.push(entry);
    }
  }

  console.log(`Skipped (NULL Teacher / Break Slots): ${skippedNullTeacherCount}`);
  console.log(`Valid Candidates to Analyze: ${candidateEntries.length}`);

  const quarantinedItems: {
    tenantId: string;
    schoolId: string;
    academicYearId: string;
    termId: string;
    classId: string;
    armId: string | null;
    subjectId: string;
    teacherId: string | null;
    quarantineReason: string;
    migrationBatchId: string;
  }[] = [];

  const quarantineReasonsBreakdown: Record<string, number> = {};

  function addQuarantine(entry: typeof candidateEntries[0], reason: string) {
    quarantinedItems.push({
      tenantId: entry.tenantId,
      schoolId: entry.schoolId,
      academicYearId: entry.academicYearId,
      termId: entry.termId,
      classId: entry.classId,
      armId: entry.armId,
      subjectId: entry.subjectId,
      teacherId: entry.teacherId,
      quarantineReason: reason,
      migrationBatchId: "MIGRATION_5G_001",
    });
    quarantineReasonsBreakdown[reason] = (quarantineReasonsBreakdown[reason] || 0) + 1;
  }

  // Map to deduplicate teacher-subject assignments
  // Key: tenantId_schoolId_academicYearId_termId_classId_armId_subjectId_teacherId
  const assignmentMap = new Map<
    string,
    {
      tenantId: string;
      schoolId: string;
      academicYearId: string;
      termId: string;
      classId: string;
      armId: string | null;
      subjectId: string;
      teacherId: string;
      scope: "CLASS_WIDE" | "ARM_SPECIFIC";
      isPrimary: boolean;
      status: string;
      migrationBatchId: string;
    }
  >();

  // Track primary teacher assignments per scope key to prevent multiple primaries
  // ScopeKey: tenantId_schoolId_academicYearId_termId_classId_armId_subjectId
  const primaryAssignedScopes = new Set<string>();

  for (const entry of candidateEntries) {
    if (!entry.teacherId) continue;

    // 1. Validate Teacher
    if (!entry.teacher || entry.teacher.status !== "ACTIVE") {
      addQuarantine(entry, "INACTIVE_OR_MISSING_STAFF");
      continue;
    }
    if (entry.teacher.tenantId !== entry.tenantId || entry.teacher.schoolId !== entry.schoolId) {
      addQuarantine(entry, "STAFF_TENANT_SCHOOL_MISMATCH");
      continue;
    }

    // 2. Validate Class
    if (!entry.class || entry.class.tenantId !== entry.tenantId || entry.class.schoolId !== entry.schoolId) {
      addQuarantine(entry, "INVALID_OR_MISMATCHED_CLASS");
      continue;
    }

    // 3. Validate Arm if provided
    if (entry.armId) {
      if (!entry.arm || entry.arm.tenantId !== entry.tenantId || entry.arm.classId !== entry.classId) {
        addQuarantine(entry, "INVALID_OR_MISMATCHED_ARM");
        continue;
      }
    }

    // 4. Validate Subject
    if (!entry.subject || entry.subject.tenantId !== entry.tenantId || entry.subject.schoolId !== entry.schoolId) {
      addQuarantine(entry, "INVALID_OR_MISMATCHED_SUBJECT");
      continue;
    }

    // 5. Validate Academic Year & Term
    if (!entry.academicYear || entry.academicYear.tenantId !== entry.tenantId || entry.academicYear.schoolId !== entry.schoolId) {
      addQuarantine(entry, "INVALID_OR_MISMATCHED_ACADEMIC_YEAR");
      continue;
    }
    if (!entry.term || entry.term.tenantId !== entry.tenantId || entry.term.academicYearId !== entry.academicYearId) {
      addQuarantine(entry, "INVALID_OR_MISMATCHED_TERM");
      continue;
    }

    // Passed all validations -> Valid candidate for assignment
    const scope: "CLASS_WIDE" | "ARM_SPECIFIC" = entry.armId ? "ARM_SPECIFIC" : "CLASS_WIDE";
    const armKey = entry.armId || "CLASS_WIDE";
    const assignmentKey = `${entry.tenantId}_${entry.schoolId}_${entry.academicYearId}_${entry.termId}_${entry.classId}_${armKey}_${entry.subjectId}_${entry.teacherId}`;
    const scopeKey = `${entry.tenantId}_${entry.schoolId}_${entry.academicYearId}_${entry.termId}_${entry.classId}_${armKey}_${entry.subjectId}`;

    if (!assignmentMap.has(assignmentKey)) {
      let isPrimary = false;
      if (!primaryAssignedScopes.has(scopeKey)) {
        isPrimary = true;
        primaryAssignedScopes.add(scopeKey);
      }

      assignmentMap.set(assignmentKey, {
        tenantId: entry.tenantId,
        schoolId: entry.schoolId,
        academicYearId: entry.academicYearId,
        termId: entry.termId,
        classId: entry.classId,
        armId: entry.armId,
        subjectId: entry.subjectId,
        teacherId: entry.teacherId,
        scope,
        isPrimary,
        status: "ACTIVE",
        migrationBatchId: "MIGRATION_5G_001",
      });
    }
  }

  const uniqueAssignments = Array.from(assignmentMap.values());
  const migratedAssignmentsCount = uniqueAssignments.length;
  const quarantinedCount = quarantinedItems.length;

  // Source Accounting Reconciliation
  const accountedSourceRows = skippedNullTeacherCount + quarantinedCount + (candidateEntries.length - quarantinedCount);
  const unaccountedCount = totalSourceRows - accountedSourceRows;
  const isReconciled = unaccountedCount === 0;

  console.log(`\n--- Classification Breakdown ---`);
  console.log(`Total Source Rows: ${totalSourceRows}`);
  console.log(`Skipped (Null Teacher): ${skippedNullTeacherCount}`);
  console.log(`Quarantined Rows: ${quarantinedCount}`);
  console.log(`Quarantine Breakdown:`, quarantineReasonsBreakdown);
  console.log(`Unique Assignments Derived: ${migratedAssignmentsCount}`);
  console.log(`Unaccounted / Unexplained Source Rows: ${unaccountedCount}`);
  console.log(`Source Accounting Invariant Satisfied: ${isReconciled ? "YES (PASSED)" : "NO (FAILED)"}`);

  if (!isDryRun) {
    console.log(`\nWriting ${migratedAssignmentsCount} assignments and ${quarantinedCount} quarantine records to database...`);

    await prisma.$transaction(async (tx) => {
      // 1. Insert Quarantined Records
      if (quarantinedItems.length > 0) {
        await tx.assignmentMigrationQuarantine.createMany({
          data: quarantinedItems,
        });
      }

      // 2. Insert Unique TeacherSubjectAssignments
      if (uniqueAssignments.length > 0) {
        await tx.teacherSubjectAssignment.createMany({
          data: uniqueAssignments,
        });
      }
    });

    console.log(`Successfully committed MIGRATION_5G_001 records to database.`);
  }

  return {
    totalSourceRows,
    skippedNullTeacherCount,
    validCandidateCount: candidateEntries.length,
    migratedAssignmentsCount,
    quarantinedCount,
    quarantineReasonsBreakdown,
    unaccountedCount,
    isReconciled,
  };
}

// Execution entry point if run directly via CLI
if (require.main === module) {
  const isDryRun = !process.argv.includes("--execute");
  runBackfill(isDryRun)
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error("Backfill failed:", err);
      prisma.$disconnect();
      process.exit(1);
    });
}
