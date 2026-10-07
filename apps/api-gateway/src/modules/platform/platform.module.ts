import { Module } from "@nestjs/common";
import { PlatformController } from "./controllers/platform.controller";
import { PlatformProvisioningController } from "./controllers/platform-provisioning.controller";
import { OnboardingService } from "./services/onboarding.service";
import { TenantLifecycleService } from "./services/tenant-lifecycle.service";
import { PlatformReadService } from "./services/platform-read.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [PlatformController, PlatformProvisioningController],
  providers: [OnboardingService, TenantLifecycleService, PlatformReadService],
})
export class PlatformModule {}
