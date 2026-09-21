import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "./require-permission.decorator";
import { RoleRepository } from "../repositories/role.repository";

import { TenantMembershipRepository } from "../repositories/tenant-membership.repository";
import { tenantContext } from "@saas/core-platform";
import { BadRequestException } from "@nestjs/common";

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly roleRepo: RoleRepository,
    private readonly membershipRepo: TenantMembershipRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers["x-tenant-id"] as string;

    if (!tenantId) {
      throw new BadRequestException("Missing x-tenant-id header");
    }

    if (!request.user || !request.user.sub) {
      throw new ForbiddenException("Authentication required");
    }

    // Since Guards run before Interceptors, request.workspace might not be set yet.
    // We must verify the membership here if it's missing, using the scoped kernel bypass.
    if (!request.workspace) {
      const membership = await tenantContext.run({ tenantId }, () =>
        this.membershipRepo.findByUserId(request.user.sub, tenantId),
      );
      if (!membership) {
        throw new ForbiddenException(
          "User does not have access to this tenant workspace",
        );
      }
      request.workspace = {
        membershipId: membership.id,
        roleId: membership.roleId,
        tenantId: membership.tenantId,
      };
    }

    const roleId = request.workspace.roleId;

    // Resolve Permissions via Database Directly
    const role = await this.roleRepo.findById(roleId, tenantId);

    if (!role) {
      throw new ForbiddenException("Role not found.");
    }

    // The role relation returns { permissions: [{ permission: { name } }] }
    const userPermissions = (role as any).permissions.map(
      (rp: any) => rp.permission.name,
    );
    const isSuperAdmin = role.name === "SUPER_ADMIN";

    // Global override for super admin
    if (isSuperAdmin) {
      return true;
    }

    // Does the user's role contain ALL the required permissions?
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Missing required permissions: ${requiredPermissions.join(", ")}`,
      );
    }

    return true;
  }
}
