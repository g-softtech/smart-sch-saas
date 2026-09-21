import { Module } from "@nestjs/common";
import { StudentsController } from "./controllers/students.controller";
import { StudentsService } from "./services/students.service";
import { StudentsRepository } from "./repositories/students.repository";

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, StudentsRepository],
  exports: [StudentsService],
})
export class StudentsModule {}
