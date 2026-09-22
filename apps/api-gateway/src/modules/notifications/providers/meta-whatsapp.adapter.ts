import { Injectable, Logger } from "@nestjs/common";
import { WhatsAppProvider, WhatsAppMessageOptions } from "./whatsapp.provider";

@Injectable()
export class MetaWhatsAppAdapter implements WhatsAppProvider {
  private readonly logger = new Logger(MetaWhatsAppAdapter.name);

  async sendTemplateMessage(options: WhatsAppMessageOptions): Promise<void> {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v19.0";

    // Missing configuration is an environment issue, NOT a transient delivery failure.
    // We log it and return successfully so the Outbox queue marks the event as COMPLETED 
    // rather than FAILED (which would cause infinite uncontrolled retries for a permanent config missing error).
    if (!accessToken || !phoneNumberId) {
      this.logger.warn(
        "WhatsApp API credentials (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID) are missing. Skipping delivery safely."
      );
      return;
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    // Construct the payload strictly per Meta Graph API documentation
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: options.to,
      type: "template",
      template: {
        name: options.templateName,
        language: {
          code: options.languageCode || "en"
        },
        components: [
          {
            type: "body",
            parameters: options.parameters.map(param => ({
              type: "text",
              text: param
            }))
          }
        ]
      }
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const responseBody = await response.json();

      if (!response.ok) {
        // A failure from Meta (e.g. timeout, rate limit, invalid number) must throw
        // so that it propagates to EventDispatcher and triggers Outbox retry/quarantine.
        this.logger.error(`Failed to send WhatsApp message: ${JSON.stringify(responseBody)}`);
        throw new Error(`WhatsApp API Error: ${response.statusText} - ${JSON.stringify(responseBody)}`);
      }

      this.logger.log(`WhatsApp message sent successfully to ${options.to}`);
    } catch (error) {
      this.logger.error("Exception during WhatsApp delivery", error);
      throw error;
    }
  }
}
