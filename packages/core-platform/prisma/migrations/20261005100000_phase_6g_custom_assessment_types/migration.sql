-- Step 1: Create Table acd_assessment_types
CREATE TABLE "acd_assessment_types" (
    "id" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL,
    "schoolId" VARCHAR(36) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acd_assessment_types_pkey" PRIMARY KEY ("id")
);

-- Step 2: Unique Index & Indexes for acd_assessment_types
CREATE UNIQUE INDEX "acd_assessment_types_tenantId_schoolId_code_key" 
ON "acd_assessment_types"("tenantId", "schoolId", "code");

CREATE INDEX "acd_assessment_types_tenantId_schoolId_isActive_idx" 
ON "acd_assessment_types"("tenantId", "schoolId", "isActive");

-- Step 3: Foreign Key Constraints for acd_assessment_types
ALTER TABLE "acd_assessment_types" 
ADD CONSTRAINT "acd_assessment_types_tenantId_fkey" 
FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "acd_assessment_types" 
ADD CONSTRAINT "acd_assessment_types_schoolId_fkey" 
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4: Seed 4 Built-In System Types (MANUAL_CA, EXAM, ASSIGNMENT, CBT) for all existing schools
INSERT INTO "acd_assessment_types" ("id", "tenantId", "schoolId", "code", "name", "description", "isSystem", "isActive", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    s."tenantId",
    s."id",
    t.code,
    t.name,
    t.description,
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "School" s
CROSS JOIN (
    VALUES 
        ('MANUAL_CA', 'Continuous Assessment (CA)', 'Manual continuous assessment component'),
        ('EXAM', 'Terminal Exam', 'Standard terminal examination component'),
        ('ASSIGNMENT', 'Assignment', 'Take-home assignment or homework component'),
        ('CBT', 'Computer Based Test (CBT)', 'Automated online CBT exam component')
) AS t(code, name, description)
ON CONFLICT ("tenantId", "schoolId", "code") DO NOTHING;

-- Step 5: Add Nullable assessmentTypeId Column to acd_assessment_components
ALTER TABLE "acd_assessment_components" ADD COLUMN "assessmentTypeId" VARCHAR(36);

-- Step 6: Data Migration: Backfill assessmentTypeId using exact tenant, school, and old type enum text
UPDATE "acd_assessment_components" c
SET "assessmentTypeId" = at."id"
FROM "acd_assessment_types" at
WHERE c."tenantId" = at."tenantId" 
  AND c."schoolId" = at."schoolId" 
  AND c."type"::text = at."code";

-- Step 7: Safety Check: Ensure zero unmapped AssessmentComponents
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "acd_assessment_components" WHERE "assessmentTypeId" IS NULL) THEN
    RAISE EXCEPTION 'Migration aborted: Unmapped assessmentTypeId found in acd_assessment_components';
  END IF;
END $$;

-- Step 8: Set NOT NULL and Foreign Key on acd_assessment_components.assessmentTypeId
ALTER TABLE "acd_assessment_components" ALTER COLUMN "assessmentTypeId" SET NOT NULL;

ALTER TABLE "acd_assessment_components" 
ADD CONSTRAINT "acd_assessment_components_assessmentTypeId_fkey" 
FOREIGN KEY ("assessmentTypeId") REFERENCES "acd_assessment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "acd_assessment_components_assessmentTypeId_idx" 
ON "acd_assessment_components"("assessmentTypeId");

-- Step 9: Drop Old Uniqueness Indexes on acd_assessment_components (dependent on old 'type' column)
DROP INDEX IF EXISTS "acd_assessment_components_class_wide_key";
DROP INDEX IF EXISTS "acd_assessment_components_arm_specific_key";

-- Step 10: Recreate Class-Wide & Arm-Specific Unique Indexes using assessmentTypeId
CREATE UNIQUE INDEX "acd_assessment_components_class_wide_key" 
ON "acd_assessment_components"(
    "tenantId", 
    "schoolId", 
    "academicYearId", 
    "termId", 
    "classId", 
    "subjectId", 
    "assessmentTypeId"
) 
WHERE "armId" IS NULL;

CREATE UNIQUE INDEX "acd_assessment_components_arm_specific_key" 
ON "acd_assessment_components"(
    "tenantId", 
    "schoolId", 
    "academicYearId", 
    "termId", 
    "classId", 
    "armId", 
    "subjectId", 
    "assessmentTypeId"
) 
WHERE "armId" IS NOT NULL;

-- Step 11: Remove Old 'type' Column from acd_assessment_components
ALTER TABLE "acd_assessment_components" DROP COLUMN "type";

-- Step 12: Process acd_assessment_scores: Ensure assessmentComponentId is NOT NULL & remove old type column + index
DROP INDEX IF EXISTS "acd_assessment_scores_tenantId_schoolId_subjectResultId_typ_key";

-- Step 12.1: Clean up orphaned AssessmentScore records that have no Component before enforcing NOT NULL
DELETE FROM "acd_assessment_scores" WHERE "assessmentComponentId" IS NULL;

-- Safety Check: Abort if any unlinked AssessmentScore exists before enforcing NOT NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "acd_assessment_scores" WHERE "assessmentComponentId" IS NULL) THEN
    RAISE EXCEPTION 'Migration aborted: Found acd_assessment_scores record with NULL assessmentComponentId';
  END IF;
END $$;

ALTER TABLE "acd_assessment_scores" ALTER COLUMN "assessmentComponentId" SET NOT NULL;
ALTER TABLE "acd_assessment_scores" DROP COLUMN IF EXISTS "type";

-- Step 13: Clean Up Obsolete Enum Type
DROP TYPE IF EXISTS "AssessmentComponentType";
