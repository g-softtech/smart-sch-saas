import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  UseInterceptors,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { PortalAccountService } from "../services/portal-account.service";
import {
  ProvisionStudentPortalDto,
  ProvisionGuardianPortalDto,
  ProvisionStaffPortalDto,
  ActivateAccountDto,
} from "../dto/portal-account.dto";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";

@ApiTags("Portal Account Management")
@Controller("api/v1/portal/account")
export class PortalAccountController {
  constructor(private readonly portalAccountService: PortalAccountService) {}

  @Get("validate-token")
  @ApiOperation({ summary: "Validate activation token and fetch recipient info" })
  async validateToken(@Query("token") token: string) {
    return this.portalAccountService.validateToken(token);
  }

  @Post("students/:studentId/provision")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceContextInterceptor)
  @ApiOperation({ summary: "Provision portal user account and activation token for a student" })
  async provisionStudent(
    @Param("studentId") studentId: string,
    @Body() dto: ProvisionStudentPortalDto,
    @Req() req: any
  ) {
    const tenantId = req.workspace.tenantId;
    const schoolId = req.workspace.schoolId;
    const createdById = req.user.sub;

    return this.portalAccountService.provisionStudentPortal(
      tenantId,
      schoolId,
      studentId,
      createdById,
      dto
    );
  }

  @Post("guardians/:guardianId/provision")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceContextInterceptor)
  @ApiOperation({ summary: "Provision portal user account and activation token for a guardian" })
  async provisionGuardian(
    @Param("guardianId") guardianId: string,
    @Body() dto: ProvisionGuardianPortalDto,
    @Req() req: any
  ) {
    const tenantId = req.workspace.tenantId;
    const schoolId = req.workspace.schoolId;
    const createdById = req.user.sub;

    return this.portalAccountService.provisionGuardianPortal(
      tenantId,
      schoolId,
      guardianId,
      createdById,
      dto
    );
  }

  @Post("staff/:staffId/provision")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceContextInterceptor)
  @ApiOperation({ summary: "Provision portal user account and activation token for a teacher/staff member" })
  async provisionStaff(
    @Param("staffId") staffId: string,
    @Body() dto: ProvisionStaffPortalDto,
    @Req() req: any
  ) {
    const tenantId = req.workspace.tenantId;
    const schoolId = req.workspace.schoolId;
    const createdById = req.user.sub;

    return this.portalAccountService.provisionStaffPortal(
      tenantId,
      schoolId,
      staffId,
      createdById,
      dto
    );
  }

  @Post("invitations/:id/resend")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceContextInterceptor)
  @ApiOperation({ summary: "Resend activation token for student, guardian, or staff" })
  async resendInvitation(
    @Param("id") targetId: string,
    @Query("type") targetType: "STUDENT" | "GUARDIAN" | "STAFF",
    @Req() req: any
  ) {
    const tenantId = req.workspace.tenantId;
    const schoolId = req.workspace.schoolId;
    const createdById = req.user.sub;

    return this.portalAccountService.resendInvitation(
      tenantId,
      schoolId,
      targetId,
      targetType || "STUDENT",
      createdById
    );
  }

  @Post("invitations/:id/revoke")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceContextInterceptor)
  @ApiOperation({ summary: "Revoke active portal invitation" })
  async revokeInvitation(
    @Param("id") targetId: string,
    @Query("type") targetType: "STUDENT" | "GUARDIAN" | "STAFF",
    @Req() req: any
  ) {
    const tenantId = req.workspace.tenantId;
    const schoolId = req.workspace.schoolId;

    return this.portalAccountService.revokeInvitation(
      tenantId,
      schoolId,
      targetId,
      targetType || "STUDENT"
    );
  }

  @Get("students/:studentId/invitation-status")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceContextInterceptor)
  @ApiOperation({ summary: "Fetch student portal invitation status" })
  async getStudentStatus(@Param("studentId") studentId: string, @Req() req: any) {
    const tenantId = req.workspace.tenantId;
    const schoolId = req.workspace.schoolId;

    return this.portalAccountService.getStudentInvitationStatus(tenantId, schoolId, studentId);
  }

  @Get("guardians/:guardianId/invitation-status")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceContextInterceptor)
  @ApiOperation({ summary: "Fetch guardian portal invitation status" })
  async getGuardianStatus(@Param("guardianId") guardianId: string, @Req() req: any) {
    const tenantId = req.workspace.tenantId;
    const schoolId = req.workspace.schoolId;

    return this.portalAccountService.getGuardianInvitationStatus(tenantId, schoolId, guardianId);
  }

  @Get("staff/:staffId/invitation-status")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceContextInterceptor)
  @ApiOperation({ summary: "Fetch staff portal invitation status" })
  async getStaffStatus(@Param("staffId") staffId: string, @Req() req: any) {
    const tenantId = req.workspace.tenantId;
    const schoolId = req.workspace.schoolId;

    return this.portalAccountService.getStaffInvitationStatus(tenantId, schoolId, staffId);
  }

  @Post("activate")
  @HttpCode(200)
  @ApiOperation({ summary: "Activate portal account using single-use activation token" })
  async activate(@Body() dto: ActivateAccountDto) {
    return this.portalAccountService.activateAccount(dto);
  }
}
