import { PrismaClient, Prisma } from '@prisma/client';
export * from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

export const tenantContext = new AsyncLocalStorage<{ tenantId: string }>();

// Models that are strictly scoped to a tenant
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

function buildScopedExtension(base: PrismaClient) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const ctx = tenantContext.getStore();
          // If no tenant context is bound, allow global operations for un-scoped/admin execution
          if (!ctx || !ctx.tenantId) {
            return query(args);
          }

          const tenantId = ctx.tenantId;

          // Inject tenantId filter for queries
          if (args && typeof args === 'object') {
            const anyArgs = args as any;
            if (anyArgs.where) {
              anyArgs.where.tenantId = tenantId;
            } else if (['findMany', 'findFirst', 'count', 'deleteMany', 'updateMany'].includes(operation)) {
              anyArgs.where = { tenantId };
            }

            if (['create'].includes(operation) && anyArgs.data) {
              anyArgs.data.tenantId = tenantId;
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

  get rawDb(): PrismaClient {
    return this.basePrisma;
  }
}

export const kernel = new PlatformKernel();
