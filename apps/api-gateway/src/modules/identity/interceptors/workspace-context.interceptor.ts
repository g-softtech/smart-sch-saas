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

    if (!user || !user.sub) {
      throw new UnauthorizedException("Authentication required");
    }

    const { tenantContext, kernel, MembershipStatus, TenantStatus, GlobalRole } = require("@saas/core-platform");

    // Check if the user is a global platform SUPER_ADMIN
    const userRecord = await kernel.rawDb.user.findUnique({
      where: { id: user.sub },
    });

    if (!userRecord || !userRecord.isActive || userRecord.isSuspended) {
      throw new UnauthorizedException("Account is deactivated or suspended");
    }

    const isGlobalSuperAdmin = userRecord.globalRole === GlobalRole.SUPER_ADMIN;

    // Obtain requested tenant from header
    let tenantId = request.headers["x-tenant-id"] as string;

    if (!tenantId) {
      // Auto-discover tenant for user from active TenantMembership
      const membership = await kernel.rawDb.tenantMembership.findFirst({
        where: { userId: user.sub, status: MembershipStatus.ACTIVE },
        include: { tenant: true },
      });
      if (membership && membership.tenant.status === TenantStatus.ACTIVE) {
        tenantId = membership.tenantId;
        request.headers["x-tenant-id"] = tenantId;
      }
    }

    // If still no tenantId and user is NOT a global super admin, reject
    if (!tenantId && !isGlobalSuperAdmin) {
      throw new BadRequestException("Missing x-tenant-id header");
    }

    // If tenantId is specified, strictly enforce membership and tenant active status
    let validatedSchoolId: string | undefined = undefined;
    let validatedCampusId: string | undefined = undefined;
    let membershipId: string | undefined = undefined;

    if (tenantId) {
      // Verify tenant exists and is ACTIVE
      const tenant = await kernel.rawDb.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new ForbiddenException("Tenant workspace not found");
      }

      if (tenant.status === TenantStatus.SUSPENDED) {
        throw new ForbiddenException("Tenant organization is suspended");
      }

      // Unless global super admin, user MUST hold an ACTIVE membership in this tenant
      if (!isGlobalSuperAdmin) {
        const membership = await kernel.rawDb.tenantMembership.findFirst({
          where: {
            userId: user.sub,
            tenantId,
            status: MembershipStatus.ACTIVE,
          },
        });

        if (!membership) {
          throw new ForbiddenException("User does not have access to this tenant workspace");
        }
        membershipId = membership.id;
      }

      // Check optional schoolId header
      let requestedSchoolId = request.headers["x-school-id"] as string;
      const requestedCampusId = request.headers["x-campus-id"] as string;

      if (!requestedSchoolId) {
        // Auto-discover school from school records in this tenant
        const school = await kernel.rawDb.school.findFirst({
          where: { tenantId },
        });
        if (school) {
          requestedSchoolId = school.id;
          request.headers["x-school-id"] = requestedSchoolId;
        }
      }

      if (requestedSchoolId) {
        const school = await kernel.rawDb.school.findFirst({
          where: { id: requestedSchoolId, tenantId },
        });

        if (!school) {
          throw new ForbiddenException("Invalid or unauthorized school workspace");
        }
        validatedSchoolId = school.id;

        if (requestedCampusId) {
          const campus = await kernel.rawDb.campus.findFirst({
            where: { id: requestedCampusId, schoolId: validatedSchoolId, tenantId },
          });
          if (!campus) {
            throw new ForbiddenException("Invalid or unauthorized campus workspace");
          }
          validatedCampusId = campus.id;
        }
      }
    }

    request.workspace = {
      membershipId,
      tenantId,
      schoolId: validatedSchoolId,
      campusId: validatedCampusId,
      isGlobalSuperAdmin,
    };

    return new Observable((subscriber) => {
      tenantContext.run({ tenantId: tenantId || "" }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
