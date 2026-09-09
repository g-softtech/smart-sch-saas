import { Injectable } from '@nestjs/common';
import { kernel } from '@saas/core-platform';
import { UserTenantMembership } from '@saas/core-platform';

@Injectable()
export class TenantMembershipRepository {
  async findByUserId(userId: string, tenantId: string): Promise<UserTenantMembership | null> {
    return kernel.db.userTenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId
        }
      }
    });
  }
}
