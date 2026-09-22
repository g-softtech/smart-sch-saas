import { Controller, Post, Body, Req, BadRequestException, Get, Param, Patch } from "@nestjs/common";
import { GuardianCredentialService } from "../services/guardian-credential.service";
import { kernel } from "@saas/core-platform";

interface IssueGuardianCredentialDto {
  guardianId: string;
}

interface RevokeGuardianCredentialDto {
  reason: string;
}

@Controller("api/v1/movement/guardian-credentials")
export class GuardianCredentialController {
  constructor(private readonly guardianCredentialService: GuardianCredentialService) {}

  @Post("issue")
  async issueCredential(@Req() req: any, @Body() dto: IssueGuardianCredentialDto) {
    const { tenantId, schoolId } = req.workspace;
    const operatorId = req.user.sub;

    if (!schoolId) {
      throw new BadRequestException("School context is required");
    }

    // Verify guardian is legitimately associated with the active school
    const link = await kernel.db.studentGuardian.findFirst({
      where: {
        guardianId: dto.guardianId,
        tenantId,
        student: { schoolId }
      }
    });
    if (!link) throw new BadRequestException("Guardian is not authorized in this school");

    return this.guardianCredentialService.issueCredential(
      tenantId,
      dto.guardianId,
      operatorId
    );
  }

  @Patch(":credentialId/revoke")
  async revokeCredential(
    @Req() req: any,
    @Param("credentialId") credentialId: string,
    @Body() dto: RevokeGuardianCredentialDto
  ) {
    const { tenantId, schoolId } = req.workspace;
    const operatorId = req.user.sub;

    if (!schoolId) {
      throw new BadRequestException("School context is required");
    }

    // Must verify the credential belongs to a guardian in THIS school
    const credential = await kernel.db.guardianCredential.findFirst({
      where: { id: credentialId, tenantId }
    });
    if (!credential) throw new BadRequestException("Credential not found");

    const link = await kernel.db.studentGuardian.findFirst({
      where: {
        guardianId: credential.guardianId,
        tenantId,
        student: { schoolId }
      }
    });
    if (!link) throw new BadRequestException("Guardian is not authorized in this school");

    return this.guardianCredentialService.revokeCredential(
      tenantId,
      credentialId,
      operatorId
    );
  }

  @Get("guardian/:guardianId")
  async getCredentials(@Req() req: any, @Param("guardianId") guardianId: string) {
    const { tenantId, schoolId } = req.workspace;

    if (!schoolId) {
      throw new BadRequestException("School context is required");
    }

    // Verify school linkage
    const link = await kernel.db.studentGuardian.findFirst({
      where: {
        guardianId,
        tenantId,
        student: { schoolId }
      }
    });
    if (!link) throw new BadRequestException("Guardian is not authorized in this school");

    return kernel.db.guardianCredential.findMany({
      where: { tenantId, guardianId },
      orderBy: { issuedAt: "desc" }
    });
  }
}
