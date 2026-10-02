-- CreateEnum
CREATE TYPE "LessonNoteStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "acd_lesson_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "armId" TEXT,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "subtopic" TEXT,
    "objectives" JSONB NOT NULL,
    "materials" TEXT,
    "introduction" TEXT,
    "presentationSteps" JSONB NOT NULL,
    "evaluation" TEXT,
    "assignment" TEXT,
    "status" "LessonNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acd_lesson_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acd_lesson_note_audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "lessonNoteId" TEXT NOT NULL,
    "fromStatus" "LessonNoteStatus",
    "toStatus" "LessonNoteStatus" NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "actorUserId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acd_lesson_note_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "acd_lesson_notes_tenantId_schoolId_classId_subjectId_idx" ON "acd_lesson_notes"("tenantId", "schoolId", "classId", "subjectId");
CREATE INDEX "acd_lesson_notes_tenantId_teacherId_academicYearId_termId_idx" ON "acd_lesson_notes"("tenantId", "teacherId", "academicYearId", "termId");
CREATE INDEX "acd_lesson_notes_tenantId_assignmentId_idx" ON "acd_lesson_notes"("tenantId", "assignmentId");
CREATE INDEX "acd_lesson_notes_tenantId_status_idx" ON "acd_lesson_notes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "acd_lesson_note_audit_logs_tenantId_schoolId_lessonNoteId_idx" ON "acd_lesson_note_audit_logs"("tenantId", "schoolId", "lessonNoteId");

-- AddForeignKey
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "acd_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_armId_fkey" FOREIGN KEY ("armId") REFERENCES "acd_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "acd_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "stf_staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "stf_teacher_subject_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acd_lesson_notes" ADD CONSTRAINT "acd_lesson_notes_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "idm_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acd_lesson_note_audit_logs" ADD CONSTRAINT "acd_lesson_note_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "acd_lesson_note_audit_logs" ADD CONSTRAINT "acd_lesson_note_audit_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "acd_lesson_note_audit_logs" ADD CONSTRAINT "acd_lesson_note_audit_logs_lessonNoteId_fkey" FOREIGN KEY ("lessonNoteId") REFERENCES "acd_lesson_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
