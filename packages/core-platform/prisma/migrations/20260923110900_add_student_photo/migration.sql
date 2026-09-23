-- AlterTable
ALTER TABLE "acd_academic_years" ALTER COLUMN "endDate" DROP NOT NULL,
ALTER COLUMN "startDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "acd_terms" ALTER COLUMN "endDate" DROP NOT NULL,
ALTER COLUMN "startDate" DROP NOT NULL;

-- CreateTable
CREATE TABLE "stud_photos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stud_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stud_photos_studentId_key" ON "stud_photos"("studentId");

-- AddForeignKey
ALTER TABLE "stud_photos" ADD CONSTRAINT "stud_photos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_photos" ADD CONSTRAINT "stud_photos_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stud_photos" ADD CONSTRAINT "stud_photos_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
