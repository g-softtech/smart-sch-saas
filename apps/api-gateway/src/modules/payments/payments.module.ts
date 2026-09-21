import { Module, forwardRef } from '@nestjs/common';
import { PaystackAdapter } from './providers/paystack.adapter';
import { WebhookController } from './controllers/webhook.controller';
import { AdmissionsModule } from '../admissions/admissions.module';

@Module({
  imports: [forwardRef(() => AdmissionsModule)],
  controllers: [WebhookController],
  providers: [PaystackAdapter],
  exports: [PaystackAdapter],
})
export class PaymentsModule {}
