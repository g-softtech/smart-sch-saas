import { Module } from "@nestjs/common";
import { AcademicsController } from "./controllers/academics.controller";
import { TimetableController } from "./controllers/timetable.controller";
import { ResultsController } from "./controllers/results.controller";
import { TeacherAssignmentsController } from "./controllers/teacher-assignments.controller";
import { TeacherGradebookController } from "./controllers/teacher-gradebook.controller";
import { AcademicsService } from "./services/academics.service";
import { TimetableService } from "./services/timetable.service";
import { ResultsService } from "./services/results.service";
import { TeacherAssignmentsService } from "./services/teacher-assignments.service";
import { TeacherGradebookService } from "./services/teacher-gradebook.service";
import { AcademicsRepository } from "./repositories/academics.repository";

@Module({
  controllers: [
    AcademicsController,
    TimetableController,
    ResultsController,
    TeacherAssignmentsController,
    TeacherGradebookController,
  ],
  providers: [
    AcademicsService,
    TimetableService,
    ResultsService,
    TeacherAssignmentsService,
    TeacherGradebookService,
    AcademicsRepository,
  ],
  exports: [
    AcademicsService,
    TimetableService,
    ResultsService,
    TeacherAssignmentsService,
    TeacherGradebookService,
  ],
})
export class AcademicsModule {}
