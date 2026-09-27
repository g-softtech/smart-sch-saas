import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { MODULE_KEY } from "../decorators/require-module.decorator";
import { EntitlementsRepository } from "../repositories/entitlements.repository";
import { TenantMembershipRepository } from "../../identity/repositories/tenant-membership.repository";
import { ModuleKey, tenantContext, kernel } from "@saas/core-platform";
import { isModuleAvailableForSchool } from "../utils/entitlement-evaluator";

@Injectable()
export class ModuleEntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlementsRepo: EntitlementsRepository,
    private readonly membershipRepo: TenantMembershipRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<ModuleKey>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredModule) {
      return true; // Undecorated controllers are un-gated (Phase 1–5 core compatibility)
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    const tenantId = request.headers["x-tenant-id"] as string;
    const schoolId = request.headers["x-school-id"] as string;

    if (!userId) {
      throw new ForbiddenException("Authentication required");
    }

    if (!tenantId) {
      throw new BadRequestException("Missing x-tenant-id header");
    }

    return tenantContext.run({ tenantId }, async () => {
      const membership = await this.membershipRepo.findByUserId(userId, tenantId);
      if (!membership || membership.isRevoked || membership.state !== "ACTIVE") {
        throw new ForbiddenException("User does not have access to this tenant workspace");
      }

      const isSuperAdmin = membership.role?.name === "SUPER_ADMIN";

      if (schoolId) {
        const school = await kernel.db.school.findFirst({
          where: { id: schoolId, tenantId },
        });

        if (!school) {
          throw new ForbiddenException("Invalid or unauthorized school workspace");
        }

        if (!isSuperAdmin) {
          const schoolAccess = await kernel.db.userSchoolAccess.findFirst({
            where: { userId, schoolId },
          });

          if (!schoolAccess) {
            throw new ForbiddenException("User is not assigned to this school");
          }
        }
      }

      const entitlement = await this.entitlementsRepo.findTenantEntitlement(tenantId, requiredModule);
      const setting = schoolId
        ? await this.entitlementsRepo.findSchoolModuleSetting(tenantId, schoolId, requiredModule)
        : null;

      const { available, reason } = isModuleAvailableForSchool(entitlement, setting);

      if (!available) {
        if (reason === "MODULE_NOT_ENTITLED") {
          throw new ForbiddenException({
            statusCode: 403,
            error: "Forbidden",
            code: "MODULE_NOT_ENTITLED",
            message: `Module '${requiredModule}' is not commercially entitled for this tenant.`,
          });
        }
        throw new ForbiddenException({
          statusCode: 403,
          error: "Forbidden",
          code: "MODULE_DISABLED_AT_SCHOOL",
          message: `Module '${requiredModule}' is disabled for this school.`,
        });
      }

      if (!request.workspace) {
        request.workspace = {
          membershipId: membership.id,
          roleId: membership.roleId,
          tenantId: membership.tenantId,
          schoolId,
        };
      }

      return true;
    });
  }
}
