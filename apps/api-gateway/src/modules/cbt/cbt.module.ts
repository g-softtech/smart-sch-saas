import { Module } from "@nestjs/common";
import { CBTController } from "./controllers/cbt.controller";
import { CBTService } from "./services/cbt.service";
import { AcademicsModule } from "../academics/academics.module";

@Module({
  imports: [AcademicsModule],
  controllers: [CBTController],
  providers: [CBTService],
  exports: [CBTService],
})
export class CBTModule {}
