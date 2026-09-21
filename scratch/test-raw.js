const { kernel } = require('@saas/core-platform');

async function test() {
  try {
    const res = await kernel.$queryRaw`SELECT * FROM "PublishedAdmissionForm" LIMIT 1`;
    console.log('Success!', res);
  } catch (e) {
    console.error('Failed:', e.message);
  }
}
test();
