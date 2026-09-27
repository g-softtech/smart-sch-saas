import { Module } from "@nestjs/common";
import { ParentPortalController } from "./controllers/parent-portal.controller";
import { ParentPortalService } from "./services/parent-portal.service";

@Module({
  controllers: [ParentPortalController],
  providers: [ParentPortalService],
  exports: [ParentPortalService],
})
export class PortalParentModule {}
