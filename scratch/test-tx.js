const { kernel } = require('./packages/core-platform');
async function test() {
  try {
    await kernel.db.$transaction(async (tx) => {
      console.log('tx is:', tx);
    });
  } catch(e) {
    console.error('Error:', e);
  }
}
test();
