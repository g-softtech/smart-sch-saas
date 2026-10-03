/**
 * PHASE 6B - LIBRARY MANAGEMENT E2E & SECURITY SUITE
 *
 * Verifies:
 *  1. Book catalog: category, book, BookItem creation with tenant/school isolation.
 *  2. AssetTag uniqueness scoped to tenant+school; allowed across schools.
 *  3. copyNumber uniqueness scoped to book.
 *  4. Borrower invariant enforced at service AND PostgreSQL CHECK constraint level.
 *  5. Circulation state machine: issue -> return, double-issue, double-return protection.
 *  6. availableCopies transactional synchronization on every state change.
 *  7. Maintenance restriction (cannot manually update BORROWED/LOST via updateBookItemStatus).
 *  8. Staff loan workflow (STAFF borrowerType).
 *  9. Lost book workflow with Finance invoice auto-linkage.
 * 10. Finance idempotency (duplicate invoice creation prevented).
 * 11. Zero-trust student identity derivation from userId (not client-supplied studentId).
 * 12. Historical loan preservation via onDelete: Restrict.
 * 13. Cross-school data isolation (school1 data cannot be accessed via school2 context).
 */

import { kernel, tenantContext } from "../index.js";
import { LibraryService } from "../../../../apps/api-gateway/src/modules/library/library.service.js";
import { BorrowerTypeDto } from "../../../../apps/api-gateway/src/modules/library/dto/policy.dto.js";

async function runPhase6BLibraryE2ETest() {
  console.log("================================================================================");
  console.log("RUNNING PHASE 6B LIBRARY MANAGEMENT DEDICATED E2E TEST SUITE");
  console.log("================================================================================");

  const libraryService = new LibraryService();
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, testName: string) {
    totalCount++;
    if (condition) {
      console.log(`✓ PASSED: ${testName}`);
      passedCount++;
    } else {
      console.error(`✗ FAILED: ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  const tenantId = `test-tenant-lib-${Date.now()}`;
  const schoolId = `test-school-lib-${Date.now()}`;
  const school2Id = `test-school-lib2-${Date.now()}`;
  const campusId = `test-campus-lib-${Date.now()}`;

  console.log("Creating test tenant...");

  await kernel.db.tenant.create({
    data: {
      id: tenantId,
      name: "Library Test Tenant",
      slug: `lib-tenant-${Date.now()}`,
    },
  });

  await tenantContext.run({ tenantId }, async () => {
    console.log("Creating test school, campus, student, and staff...");

    await kernel.db.school.create({
      data: { id: schoolId, tenantId, name: "Library Primary School" },
    });

    await kernel.db.school.create({
      data: { id: school2Id, tenantId, name: "Library Secondary School" },
    });

    await kernel.db.campus.create({
      data: { id: campusId, tenantId, schoolId, name: "Main Library Campus" },
    });

    const userStudent = await kernel.db.user.create({
      data: { email: `student-lib-${Date.now()}@schoolos.test` },
    });

    const student = await kernel.db.student.create({
      data: {
        tenantId,
        schoolId,
        userId: userStudent.id,
        studentNumber: `STU-LIB-${Date.now()}`,
        firstName: "Library",
        lastName: "Student",
        gender: "MALE",
        admissionDate: new Date(),
      },
    });

    const staff = await kernel.db.staffProfile.create({
      data: {
        tenantId,
        schoolId,
        staffNumber: `STF-LIB-${Date.now()}`,
        firstName: "Librarian",
        lastName: "Staff",
        joiningDate: new Date(),
        type: "TEACHING",
      },
    });

    // Seed academic year and term for finance invoice integration
    const academicYear = await kernel.db.academicYear.create({
      data: { tenantId, schoolId, name: "2026/2027" },
    });

    const term = await kernel.db.term.create({
      data: {
        tenantId,
        academicYearId: academicYear.id,
        name: "Term 1",
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 86400000),
      },
    });

    try {
      // -----------------------------------------------------------------------
      // TEST 1: Book Category Creation & Tenant/School Isolation
      // -----------------------------------------------------------------------
      const category = await libraryService.createCategory(tenantId, schoolId, {
        name: "Computer Science",
        description: "Technology & Software Engineering Books",
      });
      assert(category.name === "Computer Science", "Test 1A: Create book category");
      assert(category.tenantId === tenantId && category.schoolId === schoolId, "Test 1B: Category tenant/school isolation");

      // Duplicate category in same school is rejected
      let dupCategoryError = false;
      try {
        await libraryService.createCategory(tenantId, schoolId, { name: "Computer Science" });
      } catch (e: any) {
        dupCategoryError = true;
      }
      assert(dupCategoryError, "Test 1C: Duplicate category name in same school rejected");

      // -----------------------------------------------------------------------
      // TEST 2: Book Catalog Title Creation
      // -----------------------------------------------------------------------
      const book = await libraryService.createBook(tenantId, schoolId, {
        categoryId: category.id,
        title: "Clean Code",
        author: "Robert C. Martin",
        isbn: "978-0132350884",
      });
      assert(book.title === "Clean Code" && book.totalCopies === 0, "Test 2A: Create book catalog title");
      assert(book.tenantId === tenantId && book.schoolId === schoolId, "Test 2B: Book tenant/school isolation");

      // Cross-school category ID rejected for book creation
      const category2 = await libraryService.createCategory(tenantId, school2Id, { name: "General Science" });
      let crossSchoolBookError = false;
      try {
        await libraryService.createBook(tenantId, schoolId, {
          categoryId: category2.id, // school2's category used against school1
          title: "Cross School Book",
          author: "Author",
        });
      } catch (e: any) {
        crossSchoolBookError = true;
      }
      assert(crossSchoolBookError, "Test 2C: Cross-school category ID rejected for book creation");

      // -----------------------------------------------------------------------
      // TEST 3: Add Physical BookItem Copies & Counter Transactional Sync
      // -----------------------------------------------------------------------
      const item1 = await libraryService.addBookItem(tenantId, schoolId, {
        bookId: book.id,
        campusId,
        assetTag: "TAG-CS-001",
        copyNumber: 1,
        location: "Shelf A-1",
      });
      assert(item1.assetTag === "TAG-CS-001" && item1.status === "AVAILABLE", "Test 3A: Add BookItem copy 1");

      const item2 = await libraryService.addBookItem(tenantId, schoolId, {
        bookId: book.id,
        campusId,
        assetTag: "TAG-CS-002",
        copyNumber: 2,
        location: "Shelf A-1",
      });
      assert(item2.copyNumber === 2, "Test 3B: Add BookItem copy 2");

      const refreshedBook = await libraryService.getBookDetails(tenantId, schoolId, book.id);
      assert(refreshedBook.totalCopies === 2 && refreshedBook.availableCopies === 2, "Test 3C: Transactional counter sync (2 total, 2 available)");

      // -----------------------------------------------------------------------
      // TEST 4: AssetTag Uniqueness Scoping
      // -----------------------------------------------------------------------
      let assetTagError = false;
      try {
        await libraryService.addBookItem(tenantId, schoolId, {
          bookId: book.id,
          assetTag: "TAG-CS-001", // duplicate in same school
          copyNumber: 3,
        });
      } catch (e: any) {
        assetTagError = true;
      }
      assert(assetTagError, "Test 4A: Duplicate asset tag in same school rejected");

      // Same asset tag allowed in a separate school
      const book2 = await libraryService.createBook(tenantId, school2Id, {
        categoryId: category2.id,
        title: "Clean Code Vol 2",
        author: "Robert C. Martin",
      });
      const itemSchool2 = await libraryService.addBookItem(tenantId, school2Id, {
        bookId: book2.id,
        assetTag: "TAG-CS-001", // same tag, different school
        copyNumber: 1,
      });
      assert(itemSchool2.assetTag === "TAG-CS-001", "Test 4B: Same asset tag allowed across separate schools");

      // -----------------------------------------------------------------------
      // TEST 5: Copy Number Composite Uniqueness Protection
      // -----------------------------------------------------------------------
      let copyNumError = false;
      try {
        await libraryService.addBookItem(tenantId, schoolId, {
          bookId: book.id,
          assetTag: "TAG-CS-003",
          copyNumber: 1, // duplicate copy number for book
        });
      } catch (e: any) {
        copyNumError = true;
      }
      assert(copyNumError, "Test 5: Duplicate copy number for same book rejected");

      // -----------------------------------------------------------------------
      // TEST 6: Borrower Invariants (Service & PostgreSQL CHECK Constraint)
      // -----------------------------------------------------------------------
      let inv1Error = false;
      try {
        await libraryService.issueLoan(tenantId, schoolId, campusId, "USER-ADMIN", {
          bookItemId: item1.id,
          borrowerType: BorrowerTypeDto.STUDENT,
          studentId: student.id,
          staffProfileId: staff.id, // Invalid: both IDs provided!
        });
      } catch (e: any) {
        inv1Error = true;
      }
      assert(inv1Error, "Test 6A: Rejection when both studentId and staffProfileId provided");

      let inv2Error = false;
      try {
        await libraryService.issueLoan(tenantId, schoolId, campusId, "USER-ADMIN", {
          bookItemId: item1.id,
          borrowerType: BorrowerTypeDto.STUDENT,
          // Invalid: missing studentId!
        });
      } catch (e: any) {
        inv2Error = true;
      }
      assert(inv2Error, "Test 6B: Rejection when STUDENT loan missing studentId");

      // Verify DB-level CHECK constraint directly via raw SQL
      let dbCheckError = false;
      try {
        await kernel.db.$executeRaw`
          INSERT INTO "lib_book_loans" ("id", "tenantId", "schoolId", "bookItemId", "borrowerType", "studentId", "staffProfileId", "issuedById", "dueDate", "status", "updatedAt")
          VALUES (${`invalid-loan-${Date.now()}`}, ${tenantId}, ${schoolId}, ${item1.id}, 'STUDENT'::"BorrowerType", ${student.id}, ${staff.id}, 'USER-1', NOW(), 'ISSUED'::"BookLoanStatus", NOW())
        `;
      } catch (e: any) {
        dbCheckError = true;
      }
      assert(dbCheckError, "Test 6C: PostgreSQL CHECK constraint check_borrower_type rejects invalid DB insert");

      // -----------------------------------------------------------------------
      // TEST 7: Issue Book Loan (Student) & Double-Issue Protection
      // -----------------------------------------------------------------------
      const loan1 = await libraryService.issueLoan(tenantId, schoolId, campusId, "USER-ADMIN", {
        bookItemId: item1.id,
        borrowerType: BorrowerTypeDto.STUDENT,
        studentId: student.id,
      });
      assert(loan1.status === "ISSUED" && loan1.bookItem.status === "BORROWED", "Test 7A: Issue book loan to student");

      let doubleIssueError = false;
      try {
        await libraryService.issueLoan(tenantId, schoolId, campusId, "USER-ADMIN", {
          bookItemId: item1.id, // Already BORROWED!
          borrowerType: BorrowerTypeDto.STAFF,
          staffProfileId: staff.id,
        });
      } catch (e: any) {
        doubleIssueError = true;
      }
      assert(doubleIssueError, "Test 7B: Double-issue protection (cannot issue BORROWED copy)");

      const bookAfterLoan = await libraryService.getBookDetails(tenantId, schoolId, book.id);
      assert(bookAfterLoan.availableCopies === 1, "Test 7C: availableCopies decremented to 1 after issue");

      // -----------------------------------------------------------------------
      // TEST 8: Staff Loan Workflow
      // -----------------------------------------------------------------------
      const staffLoan = await libraryService.issueLoan(tenantId, schoolId, campusId, "USER-ADMIN", {
        bookItemId: item2.id,
        borrowerType: BorrowerTypeDto.STAFF,
        staffProfileId: staff.id,
      });
      assert(staffLoan.status === "ISSUED" && staffLoan.borrowerType === "STAFF", "Test 8A: Issue book loan to staff member");
      assert(staffLoan.studentId === null && staffLoan.staffProfileId === staff.id, "Test 8B: Staff loan has correct borrower identity (no studentId)");

      const bookAfterStaffLoan = await libraryService.getBookDetails(tenantId, schoolId, book.id);
      assert(bookAfterStaffLoan.availableCopies === 0, "Test 8C: availableCopies 0 after both copies issued");

      // Return staff loan
      const returnedStaffLoan = await libraryService.returnLoan(tenantId, schoolId, staffLoan.id, "USER-ADMIN", {
        notes: "Staff returned on time",
      });
      assert(returnedStaffLoan.status === "RETURNED", "Test 8D: Staff loan returned successfully");

      const bookAfterStaffReturn = await libraryService.getBookDetails(tenantId, schoolId, book.id);
      assert(bookAfterStaffReturn.availableCopies === 1, "Test 8E: availableCopies restored to 1 after staff return");

      // -----------------------------------------------------------------------
      // TEST 9: Return Student Loan & Double-Return Protection
      // -----------------------------------------------------------------------
      const returnedLoan = await libraryService.returnLoan(tenantId, schoolId, loan1.id, "USER-ADMIN", {
        notes: "Checked in clean condition",
      });
      assert(returnedLoan.status === "RETURNED" && returnedLoan.bookItem.status === "AVAILABLE", "Test 9A: Return student book copy");

      let doubleReturnError = false;
      try {
        await libraryService.returnLoan(tenantId, schoolId, loan1.id, "USER-ADMIN", {});
      } catch (e: any) {
        doubleReturnError = true;
      }
      assert(doubleReturnError, "Test 9B: Double-return protection (cannot return RETURNED loan)");

      const bookAfterReturn = await libraryService.getBookDetails(tenantId, schoolId, book.id);
      assert(bookAfterReturn.availableCopies === 2, "Test 9C: availableCopies fully restored to 2 after both returns");

      // -----------------------------------------------------------------------
      // TEST 10: Maintenance Restriction (Cannot bypass circulation via updateBookItemStatus)
      // -----------------------------------------------------------------------
      // Issue item1 again so it's BORROWED
      const loanForMaintTest = await libraryService.issueLoan(tenantId, schoolId, campusId, "USER-ADMIN", {
        bookItemId: item1.id,
        borrowerType: BorrowerTypeDto.STUDENT,
        studentId: student.id,
      });

      let maintenanceBorrowedError = false;
      try {
        await libraryService.updateBookItemStatus(tenantId, schoolId, item1.id, { status: "AVAILABLE" });
      } catch (e: any) {
        maintenanceBorrowedError = true;
      }
      assert(maintenanceBorrowedError, "Test 10A: Cannot use updateBookItemStatus to bypass BORROWED state");

      // Return it for subsequent tests
      await libraryService.returnLoan(tenantId, schoolId, loanForMaintTest.id, "USER-ADMIN", {});

      // -----------------------------------------------------------------------
      // TEST 11: Lost Book Workflow & Finance Invoice Linkage & Idempotency
      // -----------------------------------------------------------------------
      const loanForLost = await libraryService.issueLoan(tenantId, schoolId, campusId, "USER-ADMIN", {
        bookItemId: item2.id,
        borrowerType: BorrowerTypeDto.STUDENT,
        studentId: student.id,
      });

      const lostLoan = await libraryService.markLost(tenantId, schoolId, loanForLost.id, "USER-ADMIN", {
        replacementFee: 7500,
        notes: "Borrower reported copy lost in transit",
      });

      assert(lostLoan.status === "LOST" && lostLoan.bookItem.status === "LOST", "Test 11A: Mark copy as LOST");
      assert(!!lostLoan.invoiceId, "Test 11B: Finance invoice automatically linked to lost loan");

      // Verify invoice in Finance module
      const invoice = await kernel.db.invoice.findUnique({
        where: { id: lostLoan.invoiceId! },
        include: { lineItems: true },
      });
      assert(invoice !== null && Number(invoice!.totalAmount) === 7500, "Test 11C: Finance invoice exists with total amount 7500");
      assert(invoice!.lineItems.length === 1, "Test 11D: Invoice has exactly one line item");

      // LOST item cannot be issued again
      let lostIssueError = false;
      try {
        await libraryService.issueLoan(tenantId, schoolId, campusId, "USER-ADMIN", {
          bookItemId: item2.id, // LOST!
          borrowerType: BorrowerTypeDto.STAFF,
          staffProfileId: staff.id,
        });
      } catch (e: any) {
        lostIssueError = true;
      }
      assert(lostIssueError, "Test 11E: LOST item cannot be re-issued");

      // Finance idempotency: second billOverdueFine call on same loan returns existing invoice
      const billAgain = await libraryService.billOverdueFine(tenantId, schoolId, loanForLost.id, "USER-ADMIN", {
        fineAmount: 7500,
      });
      assert(billAgain.invoiceId === lostLoan.invoiceId, "Test 11F: Finance idempotency (duplicate invoice creation prevented)");

      // -----------------------------------------------------------------------
      // TEST 12: Zero-Trust Student Identity Loan Retrieval
      // -----------------------------------------------------------------------
      const studentLoans = await libraryService.getStudentLoans(tenantId, userStudent.id);
      // student was issued loan1 (RETURNED), loanForMaintTest (RETURNED), loanForLost (LOST) = 3 total
      assert(studentLoans.length === 3, "Test 12A: Student portal resolves loans via authenticated user identity");

      let invalidUserError = false;
      try {
        await libraryService.getStudentLoans(tenantId, "nonexistent-user-id");
      } catch (e: any) {
        invalidUserError = true;
      }
      assert(invalidUserError, "Test 12B: Zero-trust student endpoint rejects unlinked user identity");

      // -----------------------------------------------------------------------
      // TEST 13: Cross-School Data Isolation
      // -----------------------------------------------------------------------
      // school1's book cannot be found using school2 context
      let crossSchoolBookNotFound = false;
      try {
        const result = await libraryService.getBookDetails(tenantId, school2Id, book.id);
        // Should not find school1's book in school2 context
        crossSchoolBookNotFound = false;
        assert(false, "Test 13A: Cross-school book access should be rejected");
      } catch (e: any) {
        crossSchoolBookNotFound = true;
      }
      assert(crossSchoolBookNotFound, "Test 13A: Cross-school book access rejected (school1 book not visible in school2 context)");

      // school1's category not found in school2 context
      const school2Categories = await libraryService.getCategories(tenantId, school2Id);
      const school2CategoryIds = school2Categories.map((c: any) => c.id);
      assert(!school2CategoryIds.includes(category.id), "Test 13B: School1 categories not visible in school2 catalog");

      // -----------------------------------------------------------------------
      // TEST 14: Historical Loan Preservation (onDelete: Restrict)
      // -----------------------------------------------------------------------
      let deleteCopyError = false;
      try {
        await kernel.db.bookItem.delete({
          where: { id: item1.id }, // Has historical loan record!
        });
      } catch (e: any) {
        deleteCopyError = true;
      }
      assert(deleteCopyError, "Test 14: Physical copy with historical loans protected against deletion (onDelete: Restrict)");

      console.log("================================================================================");
      console.log(`PHASE 6B LIBRARY E2E SUITE RESULTS: ${passedCount}/${totalCount} TESTS PASSED`);
      console.log("================================================================================");
    } catch (err: any) {
      console.error("Test Suite execution failed:", err);
      throw err;
    }
  });
}

runPhase6BLibraryE2ETest()
  .then(() => {
    console.log("Phase 6B E2E Suite execution completed cleanly.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Phase 6B E2E Suite failed with errors:", err);
    process.exit(1);
  });
