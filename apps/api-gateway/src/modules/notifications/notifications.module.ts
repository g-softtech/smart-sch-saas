import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ResendEmailAdapter } from './providers/resend-email.adapter';
import { AdmissionsNotificationHandler } from './handlers/admissions-notification.handler';

@Module({
  providers: [
    ResendEmailAdapter,
    NotificationsService,
    AdmissionsNotificationHandler,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
