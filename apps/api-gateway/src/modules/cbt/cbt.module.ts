import { Module, forwardRef } from "@nestjs/common";
import { CBTAttemptService } from "./services/cbt-attempt.service";
import { CBTCompilerService } from "./services/cbt-compiler.service";
import { StudentPortalCBTController } from "./controllers/student-portal-cbt.controller";
import { TeacherCBTController } from "./controllers/teacher-cbt.controller";
import { AcademicsModule } from "../academics/academics.module";

@Module({
  imports: [forwardRef(() => AcademicsModule)],
  controllers: [StudentPortalCBTController, TeacherCBTController],
  providers: [CBTAttemptService, CBTCompilerService],
  exports: [CBTAttemptService, CBTCompilerService],
})
export class CBTModule {}
