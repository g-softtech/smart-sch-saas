import { Module } from '@nestjs/common';
import { GuardianCredentialService } from './services/guardian-credential.service';
import { PickupAuthorizationService } from './services/pickup-authorization.service';
import { DepartureService } from './services/departure.service';
import { DepartureController } from './controllers/departure.controller';
import { GuardianCredentialController } from './controllers/guardian-credential.controller';
import { PickupAuthorizationController } from './controllers/pickup-authorization.controller';

@Module({
  controllers: [
    DepartureController,
    GuardianCredentialController,
    PickupAuthorizationController,
  ],
  providers: [
    GuardianCredentialService,
    PickupAuthorizationService,
    DepartureService,
  ],
  exports: [
    GuardianCredentialService,
    PickupAuthorizationService,
    DepartureService,
  ],
})
export class MovementModule {}
