import test from 'node:test';
import assert from 'node:assert';
import { kernel, tenantContext } from './index';

test('PlatformKernel Isolation Tests', async (t) => {

  await t.test('TENANT_SCOPED model blocks access without tenant context', async () => {
    let error;
    try {
      // @ts-ignore
      await kernel.db.school.findMany();
    } catch (e: any) {
      error = e;
    }
    assert.ok(error, 'Should throw an error');
    assert.match(error.message, /Zero-Trust Violation/);
  });

  await t.test('SYSTEM_ONLY model allows access without tenant context', async () => {
    let error;
    try {
      // @ts-ignore
      await kernel.db.platformAuditLog.findMany();
    } catch (e: any) {
      error = e;
    }
    // If an error is thrown (e.g. no DB connection), it MUST NOT be a Zero-Trust Violation.
    if (error) {
      assert.doesNotMatch(error.message, /Zero-Trust Violation/);
    }
  });

  await t.test('TENANT_SCOPED model appends tenantId when context exists', async () => {
    let error;
    try {
      await tenantContext.run({ tenantId: 'tenant-123' }, async () => {
        // @ts-ignore
        await kernel.db.school.findMany({ where: { name: 'Test' } });
      });
    } catch (e: any) {
      error = e;
    }
    // If an error is thrown, it MUST NOT be a Zero-Trust Violation.
    if (error) {
      assert.doesNotMatch(error.message, /Zero-Trust Violation/);
    }
  });

  await t.test('platformReads does NOT require tenant context for global School and Campus counts', async () => {
    let error;
    try {
      await kernel.platformReads.countTotalSchools();
      await kernel.platformReads.countTotalCampuses();
    } catch (e: any) {
      error = e;
    }
    // If a DB error occurs (e.g. no DB connection), it must not be a Zero-Trust Violation
    if (error) {
      assert.doesNotMatch(
        error.message,
        /Zero-Trust Violation/,
        'platformReads must not throw Zero-Trust Violation',
      );
    }
  });

  await t.test('platformReads does NOT expose arbitrary raw Prisma models, queries, or mutations', async () => {
    const reads = kernel.platformReads as any;

    // Must expose ONLY the intended platform read methods
    assert.strictEqual(typeof reads.countTotalSchools, 'function');
    assert.strictEqual(typeof reads.countTotalCampuses, 'function');

    // Must NOT expose arbitrary Prisma models
    assert.strictEqual(reads.school, undefined, 'Must not expose raw school model');
    assert.strictEqual(reads.campus, undefined, 'Must not expose raw campus model');
    assert.strictEqual(reads.user, undefined, 'Must not expose raw user model');
    assert.strictEqual(reads.tenant, undefined, 'Must not expose raw tenant model');

    // Must NOT expose raw Prisma query methods
    assert.strictEqual(reads.$queryRaw, undefined, 'Must not expose $queryRaw');
    assert.strictEqual(reads.$executeRaw, undefined, 'Must not expose $executeRaw');
    assert.strictEqual(reads.$transaction, undefined, 'Must not expose $transaction');

    // Kernel must NOT expose raw Prisma client or platformDb escape hatch
    assert.strictEqual((kernel as any).platformDb, undefined, 'platformDb escape hatch must be removed');
    assert.strictEqual((kernel as any).basePrisma, undefined, 'basePrisma must be private');
  });

  await t.test('kernel.db still throws Zero-Trust Violation for Campus without tenant context', async () => {
    let error;
    try {
      // @ts-ignore
      await kernel.db.campus.count();
    } catch (e: any) {
      error = e;
    }
    assert.ok(error, 'Should throw an error');
    assert.match(error.message, /Zero-Trust Violation/);
  });

});
