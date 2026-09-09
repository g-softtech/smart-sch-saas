import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantContext } from '../index';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // In a real implementation, this comes from the decoded JWT payload via the Identity service.
    // We NEVER accept this from a raw query parameter like ?tenantId=123.
    const authenticatedTenantId = req.headers['x-tenant-id'] as string; // Placeholder for JWT extraction

    if (authenticatedTenantId) {
      tenantContext.run({ tenantId: authenticatedTenantId }, () => {
        next();
      });
    } else {
      next(); // Some routes might be GLOBAL or SYSTEM_ONLY. Protection happens at the DB/Kernel layer.
    }
  }
}
