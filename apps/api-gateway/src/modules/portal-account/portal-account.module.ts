import { Module } from "@nestjs/common";
import { PortalAccountService } from "./services/portal-account.service";
import { PortalAccountController } from "./controllers/portal-account.controller";
import { IdentityModule } from "../identity/identity.module";

@Module({
  imports: [IdentityModule],
  controllers: [PortalAccountController],
  providers: [PortalAccountService],
  exports: [PortalAccountService],
})
export class PortalAccountModule {}
