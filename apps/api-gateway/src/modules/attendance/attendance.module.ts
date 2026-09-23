import { Module } from "@nestjs/common";
import { AttendanceController } from "./controllers/attendance.controller";
import { AttendanceService } from "./services/attendance.service";
import { AttendanceRepository } from "./repositories/attendance.repository";
import { ArrivalController } from "./controllers/arrival.controller";
import { ArrivalService } from "./services/arrival.service";
import { IdCardsModule } from "../id-cards/id-cards.module";
import { IdempotencyService, OutboxService } from "@saas/core-platform";
import { AttendanceIntegrationService } from "./services/attendance-integration.service";
import { AcademicsModule } from "../academics/academics.module";

@Module({
  imports: [IdCardsModule, AcademicsModule],
  controllers: [AttendanceController, ArrivalController],
  providers: [AttendanceService, AttendanceRepository, ArrivalService, OutboxService, IdempotencyService, AttendanceIntegrationService],
  exports: [AttendanceService, ArrivalService],
})
export class AttendanceModule {}
