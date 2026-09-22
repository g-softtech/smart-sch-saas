import { Module } from '@nestjs/common';
import { GuardianCredentialService } from './services/guardian-credential.service';
import { PickupAuthorizationService } from './services/pickup-authorization.service';
import { DepartureService } from './services/departure.service';

@Module({
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
