import { Module } from "@nestjs/common";
import { AttendanceController } from "./controllers/attendance.controller";
import { AttendanceService } from "./services/attendance.service";
import { AttendanceRepository } from "./repositories/attendance.repository";
import { OutboxService } from "@saas/core-platform";

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository, OutboxService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
