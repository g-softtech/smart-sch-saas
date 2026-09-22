import { Controller, Post, Body, Req, BadRequestException, Get, Param, Patch } from "@nestjs/common";
import { PickupAuthorizationService } from "../services/pickup-authorization.service";
import { kernel } from "@saas/core-platform";

interface CreatePickupAuthorizationDto {
  studentId: string;
  guardianId: string;
  validFrom: string; // ISO date string
  validUntil?: string | null; // ISO date string
}

@Controller("api/v1/movement/pickup-authorizations")
export class PickupAuthorizationController {
  constructor(private readonly pickupAuthorizationService: PickupAuthorizationService) {}

  @Post()
  async createAuthorization(@Req() req: any, @Body() dto: CreatePickupAuthorizationDto) {
    const { tenantId, schoolId } = req.workspace;
    const operatorId = req.user.sub;

    if (!schoolId) {
      throw new BadRequestException("School context is required");
    }

    if (!dto.studentId || !dto.guardianId || !dto.validFrom) {
      throw new BadRequestException("studentId, guardianId, and validFrom are required");
    }

    return this.pickupAuthorizationService.createAuthorization(
      tenantId,
      schoolId,
      dto.studentId,
      dto.guardianId,
      new Date(dto.validFrom),
      dto.validUntil ? new Date(dto.validUntil) : null,
      operatorId
    );
  }

  @Patch(":authId/revoke")
  async revokeAuthorization(
    @Req() req: any,
    @Param("authId") authId: string
  ) {
    const { tenantId, schoolId } = req.workspace;
    const operatorId = req.user.sub;

    if (!schoolId) {
      throw new BadRequestException("School context is required");
    }

    return this.pickupAuthorizationService.revokeAuthorization(
      tenantId,
      schoolId,
      authId,
      operatorId
    );
  }

  @Get("student/:studentId")
  async getAuthorizations(@Req() req: any, @Param("studentId") studentId: string) {
    const { tenantId, schoolId } = req.workspace;

    // Direct prisma call for simple read
    return kernel.db.pickupAuthorization.findMany({
      where: { tenantId, schoolId, studentId },
      include: {
        guardian: true,
      },
      orderBy: { createdAt: "desc" }
    });
  }
}
