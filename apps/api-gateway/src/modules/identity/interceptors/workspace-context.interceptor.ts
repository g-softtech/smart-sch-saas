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
    return new Observable((subscriber) => {
      tenantContext.run({ tenantId }, () => {
        this.membershipRepo.findByUserId(user.sub, tenantId).then(async (membership) => {
          if (!membership) {
            subscriber.error(new ForbiddenException('User does not have access to this tenant workspace'));
            return;
          }
          
          let validatedSchoolId: string | undefined = undefined;
          const requestedSchoolId = request.headers['x-school-id'] as string;
          
          if (requestedSchoolId) {
            // Validate the school belongs to the authorized tenant
            const { kernel } = require('@saas/core-platform');
            const school = await kernel.db.school.findFirst({
              where: { id: requestedSchoolId, tenantId: membership.tenantId }
            });
            
            if (!school) {
              subscriber.error(new ForbiddenException('Invalid or unauthorized school workspace'));
              return;
            }
            validatedSchoolId = school.id;
          }

          request.workspace = {
            membershipId: membership.id,
            roleId: membership.roleId,
            tenantId: membership.tenantId,
            schoolId: validatedSchoolId
          };

          next.handle().subscribe(subscriber);
        }).catch(err => subscriber.error(err));
      });
    });
  }
}
