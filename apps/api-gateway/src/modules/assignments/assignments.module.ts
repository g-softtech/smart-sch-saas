import { Module } from "@nestjs/common";
import { AssignmentsController } from "./controllers/assignments.controller";
import { AssignmentsService } from "./services/assignments.service";
import { AcademicsModule } from "../academics/academics.module";
import { ResultsService } from "../academics/services/results.service";

@Module({
  imports: [AcademicsModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
