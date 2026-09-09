import { Injectable } from '@nestjs/common';
import { AuditSeverity } from './AuditTypes';

@Injectable()
export class AuditRetentionPolicy {
  /**
   * Calculates the retention date based on event severity.
   * - LOW: 1 year
   * - MEDIUM: 3 years
   * - HIGH / CRITICAL: 7 years
   */
  calculateRetentionDate(severity: AuditSeverity, fromDate: Date = new Date()): Date {
    const date = new Date(fromDate.getTime());
    
    switch (severity) {
      case 'LOW':
        date.setFullYear(date.getFullYear() + 1);
        break;
      case 'MEDIUM':
        date.setFullYear(date.getFullYear() + 3);
        break;
      case 'HIGH':
      case 'CRITICAL':
        date.setFullYear(date.getFullYear() + 7);
        break;
    }
    
    return date;
  }
}
