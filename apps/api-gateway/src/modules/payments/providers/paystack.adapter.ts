import { Injectable, Logger } from '@nestjs/common';

export interface PaystackInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string; // 'success', 'failed', 'abandoned', etc.
    reference: string;
    amount: number; // in kobo
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string; // 'NGN'
    ip_address: string;
    metadata: string | Record<string, any>;
    fees: number;
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
    };
  };
}

@Injectable()
export class PaystackAdapter {
  private readonly logger = new Logger(PaystackAdapter.name);
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || 'sk_test_placeholder';
    this.baseUrl = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
  }

  async initializeTransaction(amountInKobo: number, email: string, reference: string): Promise<PaystackInitResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountInKobo,
          email,
          reference,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.status) {
        throw new Error(data.message || 'Failed to initialize Paystack transaction');
      }

      return data.data;
    } catch (error: any) {
      this.logger.error(`Paystack init failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok || !data.status) {
        throw new Error(data.message || 'Failed to verify Paystack transaction');
      }

      return data as PaystackVerifyResponse;
    } catch (error: any) {
      this.logger.error(`Paystack verify failed for ref ${reference}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
