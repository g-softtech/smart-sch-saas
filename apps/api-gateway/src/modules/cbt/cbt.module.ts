import { Module } from "@nestjs/common";
import { CBTAttemptService } from "./services/cbt-attempt.service";
import { StudentPortalCBTController } from "./controllers/student-portal-cbt.controller";

@Module({
  controllers: [StudentPortalCBTController],
  providers: [CBTAttemptService],
  exports: [CBTAttemptService],
})
export class CBTModule {}
