export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export abstract class EmailProvider {
  abstract sendEmail(options: EmailOptions): Promise<void>;
}
