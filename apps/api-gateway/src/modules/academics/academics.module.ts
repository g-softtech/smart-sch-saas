import { Module } from "@nestjs/common";
import { AcademicsController } from "./controllers/academics.controller";
import { TimetableController } from "./controllers/timetable.controller";
import { ResultsController } from "./controllers/results.controller";
import { TeacherAssignmentsController } from "./controllers/teacher-assignments.controller";
import { AcademicsService } from "./services/academics.service";
import { TimetableService } from "./services/timetable.service";
import { ResultsService } from "./services/results.service";
import { TeacherAssignmentsService } from "./services/teacher-assignments.service";
import { AcademicsRepository } from "./repositories/academics.repository";

@Module({
  controllers: [
    AcademicsController,
    TimetableController,
    ResultsController,
    TeacherAssignmentsController,
  ],
  providers: [
    AcademicsService,
    TimetableService,
    ResultsService,
    TeacherAssignmentsService,
    AcademicsRepository,
  ],
  exports: [
    AcademicsService,
    TimetableService,
    ResultsService,
    TeacherAssignmentsService,
  ],
})
export class AcademicsModule {}
