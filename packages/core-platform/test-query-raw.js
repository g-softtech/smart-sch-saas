const { kernel } = require('./src/index');

async function test() {
  const publicToken = 'pub_d186bff5b7e560e45fc2422ab3499d21319ca1124b06a61583b39aedf9c85fc7';
  try {
    const res = await kernel.$queryRaw`
      SELECT "tenantId" FROM "adm_published_forms"
      WHERE "publicToken" = ${publicToken}
      LIMIT 1
    `;
    console.log('Result:', res);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
