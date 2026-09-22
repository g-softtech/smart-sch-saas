import { Module } from "@nestjs/common";
import { AttendanceController } from "./controllers/attendance.controller";
import { AttendanceService } from "./services/attendance.service";
import { AttendanceRepository } from "./repositories/attendance.repository";
import { ArrivalController } from "./controllers/arrival.controller";
import { ArrivalService } from "./services/arrival.service";
import { IdCardsModule } from "../id-cards/id-cards.module";
import { OutboxService } from "@saas/core-platform";

@Module({
  imports: [IdCardsModule],
  controllers: [AttendanceController, ArrivalController],
  providers: [AttendanceService, AttendanceRepository, ArrivalService, OutboxService],
  exports: [AttendanceService, ArrivalService],
})
export class AttendanceModule {}
