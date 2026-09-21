import { Injectable } from "@nestjs/common";
import { kernel } from "@saas/core-platform";
import { Tenant } from "@saas/core-platform";

@Injectable()
export class TenantRepository {
  async findById(id: string): Promise<Tenant | null> {
    return kernel.db.tenant.findUnique({
      where: { id },
    });
  }
}
