import { PrismaClient, Prisma } from '@prisma/client';
export * from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
export * from './domain/events';
export * from './domain/audit';

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
            'School', 'Role', 'UserTenantMembership', 'Campus', 'UserSchoolAccess',
            // Students (Batch 3B)
            'Student', 'Guardian', 'StudentGuardian', 'Enrollment',
            // Admissions (Batch 3C)
            'PublishedAdmissionForm', 'Applicant', 'AdmissionApplication', 'AdmissionReview',
            // Phase 6A SaaS Entitlements
            'TenantEntitlement', 'SchoolModuleSetting',
            // Phase 5F Staff Photos
            'StaffPhoto',
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

/**
 * Narrow, read-only interface providing platform-level read capabilities for
 * already-authorized platform administration services.
 * Note: This interface does not perform authorization checks itself; authorization
 * is enforced upstream at the platform authentication/authorization boundary (e.g. PlatformAuthGuard).
 * Exposes ONLY specific aggregated read operations required by platform administration.
 * Strictly prohibits arbitrary Prisma model access and any mutation operations.
 */
export interface PlatformReadOperations {
  /**
   * Returns total count of Schools across all tenants.
   * Intended strictly for already-authorized platform administration services (e.g. Super Admin metrics).
   */
  countTotalSchools(): Promise<number>;

  /**
   * Returns total count of Campuses across all tenants.
   * Intended strictly for already-authorized platform administration services (e.g. Super Admin metrics).
   */
  countTotalCampuses(): Promise<number>;
}

class PlatformReadOperationsImpl implements PlatformReadOperations {
  #basePrisma: PrismaClient;

  constructor(basePrisma: PrismaClient) {
    this.#basePrisma = basePrisma;
  }

  async countTotalSchools(): Promise<number> {
    return this.#basePrisma.school.count();
  }

  async countTotalCampuses(): Promise<number> {
    return this.#basePrisma.campus.count();
  }
}

class PlatformKernel {
  #basePrisma = new PrismaClient();

  // The client exposed to the rest of the application — enforces tenant-scoped Zero-Trust
  public db = buildScopedExtension(this.#basePrisma);

  /**
   * Narrow platform-level read accessor intended for already-authorized platform administration services.
   * Note: This accessor does not perform authorization checks itself; authorization is
   * enforced upstream at the platform authentication/authorization boundary (e.g. PlatformAuthGuard).
   * Exposes only narrowly scoped global aggregation reads required for platform management
   * (e.g. Super Admin dashboard metrics).
   *
   * SECURITY INVARIANT:
   * This accessor intentionally does NOT expose raw Prisma models, arbitrary query builders,
   * or any mutation methods (create, update, delete).
   * Regular application services MUST use `kernel.db` with active tenant context.
   */
  public readonly platformReads: PlatformReadOperations = new PlatformReadOperationsImpl(this.#basePrisma);

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
    return this.#basePrisma.$queryRaw<T>(query, ...values);
  }
}

export const kernel = new PlatformKernel();
export * from './scripts/seed-cms-permissions';
