import { Module } from '@nestjs/common';
import { AcademicsController } from './controllers/academics.controller';
import { AcademicsService } from './services/academics.service';
import { AcademicsRepository } from './repositories/academics.repository';

@Module({
  controllers: [AcademicsController],
  providers: [AcademicsService, AcademicsRepository],
  exports: [AcademicsService],
})
export class AcademicsModule {}
