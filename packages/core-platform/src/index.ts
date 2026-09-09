import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

export const tenantContext = new AsyncLocalStorage<{ tenantId: string }>();

class PlatformKernel {
  private basePrisma = new PrismaClient();

  // The client exposed to the rest of the application
  public db = this.basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // TENANT_SCOPED Enforcement Layer
          const tenantScopedModels = ['School'];
          
          if (tenantScopedModels.includes(model)) {
            const store = tenantContext.getStore();
            if (!store || !store.tenantId) {
              throw new Error(`PlatformKernel Zero-Trust Violation: Attempted to access TENANT_SCOPED model '${model}' without an active tenant context.`);
            }

            // Mechanically append tenantId to the where clause
            if (operation === 'findUnique' || operation === 'findFirst' || operation === 'findMany' || operation === 'update' || operation === 'delete') {
              args.where = { ...args.where, tenantId: store.tenantId };
            }
          }
          
          return query(args);
        }
      }
    }
  });
}

export const kernel = new PlatformKernel();
