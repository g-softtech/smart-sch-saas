import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { kernel, tenantContext, Prisma } from "@saas/core-platform";
import { CreateBookCategoryDto } from "./dto/category.dto";
import { CreateBookDto, QueryBookDto } from "./dto/book.dto";
import { AddBookItemDto, UpdateBookItemStatusDto } from "./dto/book-item.dto";
import { UpsertPolicyDto, BorrowerTypeDto } from "./dto/policy.dto";
import { IssueLoanDto, ReturnLoanDto, MarkLostDto, BillFineDto, QueryLoanDto } from "./dto/loan.dto";

@Injectable()
export class LibraryService {
  private readonly logger = new Logger(LibraryService.name);
  private readonly prisma = kernel.db;

  // ---------------------------------------------------------------------------
  // CATEGORIES
  // ---------------------------------------------------------------------------
  async createCategory(tenantId: string, schoolId: string, dto: CreateBookCategoryDto) {
    const existing = await this.prisma.bookCategory.findUnique({
      where: { tenantId_schoolId_name: { tenantId, schoolId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(`Category '${dto.name}' already exists in this school.`);
    }

    return this.prisma.bookCategory.create({
      data: {
        tenantId,
        schoolId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async getCategories(tenantId: string, schoolId: string) {
    return this.prisma.bookCategory.findMany({
      where: { tenantId, schoolId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { books: true } },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // BOOKS (CATALOG)
  // ---------------------------------------------------------------------------
  async createBook(tenantId: string, schoolId: string, dto: CreateBookDto) {
    const category = await this.prisma.bookCategory.findFirst({
      where: { id: dto.categoryId, tenantId, schoolId },
    });
    if (!category) {
      throw new NotFoundException("Book category not found.");
    }

    return this.prisma.book.create({
      data: {
        tenantId,
        schoolId,
        categoryId: dto.categoryId,
        title: dto.title,
        author: dto.author,
        isbn: dto.isbn,
        publisher: dto.publisher,
        publicationYear: dto.publicationYear,
        totalCopies: 0,
        availableCopies: 0,
      },
      include: {
        category: true,
      },
    });
  }

  async getBooks(tenantId: string, schoolId: string, query: QueryBookDto) {
    const where: Prisma.BookWhereInput = { tenantId, schoolId };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.title) where.title = { contains: query.title, mode: "insensitive" };
    if (query.author) where.author = { contains: query.author, mode: "insensitive" };
    if (query.isbn) where.isbn = query.isbn;

    return this.prisma.book.findMany({
      where,
      include: {
        category: true,
        _count: { select: { items: true } },
      },
      orderBy: { title: "asc" },
    });
  }

  async getBookDetails(tenantId: string, schoolId: string, bookId: string) {
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, tenantId, schoolId },
      include: {
        category: true,
        items: {
          include: {
            campus: true,
            loans: {
              where: { status: { in: ["ISSUED", "OVERDUE"] } },
              take: 1,
            },
          },
          orderBy: { copyNumber: "asc" },
        },
      },
    });
    if (!book) {
      throw new NotFoundException("Book title not found.");
    }
    return book;
  }

  // ---------------------------------------------------------------------------
  // BOOK ITEMS (PHYSICAL INVENTORY)
  // ---------------------------------------------------------------------------
  async addBookItem(tenantId: string, schoolId: string, dto: AddBookItemDto) {
    const book = await this.prisma.book.findFirst({
      where: { id: dto.bookId, tenantId, schoolId },
    });
    if (!book) {
      throw new NotFoundException("Book title not found.");
    }

    // Check duplicate asset tag within tenant/school
    const existingAsset = await this.prisma.bookItem.findUnique({
      where: { tenantId_schoolId_assetTag: { tenantId, schoolId, assetTag: dto.assetTag } },
    });
    if (existingAsset) {
      throw new ConflictException(`Asset tag '${dto.assetTag}' is already registered in this school.`);
    }

    // Check duplicate copy number for book
    const existingCopy = await this.prisma.bookItem.findUnique({
      where: { bookId_copyNumber: { bookId: dto.bookId, copyNumber: dto.copyNumber } },
    });
    if (existingCopy) {
      throw new ConflictException(`Copy number ${dto.copyNumber} already exists for this book.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.bookItem.create({
        data: {
          tenantId,
          schoolId,
          campusId: dto.campusId,
          bookId: dto.bookId,
          assetTag: dto.assetTag,
          copyNumber: dto.copyNumber,
          location: dto.location,
          status: "AVAILABLE",
        },
      });

      // Recalculate derived counters
      const totalCount = await tx.bookItem.count({ where: { bookId: dto.bookId } });
      const availableCount = await tx.bookItem.count({ where: { bookId: dto.bookId, status: "AVAILABLE" } });

      await tx.book.update({
        where: { id: dto.bookId },
        data: { totalCopies: totalCount, availableCopies: availableCount },
      });

      await tx.libraryAuditLog.create({
        data: {
          tenantId,
          schoolId,
          userId: "SYSTEM",
          action: "BOOK_ITEM_CREATED",
          details: { bookId: dto.bookId, assetTag: dto.assetTag, copyNumber: dto.copyNumber },
        },
      });

      return item;
    });
  }

  async updateBookItemStatus(tenantId: string, schoolId: string, itemId: string, dto: UpdateBookItemStatusDto) {
    const item = await this.prisma.bookItem.findFirst({
      where: { id: itemId, tenantId, schoolId },
    });
    if (!item) {
      throw new NotFoundException("Book copy not found.");
    }

    if (item.status === "BORROWED" || item.status === "LOST") {
      throw new BadRequestException(`Cannot manually update status of a copy that is currently ${item.status}. Use circulation actions.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.bookItem.update({
        where: { id: itemId },
        data: {
          status: dto.status,
          location: dto.location ?? item.location,
        },
      });

      // Recalculate available copies
      const availableCount = await tx.bookItem.count({ where: { bookId: item.bookId, status: "AVAILABLE" } });
      await tx.book.update({
        where: { id: item.bookId },
        data: { availableCopies: availableCount },
      });

      await tx.libraryAuditLog.create({
        data: {
          tenantId,
          schoolId,
          userId: "SYSTEM",
          action: "BOOK_ITEM_STATUS_UPDATED",
          details: { itemId, oldStatus: item.status, newStatus: dto.status, notes: dto.notes },
        },
      });

      return updatedItem;
    });
  }

  // ---------------------------------------------------------------------------
  // POLICIES
  // ---------------------------------------------------------------------------
  async upsertPolicy(tenantId: string, schoolId: string, dto: UpsertPolicyDto) {
    return this.prisma.libraryPolicy.upsert({
      where: { tenantId_schoolId_borrowerType: { tenantId, schoolId, borrowerType: dto.borrowerType } },
      create: {
        tenantId,
        schoolId,
        borrowerType: dto.borrowerType,
        maxBooksAllowed: dto.maxBooksAllowed,
        loanDurationDays: dto.loanDurationDays,
        gracePeriodDays: dto.gracePeriodDays,
        finePerDay: new Prisma.Decimal(dto.finePerDay),
        maxFineAmount: new Prisma.Decimal(dto.maxFineAmount),
      },
      update: {
        maxBooksAllowed: dto.maxBooksAllowed,
        loanDurationDays: dto.loanDurationDays,
        gracePeriodDays: dto.gracePeriodDays,
        finePerDay: new Prisma.Decimal(dto.finePerDay),
        maxFineAmount: new Prisma.Decimal(dto.maxFineAmount),
      },
    });
  }

  async getPolicies(tenantId: string, schoolId: string) {
    return this.prisma.libraryPolicy.findMany({
      where: { tenantId, schoolId },
    });
  }

  // ---------------------------------------------------------------------------
  // CIRCULATION (LOANS)
  // ---------------------------------------------------------------------------
  async issueLoan(tenantId: string, schoolId: string, campusId: string | undefined, issuedById: string, dto: IssueLoanDto) {
    // 1. Service validation for Borrower Invariants
    if (dto.borrowerType === BorrowerTypeDto.STUDENT) {
      if (!dto.studentId) {
        throw new BadRequestException("Student loan requires studentId.");
      }
      if (dto.staffProfileId) {
        throw new BadRequestException("Student loan forbids staffProfileId.");
      }
    } else if (dto.borrowerType === BorrowerTypeDto.STAFF) {
      if (!dto.staffProfileId) {
        throw new BadRequestException("Staff loan requires staffProfileId.");
      }
      if (dto.studentId) {
        throw new BadRequestException("Staff loan forbids studentId.");
      }
    }

    // 2. Fetch BookItem and check availability
    const item = await this.prisma.bookItem.findFirst({
      where: { id: dto.bookItemId, tenantId, schoolId },
      include: { book: true },
    });
    if (!item) {
      throw new NotFoundException("Book copy not found.");
    }
    if (item.status !== "AVAILABLE") {
      throw new BadRequestException(`Book copy (Asset: ${item.assetTag}) is currently ${item.status} and cannot be issued.`);
    }

    // 3. Fetch Policy and check limit
    const policy = await this.prisma.libraryPolicy.findUnique({
      where: { tenantId_schoolId_borrowerType: { tenantId, schoolId, borrowerType: dto.borrowerType } },
    });
    const maxAllowed = policy ? policy.maxBooksAllowed : 3;
    const durationDays = policy ? policy.loanDurationDays : 14;

    const activeLoanCount = await this.prisma.bookLoan.count({
      where: {
        tenantId,
        schoolId,
        borrowerType: dto.borrowerType,
        studentId: dto.borrowerType === BorrowerTypeDto.STUDENT ? dto.studentId : undefined,
        staffProfileId: dto.borrowerType === BorrowerTypeDto.STAFF ? dto.staffProfileId : undefined,
        status: { in: ["ISSUED", "OVERDUE"] },
      },
    });

    if (activeLoanCount >= maxAllowed) {
      throw new BadRequestException(`Borrower has reached the maximum allowed book loan limit (${maxAllowed} books).`);
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + durationDays);

    return this.prisma.$transaction(async (tx) => {
      // Update item status
      await tx.bookItem.update({
        where: { id: item.id },
        data: { status: "BORROWED" },
      });

      // Recalculate available copies
      const availableCount = await tx.bookItem.count({ where: { bookId: item.bookId, status: "AVAILABLE" } });
      await tx.book.update({
        where: { id: item.bookId },
        data: { availableCopies: availableCount },
      });

      // Create Loan
      const loan = await tx.bookLoan.create({
        data: {
          tenantId,
          schoolId,
          campusId: dto.campusId ?? item.campusId,
          bookItemId: item.id,
          borrowerType: dto.borrowerType,
          studentId: dto.borrowerType === BorrowerTypeDto.STUDENT ? dto.studentId : null,
          staffProfileId: dto.borrowerType === BorrowerTypeDto.STAFF ? dto.staffProfileId : null,
          issuedById,
          dueDate,
          notes: dto.notes,
          status: "ISSUED",
        },
        include: {
          bookItem: { include: { book: true } },
          student: true,
          staffProfile: true,
        },
      });

      await tx.libraryAuditLog.create({
        data: {
          tenantId,
          schoolId,
          userId: issuedById,
          action: "LOAN_ISSUED",
          details: { loanId: loan.id, bookItemId: item.id, borrowerType: dto.borrowerType, dueDate },
        },
      });

      return loan;
    });
  }

  async returnLoan(tenantId: string, schoolId: string, loanId: string, returnedById: string, dto: ReturnLoanDto) {
    const loan = await this.prisma.bookLoan.findFirst({
      where: { id: loanId, tenantId, schoolId },
      include: { bookItem: true },
    });
    if (!loan) {
      throw new NotFoundException("Loan record not found.");
    }
    if (loan.status === "RETURNED") {
      throw new BadRequestException("This loan has already been returned.");
    }
    if (loan.status === "LOST") {
      throw new BadRequestException("This loan is marked as lost and cannot be checked in directly.");
    }

    const now = new Date();
    let fineAmount = new Prisma.Decimal(0);

    // Calculate overdue fine if applicable
    if (now > loan.dueDate) {
      const policy = await this.prisma.libraryPolicy.findUnique({
        where: { tenantId_schoolId_borrowerType: { tenantId, schoolId, borrowerType: loan.borrowerType } },
      });
      if (policy) {
        const diffMs = now.getTime() - loan.dueDate.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const chargeableDays = Math.max(0, diffDays - policy.gracePeriodDays);
        if (chargeableDays > 0) {
          const rawFine = Number(policy.finePerDay) * chargeableDays;
          const maxFine = Number(policy.maxFineAmount);
          const finalFine = maxFine > 0 ? Math.min(rawFine, maxFine) : rawFine;
          fineAmount = new Prisma.Decimal(finalFine);
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.bookItem.update({
        where: { id: loan.bookItemId },
        data: { status: "AVAILABLE" },
      });

      const updatedLoan = await tx.bookLoan.update({
        where: { id: loanId },
        data: {
          status: "RETURNED",
          returnedAt: now,
          fineAmount,
          notes: dto.notes ? `${loan.notes ?? ''}\n[Return Notes]: ${dto.notes}` : loan.notes,
        },
        include: {
          bookItem: { include: { book: true } },
          student: true,
          staffProfile: true,
        },
      });

      const availableCount = await tx.bookItem.count({ where: { bookId: loan.bookItem.bookId, status: "AVAILABLE" } });
      await tx.book.update({
        where: { id: loan.bookItem.bookId },
        data: { availableCopies: availableCount },
      });

      await tx.libraryAuditLog.create({
        data: {
          tenantId,
          schoolId,
          userId: returnedById,
          action: "LOAN_RETURNED",
          details: { loanId, fineAmount: fineAmount.toString() },
        },
      });

      return updatedLoan;
    });
  }

  async markLost(tenantId: string, schoolId: string, loanId: string, markedById: string, dto: MarkLostDto) {
    const loan = await this.prisma.bookLoan.findFirst({
      where: { id: loanId, tenantId, schoolId },
      include: { bookItem: { include: { book: true } } },
    });
    if (!loan) {
      throw new NotFoundException("Loan record not found.");
    }
    if (loan.status === "RETURNED" || loan.status === "LOST") {
      throw new BadRequestException(`Loan is already ${loan.status}.`);
    }

    const fineAmount = new Prisma.Decimal(dto.replacementFee);

    return this.prisma.$transaction(async (tx) => {
      let invoiceId = loan.invoiceId;

      // Create Finance invoice for lost book replacement if borrower is a student and invoice not already created
      if (!invoiceId && loan.studentId) {
        // Resolve active academic year and term
        const activeTerm = await tx.term.findFirst({
          where: { tenantId, academicYear: { schoolId } },
          orderBy: { startDate: "desc" },
        });

        if (activeTerm) {
          const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
          const randStr = Math.random().toString(36).substring(2, 7).toUpperCase();
          const invoiceNumber = `LIB-LOST-${dateStr}-${randStr}`;

          const invoice = await tx.invoice.create({
            data: {
              tenantId,
              schoolId,
              studentId: loan.studentId!,
              academicYearId: activeTerm.academicYearId,
              termId: activeTerm.id,
              invoiceNumber,
              totalAmount: fineAmount,
              dueDate: new Date(Date.now() + 14 * 86400000),
              status: "ISSUED",
              notes: `Library Lost Book Replacement Fee for '${loan.bookItem.book.title}' (Asset Tag: ${loan.bookItem.assetTag})`,
              lineItems: {
                create: [
                  {
                    name: `Lost Book Replacement: ${loan.bookItem.book.title} (Asset Tag: ${loan.bookItem.assetTag})`,
                    amount: fineAmount,
                  },
                ],
              },
            },
          });
          invoiceId = invoice.id;
        }
      }

      await tx.bookItem.update({
        where: { id: loan.bookItemId },
        data: { status: "LOST" },
      });

      const updatedLoan = await tx.bookLoan.update({
        where: { id: loanId },
        data: {
          status: "LOST",
          returnedAt: new Date(),
          fineAmount,
          invoiceId,
          notes: dto.notes ? `${loan.notes ?? ''}\n[Lost Notes]: ${dto.notes}` : loan.notes,
        },
        include: {
          bookItem: { include: { book: true } },
          student: true,
          staffProfile: true,
        },
      });

      const availableCount = await tx.bookItem.count({ where: { bookId: loan.bookItem.bookId, status: "AVAILABLE" } });
      await tx.book.update({
        where: { id: loan.bookItem.bookId },
        data: { availableCopies: availableCount },
      });

      await tx.libraryAuditLog.create({
        data: {
          tenantId,
          schoolId,
          userId: markedById,
          action: "LOAN_MARKED_LOST",
          details: { loanId, fineAmount: fineAmount.toString(), invoiceId },
        },
      });

      return updatedLoan;
    });
  }

  async billOverdueFine(tenantId: string, schoolId: string, loanId: string, billedById: string, dto: BillFineDto) {
    const loan = await this.prisma.bookLoan.findFirst({
      where: { id: loanId, tenantId, schoolId },
      include: { bookItem: { include: { book: true } } },
    });
    if (!loan) {
      throw new NotFoundException("Loan record not found.");
    }

    // Idempotency: If invoice already created, return existing loan
    if (loan.invoiceId) {
      return { loan, invoiceId: loan.invoiceId, message: "Invoice already generated for this loan fine." };
    }

    if (!loan.studentId) {
      throw new BadRequestException("Automated invoice generation currently supports student borrowers only.");
    }

    const fineAmount = new Prisma.Decimal(dto.fineAmount);

    return this.prisma.$transaction(async (tx) => {
      const activeTerm = await tx.term.findFirst({
        where: { tenantId, academicYear: { schoolId } },
        orderBy: { startDate: "desc" },
      });

      if (!activeTerm) {
        throw new BadRequestException("No academic term found to attach finance invoice.");
      }

      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      const randStr = Math.random().toString(36).substring(2, 7).toUpperCase();
      const invoiceNumber = `LIB-FINE-${dateStr}-${randStr}`;

      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          schoolId,
          studentId: loan.studentId!,
          academicYearId: activeTerm.academicYearId,
          termId: activeTerm.id,
          invoiceNumber,
          totalAmount: fineAmount,
          dueDate: new Date(Date.now() + 14 * 86400000),
          status: "ISSUED",
          notes: `Library Overdue Fine for '${loan.bookItem.book.title}'`,
          lineItems: {
            create: [
              {
                name: `Library Overdue Fine: ${loan.bookItem.book.title}`,
                amount: fineAmount,
              },
            ],
          },
        },
      });

      const updatedLoan = await tx.bookLoan.update({
        where: { id: loanId },
        data: {
          fineAmount,
          invoiceId: invoice.id,
        },
        include: { bookItem: { include: { book: true } }, student: true },
      });

      await tx.libraryAuditLog.create({
        data: {
          tenantId,
          schoolId,
          userId: billedById,
          action: "LOAN_FINE_BILLED",
          details: { loanId, fineAmount: fineAmount.toString(), invoiceId: invoice.id },
        },
      });

      return { loan: updatedLoan, invoiceId: invoice.id, message: "Invoice generated successfully." };
    });
  }

  async getLoans(tenantId: string, schoolId: string, query: QueryLoanDto) {
    const where: Prisma.BookLoanWhereInput = { tenantId, schoolId };
    if (query.status) where.status = query.status as any;
    if (query.borrowerType) where.borrowerType = query.borrowerType as any;
    if (query.studentId) where.studentId = query.studentId;
    if (query.staffProfileId) where.staffProfileId = query.staffProfileId;
    if (query.campusId) where.campusId = query.campusId;

    return this.prisma.bookLoan.findMany({
      where,
      include: {
        bookItem: { include: { book: true, campus: true } },
        student: true,
        staffProfile: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // ---------------------------------------------------------------------------
  // STUDENT PORTAL (ZERO-TRUST identity derivation from User -> Student)
  // ---------------------------------------------------------------------------
  async getStudentLoans(tenantId: string, userId: string) {
    return tenantContext.run({ tenantId }, async () => {
      const student = await this.prisma.student.findFirst({
        where: { userId, tenantId },
      });
      if (!student) {
        throw new UnauthorizedException("User is not associated with an active student profile.");
      }

      return this.prisma.bookLoan.findMany({
        where: { tenantId, studentId: student.id },
        include: {
          bookItem: { include: { book: true, campus: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    });
  }
}
