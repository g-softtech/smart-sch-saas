import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider } from './providers/email.provider';
import { ResendEmailAdapter } from './providers/resend-email.adapter';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly emailProvider: ResendEmailAdapter) {}

  async sendTransactionalEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.emailProvider.sendEmail({
        to,
        subject,
        html,
      });
      this.logger.log(`Transactional email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send transactional email to ${to}`, error);
      throw error;
    }
  }
}
