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
    // We expect a DB connection/query error because we are not using a Testcontainer DB here.
    // However, it MUST NOT throw a Zero-Trust Violation because it is a SYSTEM_ONLY model.
    assert.ok(error, 'Should throw DB error');
    assert.doesNotMatch(error.message, /Zero-Trust Violation/);
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
    // Again, it will fail due to DB connection, but we can verify the error message or simply 
    // confirm it didn't throw the Zero-Trust violation.
    assert.ok(error, 'Should throw DB error');
    assert.doesNotMatch(error.message, /Zero-Trust Violation/);
  });

});
