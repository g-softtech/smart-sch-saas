import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PortalAccountService } from "../services/portal-account.service";
import {
  ProvisionStudentPortalDto,
  ProvisionGuardianPortalDto,
  ActivateAccountDto,
} from "../dto/portal-account.dto";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { UseInterceptors } from "@nestjs/common";

@ApiTags("Portal Account Management")
@Controller("api/v1/portal/account")
export class PortalAccountController {
  constructor(private readonly portalAccountService: PortalAccountService) {}

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

  @Post("activate")
  @HttpCode(200)
  @ApiOperation({ summary: "Activate portal account using single-use activation token" })
  async activate(@Body() dto: ActivateAccountDto) {
    return this.portalAccountService.activateAccount(dto);
  }
}
