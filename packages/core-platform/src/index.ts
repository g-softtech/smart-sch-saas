import { PrismaClient, Prisma, User, Tenant, Role, Permission, RolePermission, UserTenantMembership, AuditLog, OutboxQueue, DomainEventLog, IdempotencyRecord, IdentityState } from '@prisma/client';
export * from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

export const tenantContext = new AsyncLocalStorage<{ tenantId: string }>();

// Type-safe guards for Prisma's dynamic args union without blinding the compiler
type ArgsWithWhere = { where?: Record<string, unknown> };
type ArgsWithData = { data?: Record<string, unknown> | Record<string, unknown>[] };
type ArgsWithUpsert = { where?: Record<string, unknown>, create?: Record<string, unknown>, update?: Record<string, unknown> };

function hasWhere(operation: string, args: unknown): args is ArgsWithWhere {
  const operations = ['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate', 'groupBy'];
  return operations.includes(operation) && typeof args === 'object' && args !== null;
}

function hasData(operation: string, args: unknown): args is ArgsWithData {
  return ['create', 'createMany'].includes(operation) && typeof args === 'object' && args !== null;
}

function isUpsert(operation: string, args: unknown): args is ArgsWithUpsert {
  return operation === 'upsert' && typeof args === 'object' && args !== null;
}

class PlatformKernel {
  private basePrisma = new PrismaClient();

  // The client exposed to the rest of the application
  public db = this.basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // TENANT_SCOPED Enforcement Layer
          const tenantScopedModels = ['School', 'Role', 'Permission', 'RolePermission', 'UserTenantMembership'];
          
          if (tenantScopedModels.includes(model)) {
            const store = tenantContext.getStore();
            if (!store || !store.tenantId) {
              throw new Error(`PlatformKernel Zero-Trust Violation: Attempted to access TENANT_SCOPED model '${model}' without an active tenant context.`);
            }

            // Mechanically append tenantId to the args for read/update/delete operations
            if (hasWhere(operation, args)) {
              args.where = args.where || {};
              Object.assign(args.where, { tenantId: store.tenantId });
            }

            // Mechanically append tenantId for create operations
            if (hasData(operation, args)) {
              if (Array.isArray(args.data)) {
                args.data.forEach(d => Object.assign(d, { tenantId: store.tenantId }));
              } else {
                args.data = args.data || {};
                Object.assign(args.data, { tenantId: store.tenantId });
              }
            }

            // For upsert, we must enforce it on both the where and the create/update branches
            if (isUpsert(operation, args)) {
              args.where = args.where || {};
              args.create = args.create || {};
              args.update = args.update || {};
              Object.assign(args.where, { tenantId: store.tenantId });
              Object.assign(args.create, { tenantId: store.tenantId });
              Object.assign(args.update, { tenantId: store.tenantId });
            }
          }
          
          return query(args);
        }
      }
    }
  });
}

export const kernel = new PlatformKernel();
