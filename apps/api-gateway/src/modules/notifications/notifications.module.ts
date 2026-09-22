import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { EmailProvider } from "./providers/email.provider";
import { ResendEmailAdapter } from "./providers/resend-email.adapter";
import { AdmissionsNotificationHandler } from "./handlers/admissions-notification.handler";
import { WhatsAppProvider } from "./providers/whatsapp.provider";
import { MetaWhatsAppAdapter } from "./providers/meta-whatsapp.adapter";
import { MovementWhatsAppNotificationHandler } from "./handlers/movement-whatsapp.handler";

@Module({
  providers: [
    NotificationsService,
    {
      provide: EmailProvider,
      useClass: ResendEmailAdapter,
    },
    {
      provide: WhatsAppProvider,
      useClass: MetaWhatsAppAdapter,
    },
    AdmissionsNotificationHandler,
    MovementWhatsAppNotificationHandler,
  ],
  exports: [NotificationsService, WhatsAppProvider],
})
export class NotificationsModule {}
