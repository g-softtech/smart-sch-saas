import { Module } from "@nestjs/common";
import { AcademicsController } from "./controllers/academics.controller";
import { TimetableController } from "./controllers/timetable.controller";
import { ResultsController } from "./controllers/results.controller";
import { AcademicsService } from "./services/academics.service";
import { TimetableService } from "./services/timetable.service";
import { ResultsService } from "./services/results.service";
import { AcademicsRepository } from "./repositories/academics.repository";

@Module({
  controllers: [AcademicsController, TimetableController, ResultsController],
  providers: [AcademicsService, TimetableService, ResultsService, AcademicsRepository],
  exports: [AcademicsService, TimetableService, ResultsService],
})
export class AcademicsModule {}
