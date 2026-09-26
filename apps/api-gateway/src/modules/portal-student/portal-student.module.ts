import { Module } from "@nestjs/common";
import { StudentPortalController } from "./controllers/student-portal.controller";
import { StudentPortalService } from "./services/student-portal.service";
import { AssignmentsModule } from "../assignments/assignments.module";
import { CBTModule } from "../cbt/cbt.module";

@Module({
  imports: [AssignmentsModule, CBTModule],
  controllers: [StudentPortalController],
  providers: [StudentPortalService],
  exports: [StudentPortalService],
})
export class PortalStudentModule {}
