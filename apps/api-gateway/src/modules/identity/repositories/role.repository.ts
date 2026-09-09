import { Injectable } from '@nestjs/common';
import { kernel } from '@saas/core-platform';
import { Role } from '@saas/core-platform';

@Injectable()
export class RoleRepository {
  async findById(id: string, tenantId: string): Promise<Role | null> {
    // Note: Since Role is TENANT_SCOPED, kernel.db automatically intercepts and applies the tenant isolation
    // provided that the tenantContext is set up correctly in the interceptor.
    // However, to be strictly robust in this lookup, we can query it directly including permissions.
    return kernel.db.role.findFirst({
      where: { id, tenantId },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });
  }
}
