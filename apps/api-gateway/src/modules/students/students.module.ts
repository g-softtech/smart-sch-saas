import { Module } from '@nestjs/common';
import { StudentsService } from './services/students.service';
import { StudentsRepository } from './repositories/students.repository';

@Module({
  providers: [StudentsService, StudentsRepository],
  exports: [StudentsService],
})
export class StudentsModule {}
