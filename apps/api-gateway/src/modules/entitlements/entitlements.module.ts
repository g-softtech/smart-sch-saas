import { Module } from "@nestjs/common";
import { EntitlementsRepository } from "./repositories/entitlements.repository";
import { EntitlementsService } from "./services/entitlements.service";
import { ModuleEntitlementGuard } from "./guards/module-entitlement.guard";
import { EntitlementsController } from "./controllers/entitlements.controller";
import { SchoolModuleSettingsController } from "./controllers/school-module-settings.controller";
import { IdentityModule } from "../identity/identity.module";

@Module({
  imports: [IdentityModule],
  controllers: [EntitlementsController, SchoolModuleSettingsController],
  providers: [EntitlementsRepository, EntitlementsService, ModuleEntitlementGuard],
  exports: [EntitlementsRepository, EntitlementsService, ModuleEntitlementGuard],
})
export class EntitlementsModule {}
