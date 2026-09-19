import { PrismaClient, Prisma } from '@prisma/client';
export * from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
export * from './domain/events';

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

function buildScopedExtension(base: PrismaClient) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // TENANT_SCOPED Enforcement Layer
          const tenantScopedModels = [
            // Identity (Batch 1)
            'School', 'Role', 'Permission', 'RolePermission', 'UserTenantMembership',
            // Students (Batch 3B)
            'Student', 'Guardian', 'StudentGuardian', 'Enrollment',
            // Admissions (Batch 3C)
            'PublishedAdmissionForm', 'Applicant', 'AdmissionApplication', 'AdmissionReview',
          ];
          
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
              const anyArgs = args as any;
              anyArgs.where = anyArgs.where || {};
              anyArgs.create = anyArgs.create || {};
              anyArgs.update = anyArgs.update || {};
              Object.assign(anyArgs.where, { tenantId: store.tenantId });
              Object.assign(anyArgs.create, { tenantId: store.tenantId });
              Object.assign(anyArgs.update, { tenantId: store.tenantId });
            }
          }
          
          return query(args);
        }
      }
    }
  });
}

class PlatformKernel {
  private basePrisma = new PrismaClient();

  // The client exposed to the rest of the application — enforces tenant-scoped Zero-Trust
  public db = buildScopedExtension(this.basePrisma);

  /**
   * Tenant-aware interactive transaction.
   * The callback receives a scoped Prisma client that still enforces tenant isolation.
   * Use for multi-step operations that require atomicity (e.g. enrollment transfers).
   *
   * IMPORTANT: tenantContext MUST be active (i.e., called from within a workspace request)
   * before calling this method. The inner client enforces the same tenantScopedModels rules.
   */
  public async $transaction<T>(
    fn: (tx: ReturnType<typeof buildScopedExtension>) => Promise<T>,
  ): Promise<T> {
    return this.db.$transaction(fn as any) as Promise<T>;
  }

  /**
   * Raw SQL execution — bypasses the extension entirely.
   * Only use for system-level operations (e.g. student-number sequence allocation,
   * cross-tenant user membership discovery) where tenantId is passed explicitly in the SQL.
   * Callers are responsible for supplying all necessary WHERE predicates.
   */
  public $queryRaw<T = unknown>(
    query: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T> {
    return this.basePrisma.$queryRaw<T>(query, ...values);
  }
}

export const kernel = new PlatformKernel();

