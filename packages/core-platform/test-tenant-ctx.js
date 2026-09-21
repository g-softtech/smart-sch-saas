const { kernel, tenantContext } = require('./dist/index.js');

async function test() {
  const publicToken = 'pub_d186bff5b7e560e45fc2422ab3499d21319ca1124b06a61583b39aedf9c85fc7';
  try {
    const rawResult = await kernel.$queryRaw`
      SELECT "tenantId" FROM "adm_published_forms"
      WHERE "publicToken" = ${publicToken}
      LIMIT 1
    `;
    
    if (!rawResult || rawResult.length === 0) {
      console.log('404');
      return;
    }
    
    const tenantId = rawResult[0].tenantId;
    console.log('Found tenantId:', tenantId);

    const form = await tenantContext.run({ tenantId }, async () => {
      return await kernel.db.publishedAdmissionForm.findFirst({
        where: { publicToken },
        include: {
          academicYear: true,
          targetClass: true,
        },
      });
    });
    
    console.log('Success:', !!form);
  } catch (e) {
    console.error('Error in Prisma:', e);
  }
}
test();
