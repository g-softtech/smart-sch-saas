export interface WhatsAppMessageOptions {
  to: string; // The normalized WhatsApp number
  templateName: string; // The approved WhatsApp template name
  languageCode?: string; // default to "en"
  parameters: string[]; // Ordered list of parameters to substitute into the template
}

export abstract class WhatsAppProvider {
  abstract sendTemplateMessage(options: WhatsAppMessageOptions): Promise<void>;
}
