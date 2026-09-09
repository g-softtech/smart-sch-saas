import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditMaskingService {
  private readonly SENSITIVE_KEYS = new Set([
    'password',
    'passwordhash',
    'secret',
    'token',
    'creditcard',
    'ssn',
    'cvv',
    'refresh_token',
    'access_token'
  ]);

  /**
   * Recursively masks sensitive fields in an object.
   */
  mask(data: any): any {
    if (!data) return data;
    
    if (typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.mask(item));
    }

    const masked: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (this.SENSITIVE_KEYS.has(key.toLowerCase())) {
        masked[key] = '***REDACTED***';
      } else {
        masked[key] = this.mask(data[key]);
      }
    }

    return masked;
  }
}
