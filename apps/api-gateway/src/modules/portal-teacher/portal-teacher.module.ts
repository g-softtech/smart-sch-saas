import { Module } from "@nestjs/common";
import { TeacherPortalController } from "./controllers/teacher-portal.controller";
import { TeacherPortalService } from "./services/teacher-portal.service";
import { StaffModule } from "../staff/staff.module";

@Module({
  imports: [StaffModule],
  controllers: [TeacherPortalController],
  providers: [TeacherPortalService],
  exports: [TeacherPortalService],
})
export class PortalTeacherModule {}
