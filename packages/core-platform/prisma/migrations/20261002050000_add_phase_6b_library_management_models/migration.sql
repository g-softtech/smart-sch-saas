-- CreateEnum
CREATE TYPE "BorrowerType" AS ENUM ('STUDENT', 'STAFF');

-- CreateEnum
CREATE TYPE "BookItemStatus" AS ENUM ('AVAILABLE', 'BORROWED', 'RESERVED', 'MAINTENANCE', 'LOST');

-- CreateEnum
CREATE TYPE "BookLoanStatus" AS ENUM ('ISSUED', 'OVERDUE', 'RETURNED', 'LOST');

-- CreateTable
CREATE TABLE "lib_book_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lib_book_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lib_books" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isbn" TEXT,
    "publisher" TEXT,
    "publicationYear" INTEGER,
    "totalCopies" INTEGER NOT NULL DEFAULT 0,
    "availableCopies" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lib_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lib_book_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT,
    "bookId" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "copyNumber" INTEGER NOT NULL,
    "status" "BookItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lib_book_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lib_policies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "borrowerType" "BorrowerType" NOT NULL,
    "maxBooksAllowed" INTEGER NOT NULL DEFAULT 3,
    "loanDurationDays" INTEGER NOT NULL DEFAULT 14,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 2,
    "finePerDay" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "maxFineAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lib_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lib_book_loans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT,
    "bookItemId" TEXT NOT NULL,
    "borrowerType" "BorrowerType" NOT NULL,
    "studentId" TEXT,
    "staffProfileId" TEXT,
    "issuedById" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "status" "BookLoanStatus" NOT NULL DEFAULT 'ISSUED',
    "fineAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "invoiceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lib_book_loans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "check_borrower_type" CHECK (
        ("borrowerType" = 'STUDENT' AND "studentId" IS NOT NULL AND "staffProfileId" IS NULL) OR
        ("borrowerType" = 'STAFF' AND "staffProfileId" IS NOT NULL AND "studentId" IS NULL)
    )
);

-- CreateTable
CREATE TABLE "lib_audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lib_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lib_book_categories_tenantId_schoolId_name_key" ON "lib_book_categories"("tenantId", "schoolId", "name");

-- CreateIndex
CREATE INDEX "lib_books_tenantId_schoolId_categoryId_idx" ON "lib_books"("tenantId", "schoolId", "categoryId");

-- CreateIndex
CREATE INDEX "lib_books_tenantId_schoolId_title_idx" ON "lib_books"("tenantId", "schoolId", "title");

-- CreateIndex
CREATE INDEX "lib_book_items_tenantId_schoolId_campusId_idx" ON "lib_book_items"("tenantId", "schoolId", "campusId");

-- CreateIndex
CREATE UNIQUE INDEX "lib_book_items_tenantId_schoolId_assetTag_key" ON "lib_book_items"("tenantId", "schoolId", "assetTag");

-- CreateIndex
CREATE UNIQUE INDEX "lib_book_items_bookId_copyNumber_key" ON "lib_book_items"("bookId", "copyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "lib_policies_tenantId_schoolId_borrowerType_key" ON "lib_policies"("tenantId", "schoolId", "borrowerType");

-- CreateIndex
CREATE UNIQUE INDEX "lib_book_loans_invoiceId_key" ON "lib_book_loans"("invoiceId");

-- CreateIndex
CREATE INDEX "lib_book_loans_tenantId_schoolId_studentId_idx" ON "lib_book_loans"("tenantId", "schoolId", "studentId");

-- CreateIndex
CREATE INDEX "lib_book_loans_tenantId_schoolId_staffProfileId_idx" ON "lib_book_loans"("tenantId", "schoolId", "staffProfileId");

-- CreateIndex
CREATE INDEX "lib_book_loans_tenantId_schoolId_status_idx" ON "lib_book_loans"("tenantId", "schoolId", "status");

-- CreateIndex
CREATE INDEX "lib_audit_logs_tenantId_schoolId_userId_idx" ON "lib_audit_logs"("tenantId", "schoolId", "userId");

-- AddForeignKey
ALTER TABLE "lib_book_categories" ADD CONSTRAINT "lib_book_categories_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_categories" ADD CONSTRAINT "lib_book_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_books" ADD CONSTRAINT "lib_books_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "lib_book_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_books" ADD CONSTRAINT "lib_books_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_books" ADD CONSTRAINT "lib_books_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_items" ADD CONSTRAINT "lib_book_items_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "lib_books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_items" ADD CONSTRAINT "lib_book_items_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_items" ADD CONSTRAINT "lib_book_items_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_items" ADD CONSTRAINT "lib_book_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_policies" ADD CONSTRAINT "lib_policies_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_policies" ADD CONSTRAINT "lib_policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_loans" ADD CONSTRAINT "lib_book_loans_bookItemId_fkey" FOREIGN KEY ("bookItemId") REFERENCES "lib_book_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_loans" ADD CONSTRAINT "lib_book_loans_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_loans" ADD CONSTRAINT "lib_book_loans_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_loans" ADD CONSTRAINT "lib_book_loans_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_loans" ADD CONSTRAINT "lib_book_loans_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "stf_staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_book_loans" ADD CONSTRAINT "lib_book_loans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_audit_logs" ADD CONSTRAINT "lib_audit_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lib_audit_logs" ADD CONSTRAINT "lib_audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
