import { Module } from '@nestjs/common';
import { GuardianCredentialService } from './services/guardian-credential.service';
import { PickupAuthorizationService } from './services/pickup-authorization.service';
import { DepartureService } from './services/departure.service';
import { MovementHistoryService } from './services/movement-history.service';
import { DepartureController } from './controllers/departure.controller';
import { GuardianCredentialController } from './controllers/guardian-credential.controller';
import { PickupAuthorizationController } from './controllers/pickup-authorization.controller';
import { MovementHistoryController } from './controllers/movement-history.controller';
import { IdempotencyService } from '@saas/core-platform';
import { IdCardsModule } from '../id-cards/id-cards.module';

@Module({
  imports: [IdCardsModule],
  controllers: [
    DepartureController,
    GuardianCredentialController,
    PickupAuthorizationController,
    MovementHistoryController,
  ],
  providers: [
    GuardianCredentialService,
    PickupAuthorizationService,
    DepartureService,
    MovementHistoryService,
    IdempotencyService,
  ],
  exports: [
    GuardianCredentialService,
    PickupAuthorizationService,
    DepartureService,
  ],
})
export class MovementModule {}
