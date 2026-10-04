import { Module, Global } from "@nestjs/common";
import { AuditService, AuditMaskingService, AuditRetentionPolicy } from "@saas/core-platform";

@Global()
@Module({
  providers: [AuditService, AuditMaskingService, AuditRetentionPolicy],
  exports: [AuditService],
})
export class AuditModule {}
