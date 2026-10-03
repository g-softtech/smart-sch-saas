import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ModuleKey } from "@saas/core-platform";
import { JwtAuthGuard } from "../identity/security/jwt-auth.guard";
import { PoliciesGuard } from "../identity/security/policies.guard";
import { RequirePermission } from "../identity/security/require-permission.decorator";
import { ModuleEntitlementGuard } from "../entitlements/guards/module-entitlement.guard";
import { RequireModule } from "../entitlements/decorators/require-module.decorator";
import { WorkspaceContextInterceptor } from "../identity/interceptors/workspace-context.interceptor";
import { LibraryService } from "./library.service";
import { CreateBookCategoryDto } from "./dto/category.dto";
import { CreateBookDto, QueryBookDto } from "./dto/book.dto";
import { AddBookItemDto, UpdateBookItemStatusDto } from "./dto/book-item.dto";
import { UpsertPolicyDto } from "./dto/policy.dto";
import { IssueLoanDto, ReturnLoanDto, MarkLostDto, BillFineDto, QueryLoanDto } from "./dto/loan.dto";

@ApiTags("Library Management")
@Controller(["api/v1/library", "v1/library"])
@UseGuards(JwtAuthGuard, ModuleEntitlementGuard, PoliciesGuard)
@RequireModule(ModuleKey.LIBRARY)
@UseInterceptors(WorkspaceContextInterceptor)
export class LibraryController {
  constructor(private readonly service: LibraryService) {}

  private extractContext(req: any) {
    const tenantId = req.workspace?.tenantId;
    const schoolId = req.workspace?.schoolId;
    const campusId = req.workspace?.campusId;
    const userId = req.user?.id;
    return { tenantId, schoolId, campusId, userId };
  }

  // ---------------------------------------------------------------------------
  // CATEGORIES
  // ---------------------------------------------------------------------------
  @Post("categories")
  @RequirePermission("library:manage_catalog")
  @ApiOperation({ summary: "Create a book category" })
  async createCategory(@Req() req: any, @Body() dto: CreateBookCategoryDto) {
    const { tenantId, schoolId } = this.extractContext(req);
    return this.service.createCategory(tenantId, schoolId, dto);
  }

  @Get("categories")
  @RequirePermission("library:read_catalog")
  @ApiOperation({ summary: "List book categories" })
  async getCategories(@Req() req: any) {
    const { tenantId, schoolId } = this.extractContext(req);
    return this.service.getCategories(tenantId, schoolId);
  }

  // ---------------------------------------------------------------------------
  // BOOKS (CATALOG)
  // ---------------------------------------------------------------------------
  @Post("books")
  @RequirePermission("library:manage_catalog")
  @ApiOperation({ summary: "Create a book catalog record" })
  async createBook(@Req() req: any, @Body() dto: CreateBookDto) {
    const { tenantId, schoolId } = this.extractContext(req);
    return this.service.createBook(tenantId, schoolId, dto);
  }

  @Get("books")
  @RequirePermission("library:read_catalog")
  @ApiOperation({ summary: "List book catalog records" })
  async getBooks(@Req() req: any, @Query() query: QueryBookDto) {
    const { tenantId, schoolId } = this.extractContext(req);
    return this.service.getBooks(tenantId, schoolId, query);
  }

  @Get("books/:id")
  @RequirePermission("library:read_catalog")
  @ApiOperation({ summary: "Get book details and physical copies" })
  async getBookDetails(@Req() req: any, @Param("id") id: string) {
    const { tenantId, schoolId } = this.extractContext(req);
    return this.service.getBookDetails(tenantId, schoolId, id);
  }

  // ---------------------------------------------------------------------------
  // BOOK ITEMS (PHYSICAL INVENTORY)
  // ---------------------------------------------------------------------------
  @Post("items")
  @RequirePermission("library:manage_catalog")
  @ApiOperation({ summary: "Add a physical copy (BookItem) of a book" })
  async addBookItem(@Req() req: any, @Body() dto: AddBookItemDto) {
    const { tenantId, schoolId, campusId } = this.extractContext(req);
    return this.service.addBookItem(tenantId, schoolId, {
      ...dto,
      campusId: dto.campusId ?? campusId,
    });
  }

  @Patch("items/:id/status")
  @RequirePermission("library:manage_catalog")
  @ApiOperation({ summary: "Update physical copy status (e.g. maintenance)" })
  async updateBookItemStatus(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateBookItemStatusDto) {
    const { tenantId, schoolId } = this.extractContext(req);
    return this.service.updateBookItemStatus(tenantId, schoolId, id, dto);
  }

  // ---------------------------------------------------------------------------
  // POLICIES
  // ---------------------------------------------------------------------------
  @Post("policies")
  @RequirePermission("library:manage_policies")
  @ApiOperation({ summary: "Configure borrowing policy for borrower type" })
  async upsertPolicy(@Req() req: any, @Body() dto: UpsertPolicyDto) {
    const { tenantId, schoolId } = this.extractContext(req);
    return this.service.upsertPolicy(tenantId, schoolId, dto);
  }

  @Get("policies")
  @RequirePermission("library:read_catalog")
  @ApiOperation({ summary: "List borrowing policies" })
  async getPolicies(@Req() req: any) {
    const { tenantId, schoolId } = this.extractContext(req);
    return this.service.getPolicies(tenantId, schoolId);
  }

  // ---------------------------------------------------------------------------
  // CIRCULATION (LOANS)
  // ---------------------------------------------------------------------------
  @Post("loans/issue")
  @RequirePermission("library:manage_loans")
  @ApiOperation({ summary: "Issue a book loan to student or staff" })
  async issueLoan(@Req() req: any, @Body() dto: IssueLoanDto) {
    const { tenantId, schoolId, campusId, userId } = this.extractContext(req);
    return this.service.issueLoan(tenantId, schoolId, campusId, userId, dto);
  }

  @Post("loans/:id/return")
  @RequirePermission("library:manage_loans")
  @ApiOperation({ summary: "Process loan return" })
  async returnLoan(@Req() req: any, @Param("id") id: string, @Body() dto: ReturnLoanDto) {
    const { tenantId, schoolId, userId } = this.extractContext(req);
    return this.service.returnLoan(tenantId, schoolId, id, userId, dto);
  }

  @Post("loans/:id/mark-lost")
  @RequirePermission("library:manage_loans")
  @ApiOperation({ summary: "Mark borrowed copy as lost and issue fine/invoice" })
  async markLost(@Req() req: any, @Param("id") id: string, @Body() dto: MarkLostDto) {
    const { tenantId, schoolId, userId } = this.extractContext(req);
    return this.service.markLost(tenantId, schoolId, id, userId, dto);
  }

  @Post("loans/:id/bill-fine")
  @RequirePermission("library:manage_loans")
  @ApiOperation({ summary: "Bill overdue fine as a finance invoice (idempotent)" })
  async billOverdueFine(@Req() req: any, @Param("id") id: string, @Body() dto: BillFineDto) {
    const { tenantId, schoolId, userId } = this.extractContext(req);
    return this.service.billOverdueFine(tenantId, schoolId, id, userId, dto);
  }

  @Get("loans")
  @RequirePermission("library:read_loans")
  @ApiOperation({ summary: "List loans across borrowers" })
  async getLoans(@Req() req: any, @Query() query: QueryLoanDto) {
    const { tenantId, schoolId, campusId } = this.extractContext(req);
    return this.service.getLoans(tenantId, schoolId, {
      ...query,
      campusId: query.campusId ?? campusId,
    });
  }

  // ---------------------------------------------------------------------------
  // STUDENT PORTAL (Zero-Trust)
  // ---------------------------------------------------------------------------
  @Get("student/my-loans")
  @ApiOperation({ summary: "Get authenticated student's active and historical loans" })
  async getStudentLoans(@Req() req: any) {
    const { tenantId, userId } = this.extractContext(req);
    return this.service.getStudentLoans(tenantId, userId);
  }
}
