import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";
import { EmailProvider, EmailOptions } from "./email.provider";

@Injectable()
export class ResendEmailAdapter implements EmailProvider {
  private readonly resend: Resend;
  private readonly logger = new Logger(ResendEmailAdapter.name);

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        "RESEND_API_KEY is not set. Email delivery will be skipped or fail.",
      );
    }
    this.resend = new Resend(apiKey || "unconfigured");
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const defaultFrom =
      process.env.EMAIL_FROM_ADDRESS ||
      "Acme Admissions <onboarding@resend.dev>";

    try {
      const { data, error } = await this.resend.emails.send({
        from: options.from || defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        this.logger.error(
          `Failed to send email via Resend: ${error.message}`,
          error,
        );
        throw new Error(error.message);
      }

      this.logger.log(`Email sent successfully: ${data?.id}`);
    } catch (error) {
      this.logger.error("Exception during email delivery", error);
      throw error;
    }
  }
}
