import { Injectable, NestInterceptor, ExecutionContext, CallHandler, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantContext } from '@saas/core-platform';
import { TenantMembershipRepository } from '../repositories/tenant-membership.repository';

@Injectable()
export class WorkspaceContextInterceptor implements NestInterceptor {
  constructor(private readonly membershipRepo: TenantMembershipRepository) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard
    
    // Obtain requested tenant from selector
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!user || !user.sub) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!tenantId) {
      // Reject missing tenant selector on tenant-scoped requests
      throw new BadRequestException('Missing x-tenant-id header');
    }

    // Verify Tenant Membership to prevent cross-tenant pollution
    // Query UserTenantMembership using BOTH userId and tenantId
    // We must run this inside the requested context so PlatformKernel allows the query.
    return new Observable((subscriber) => {
      tenantContext.run({ tenantId }, () => {
        this.membershipRepo.findByUserId(user.sub, tenantId).then((membership) => {
          if (!membership) {
            // Reject with ForbiddenException when membership does not exist
            subscriber.error(new ForbiddenException('User does not have access to this tenant workspace'));
            return;
          }
          
          // Store the verified roles/permissions on the request object for RBAC guards to use later
          request.workspace = {
            membershipId: membership.id,
            roleId: membership.roleId,
            tenantId: membership.tenantId
          };

          next.handle().subscribe(subscriber);
        }).catch(err => subscriber.error(err));
      });
    });
  }
}
