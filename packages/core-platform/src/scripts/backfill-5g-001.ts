import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface MigrationSummary {
  totalSourceRows: number;
  skippedNullTeacherCount: number;
  validCandidateCount: number;
  migratedAssignmentsCount: number;
  reconciledDuplicateCount: number;
  quarantinedCount: number;
  quarantineReasonsBreakdown: Record<string, number>;
  unaccountedCount: number;
  isReconciled: boolean;
}

export async function runBackfill(isDryRun: boolean = true, dbClient: PrismaClient = prisma): Promise<MigrationSummary> {
  console.log(`\n==================================================`);
  console.log(`Phase 5G Step 2: Timetable Backfill Pipeline (MIGRATION_5G_001)`);
  console.log(`Mode: ${isDryRun ? "DRY-RUN (READ-ONLY)" : "REAL EXECUTION (DATABASE WRITE)"}`);
  console.log(`==================================================\n`);

  // 1. Fetch all timetable entries
  const allEntries = await dbClient.timetableEntry.findMany({
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

  // 2. Validate individual entity integrity
  const validValidatedEntries: typeof candidateEntries = [];

  for (const entry of candidateEntries) {
    if (!entry.teacherId) continue;

    // Validate Teacher
    if (!entry.teacher || entry.teacher.status !== "ACTIVE") {
      addQuarantine(entry, "INACTIVE_OR_MISSING_STAFF");
      continue;
    }
    if (entry.teacher.tenantId !== entry.tenantId || entry.teacher.schoolId !== entry.schoolId) {
      addQuarantine(entry, "STAFF_TENANT_SCHOOL_MISMATCH");
      continue;
    }

    // Validate Class
    if (!entry.class || entry.class.tenantId !== entry.tenantId || entry.class.schoolId !== entry.schoolId) {
      addQuarantine(entry, "INVALID_OR_MISMATCHED_CLASS");
      continue;
    }

    // Validate Arm if provided
    if (entry.armId) {
      if (!entry.arm || entry.arm.tenantId !== entry.tenantId || entry.arm.classId !== entry.classId) {
        addQuarantine(entry, "INVALID_OR_MISMATCHED_ARM");
        continue;
      }
    }

    // Validate Subject
    if (!entry.subject || entry.subject.tenantId !== entry.tenantId || entry.subject.schoolId !== entry.schoolId) {
      addQuarantine(entry, "INVALID_OR_MISMATCHED_SUBJECT");
      continue;
    }

    // Validate Academic Year & Term
    if (!entry.academicYear || entry.academicYear.tenantId !== entry.tenantId || entry.academicYear.schoolId !== entry.schoolId) {
      addQuarantine(entry, "INVALID_OR_MISMATCHED_ACADEMIC_YEAR");
      continue;
    }
    if (!entry.term || entry.term.tenantId !== entry.tenantId || entry.term.academicYearId !== entry.academicYearId) {
      addQuarantine(entry, "INVALID_OR_MISMATCHED_TERM");
      continue;
    }

    validValidatedEntries.push(entry);
  }

  // 3. Group by Scope Key to evaluate Primary Teacher Ambiguity
  // ScopeKey: tenantId_schoolId_academicYearId_termId_classId_armId_subjectId
  const scopeMap = new Map<string, typeof validValidatedEntries>();

  for (const entry of validValidatedEntries) {
    const armKey = entry.armId || "CLASS_WIDE";
    const scopeKey = `${entry.tenantId}_${entry.schoolId}_${entry.academicYearId}_${entry.termId}_${entry.classId}_${armKey}_${entry.subjectId}`;

    if (!scopeMap.has(scopeKey)) {
      scopeMap.set(scopeKey, []);
    }
    scopeMap.get(scopeKey)!.push(entry);
  }

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

  let reconciledDuplicateCount = 0;

  for (const [scopeKey, scopeEntries] of scopeMap.entries()) {
    // Extract distinct teachers for this scope
    const distinctTeachers = Array.from(new Set(scopeEntries.map((e) => e.teacherId!)));

    if (distinctTeachers.length > 1) {
      // AMBIGUITY SAFEGUARD: Multiple teachers exist for the exact same class/arm/subject.
      // Do NOT arbitrarily pick one as primary! Quarantine all entries for this ambiguous scope.
      for (const ambiguousEntry of scopeEntries) {
        addQuarantine(ambiguousEntry, "PRIMARY_TEACHER_AMBIGUOUS");
      }
    } else {
      // Single teacher for this scope -> Deterministic isPrimary = true
      const primaryTeacherId = distinctTeachers[0];

      for (const entry of scopeEntries) {
        const scope: "CLASS_WIDE" | "ARM_SPECIFIC" = entry.armId ? "ARM_SPECIFIC" : "CLASS_WIDE";
        const armKey = entry.armId || "CLASS_WIDE";
        const assignmentKey = `${entry.tenantId}_${entry.schoolId}_${entry.academicYearId}_${entry.termId}_${entry.classId}_${armKey}_${entry.subjectId}_${primaryTeacherId}`;

        if (!assignmentMap.has(assignmentKey)) {
          assignmentMap.set(assignmentKey, {
            tenantId: entry.tenantId,
            schoolId: entry.schoolId,
            academicYearId: entry.academicYearId,
            termId: entry.termId,
            classId: entry.classId,
            armId: entry.armId,
            subjectId: entry.subjectId,
            teacherId: primaryTeacherId,
            scope,
            isPrimary: true, // Deterministically single teacher for scope
            status: "ACTIVE",
            migrationBatchId: "MIGRATION_5G_001",
          });
        } else {
          // Additional slot for the exact same teacher -> Reconciled Duplicate
          reconciledDuplicateCount++;
        }
      }
    }
  }

  const uniqueAssignments = Array.from(assignmentMap.values());
  const migratedAssignmentsCount = uniqueAssignments.length;
  const quarantinedCount = quarantinedItems.length;

  // 4. Source Accounting Reconciliation Invariant
  // Total Source Rows = (Unique Migrated Assignments + Reconciled Duplicates) + Quarantined + Skipped NULL Teacher
  const accountedSourceRows = migratedAssignmentsCount + reconciledDuplicateCount + quarantinedCount + skippedNullTeacherCount;
  const unaccountedCount = totalSourceRows - accountedSourceRows;
  const isReconciled = unaccountedCount === 0;

  console.log(`\n--- Classification Breakdown ---`);
  console.log(`Total Source Rows: ${totalSourceRows}`);
  console.log(`Skipped (Null Teacher): ${skippedNullTeacherCount}`);
  console.log(`Quarantined Rows: ${quarantinedCount}`);
  console.log(`Quarantine Breakdown:`, quarantineReasonsBreakdown);
  console.log(`Unique Assignments Derived: ${migratedAssignmentsCount}`);
  console.log(`Reconciled Duplicate Slots: ${reconciledDuplicateCount}`);
  console.log(`Unaccounted / Unexplained Source Rows: ${unaccountedCount}`);
  console.log(`Source Accounting Invariant Satisfied: ${isReconciled ? "YES (PASSED)" : "NO (FAILED)"}`);

  if (!isDryRun) {
    console.log(`\nWriting ${migratedAssignmentsCount} assignments and ${quarantinedCount} quarantine records to database...`);

    await dbClient.$transaction(async (tx) => {
      if (quarantinedItems.length > 0) {
        await tx.assignmentMigrationQuarantine.createMany({
          data: quarantinedItems,
        });
      }

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
    reconciledDuplicateCount,
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
