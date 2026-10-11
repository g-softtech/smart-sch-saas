import { PrismaClient, Prisma } from '@prisma/client';
export * from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

export const tenantContext = new AsyncLocalStorage<{ tenantId: string }>();

// Models strictly bounded to a tenant
const TENANT_SCOPED_MODELS = new Set([
  'School',
  'Campus',
  'TenantMembership',
  'Role',
  'AcademicYear',
  'Term',
  'Class',
  'Arm',
  'Subject',
  'ClassSubject',
  'StaffProfile',
  'TeacherSubjectAssignment',
  'ClassTeacherAssignment',
  'Student',
  'Guardian',
  'StudentGuardian',
  'Enrollment',
  'AttendanceRecord',
  'MovementRecord',
  'PickupAuthorization',
  'AssessmentComponent',
  'AssessmentScore',
  'GradebookSubmission',
  'Invoice',
  'InvoiceLineItem',
  'Payment',
  'Wallet',
  'WalletTransaction',
  'PlatformAuditLog'
]);

export class TenantContextMissingError extends Error {
  constructor(model: string, operation: string) {
    super(
      `Zero-Trust Tenant Boundary Violation: Attempted ${operation} on tenant-scoped model '${model}' without an active tenantId in tenantContext.`
    );
    this.name = 'TenantContextMissingError';
  }
}

function buildScopedExtension(base: PrismaClient) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const ctx = tenantContext.getStore();

          // Zero-Trust Rule: Tenant-scoped queries MUST have an active tenantId
          if (!ctx || !ctx.tenantId) {
            throw new TenantContextMissingError(model, operation);
          }

          const tenantId = ctx.tenantId;

          // Inject and enforce tenantId on all queries
          if (args && typeof args === 'object') {
            const anyArgs = args as any;
            if (anyArgs.where) {
              anyArgs.where.tenantId = tenantId;
            } else if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'deleteMany', 'updateMany'].includes(operation)) {
              anyArgs.where = { tenantId };
            }

            if (['create'].includes(operation) && anyArgs.data) {
              if (Array.isArray(anyArgs.data)) {
                anyArgs.data.forEach((item: any) => { item.tenantId = tenantId; });
              } else {
                anyArgs.data.tenantId = tenantId;
              }
            }

            if (['createMany'].includes(operation) && anyArgs.data) {
              if (Array.isArray(anyArgs.data)) {
                anyArgs.data.forEach((item: any) => { item.tenantId = tenantId; });
              }
            }

            if (operation === 'upsert') {
              if (anyArgs.create) anyArgs.create.tenantId = tenantId;
              if (anyArgs.update) anyArgs.update.tenantId = tenantId;
              if (anyArgs.where) anyArgs.where.tenantId = tenantId;
            }
          }

          return query(args);
        }
      }
    }
  });
}

class PlatformKernel {
  private basePrisma: PrismaClient;
  public db: ReturnType<typeof buildScopedExtension>;

  constructor() {
    this.basePrisma = new PrismaClient();
    this.db = buildScopedExtension(this.basePrisma);
  }

  get $queryRaw() {
    return this.basePrisma.$queryRaw.bind(this.basePrisma);
  }

  get $executeRaw() {
    return this.basePrisma.$executeRaw.bind(this.basePrisma);
  }

  // Explicit, intentional escape hatch for platform-wide queries ONLY (e.g. system audits, super admin onboarding)
  get rawDb(): PrismaClient {
    return this.basePrisma;
  }
}

export const kernel = new PlatformKernel();
