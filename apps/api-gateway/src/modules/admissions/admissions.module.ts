import { Module, forwardRef } from "@nestjs/common";
import { AdmissionsController } from "./controllers/admissions.controller";
import { PublicAdmissionsController } from "./controllers/public-admissions.controller";
import { AdmissionsService } from "./services/admissions.service";
import { AdmissionsRepository } from "./repositories/admissions.repository";
import { StudentsModule } from "../students/students.module";
import { PaymentsModule } from "../payments/payments.module";
import { OutboxService } from "@saas/core-platform";

@Module({
  imports: [StudentsModule, forwardRef(() => PaymentsModule)],
  controllers: [AdmissionsController, PublicAdmissionsController],
  providers: [AdmissionsService, AdmissionsRepository, OutboxService],
  exports: [AdmissionsService],
})
export class AdmissionsModule {}
