import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { ResendEmailAdapter } from "./providers/resend-email.adapter";
import { AdmissionsNotificationHandler } from "./handlers/admissions-notification.handler";
import { IdempotencyService } from "@saas/core-platform";

@Module({
  providers: [
    ResendEmailAdapter,
    NotificationsService,
    AdmissionsNotificationHandler,
    IdempotencyService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
