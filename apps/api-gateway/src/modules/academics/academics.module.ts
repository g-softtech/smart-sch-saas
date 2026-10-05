import { Module } from "@nestjs/common";
import { AcademicsController } from "./controllers/academics.controller";
import { TimetableController } from "./controllers/timetable.controller";
import { ResultsController } from "./controllers/results.controller";
import { TeacherAssignmentsController } from "./controllers/teacher-assignments.controller";
import { TeacherGradebookController } from "./controllers/teacher-gradebook.controller";
import { GradebookWorkflowController } from "./controllers/gradebook-workflow.controller";
import { LessonNotesController } from "./controllers/lesson-notes.controller";
import { AcademicsService } from "./services/academics.service";
import { TimetableService } from "./services/timetable.service";
import { ResultsService } from "./services/results.service";
import { TeacherAssignmentsService } from "./services/teacher-assignments.service";
import { TeacherGradebookService } from "./services/teacher-gradebook.service";
import { GradebookWorkflowService } from "./services/gradebook-workflow.service";
import { LessonNotesService } from "./services/lesson-notes.service";
import { AcademicsRepository } from "./repositories/academics.repository";
import { ResultsEngineService } from "./services/results-engine.service";
import { AcademicGradingConfigService } from "./services/academic-grading-config.service";

@Module({
  controllers: [
    AcademicsController,
    TimetableController,
    ResultsController,
    TeacherAssignmentsController,
    TeacherGradebookController,
    GradebookWorkflowController,
    LessonNotesController,
  ],
  providers: [
    AcademicsService,
    TimetableService,
    ResultsService,
    TeacherAssignmentsService,
    TeacherGradebookService,
    GradebookWorkflowService,
    LessonNotesService,
    AcademicsRepository,
    ResultsEngineService,
    AcademicGradingConfigService,
  ],
  exports: [
    AcademicsService,
    TimetableService,
    ResultsService,
    TeacherAssignmentsService,
    TeacherGradebookService,
    GradebookWorkflowService,
    LessonNotesService,
    ResultsEngineService,
    AcademicGradingConfigService,
  ],
})
export class AcademicsModule {}
