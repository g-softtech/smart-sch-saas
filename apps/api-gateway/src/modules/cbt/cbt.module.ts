import { Module, forwardRef } from "@nestjs/common";
import { CBTAttemptService } from "./services/cbt-attempt.service";
import { CBTCompilerService } from "./services/cbt-compiler.service";
import { CBTService } from "./services/cbt.service";
import { StudentPortalCBTController } from "./controllers/student-portal-cbt.controller";
import { TeacherCBTController } from "./controllers/teacher-cbt.controller";
import { AdminCBTController } from "./controllers/admin-cbt.controller";
import { AdminCBTService } from "./services/admin-cbt.service";
import { AcademicsModule } from "../academics/academics.module";

@Module({
  imports: [forwardRef(() => AcademicsModule)],
  controllers: [StudentPortalCBTController, TeacherCBTController, AdminCBTController],
  providers: [CBTAttemptService, CBTCompilerService, CBTService, AdminCBTService],
  exports: [CBTAttemptService, CBTCompilerService, CBTService],
})
export class CBTModule {}
