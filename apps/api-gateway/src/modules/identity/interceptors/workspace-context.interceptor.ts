import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Observable } from "rxjs";

import { TenantMembershipRepository } from "../repositories/tenant-membership.repository";

@Injectable()
export class WorkspaceContextInterceptor implements NestInterceptor {
  constructor(private readonly membershipRepo: TenantMembershipRepository) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard

    // Obtain requested tenant from selector
    const tenantId = request.headers["x-tenant-id"] as string;

    if (!user || !user.sub) {
      throw new UnauthorizedException("Authentication required");
    }

    if (!tenantId) {
      // Reject missing tenant selector on tenant-scoped requests
      throw new BadRequestException("Missing x-tenant-id header");
    }

    const { tenantContext, kernel } = require("@saas/core-platform");

    // Verify Tenant Membership to prevent cross-tenant pollution
    try {
      const membership = await tenantContext.run({ tenantId }, () =>
        this.membershipRepo.findByUserId(user.sub, tenantId),
      );
      if (!membership) {
        throw new ForbiddenException(
          "User does not have access to this tenant workspace",
        );
      }

      let validatedSchoolId: string | undefined = undefined;
      let validatedCampusId: string | undefined = undefined;
      const requestedSchoolId = request.headers["x-school-id"] as string;
      const requestedCampusId = request.headers["x-campus-id"] as string;

      if (requestedSchoolId) {
        await tenantContext.run({ tenantId }, async () => {
          // 1. Validate physical school existence within the tenant
          const school = await kernel.db.school.findFirst({
            where: { id: requestedSchoolId, tenantId: membership.tenantId },
          });

          if (!school) {
            throw new ForbiddenException(
              "Invalid or unauthorized school workspace",
            );
          }

          // 2. Validate physical campus existence if requested
          if (requestedCampusId) {
            const campus = await kernel.db.campus.findFirst({
              where: {
                id: requestedCampusId,
                schoolId: requestedSchoolId,
                tenantId: membership.tenantId,
              },
            });
            if (!campus) {
              throw new ForbiddenException(
                "Invalid or unauthorized campus workspace",
              );
            }
          }

          const isSuperAdmin = membership.role?.name === "SUPER_ADMIN";

          // 3. Enforce UserSchoolAccess for non-SUPER_ADMIN
          if (!isSuperAdmin) {
            const accessRecord = await kernel.db.userSchoolAccess.findFirst({
              where: { userId: user.sub, schoolId: requestedSchoolId },
            });

            if (!accessRecord) {
              throw new ForbiddenException(
                "User is not assigned to this school",
              );
            }

            // If the user has a restricted campus, enforce it
            if (accessRecord.campusId) {
              if (
                requestedCampusId &&
                requestedCampusId !== accessRecord.campusId
              ) {
                throw new ForbiddenException(
                  "User is not assigned to the requested campus",
                );
              }
              // Override/inject the restricted campus into the workspace context
              validatedCampusId = accessRecord.campusId;
            } else {
              // User has full school access
              validatedCampusId = requestedCampusId;
            }
          } else {
            // SUPER_ADMIN has full access
            validatedCampusId = requestedCampusId;
          }

          validatedSchoolId = school.id;
        });
      }

      request.workspace = {
        membershipId: membership.id,
        roleId: membership.roleId,
        tenantId: membership.tenantId,
        schoolId: validatedSchoolId,
        campusId: validatedCampusId,
      };

      return new Observable((subscriber) => {
        tenantContext.run({ tenantId }, () => {
          next.handle().subscribe(subscriber);
        });
      });
    } catch (error) {
      console.error("INTERCEPTOR ERROR:", error);
      throw error;
    }
  }
}
