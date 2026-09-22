import { Module } from "@nestjs/common";
import { IdCardsController } from "./controllers/id-cards.controller";
import { StudentCredentialService } from "./services/student-credential.service";
import { StudentCredentialRepository } from "./repositories/student-credential.repository";

@Module({
  controllers: [IdCardsController],
  providers: [StudentCredentialService, StudentCredentialRepository],
  exports: [StudentCredentialService],
})
export class IdCardsModule {}
