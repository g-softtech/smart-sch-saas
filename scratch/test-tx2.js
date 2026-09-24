const { kernel } = require('./packages/core-platform');
async function test() {
  try {
    await kernel.db.$transaction(async (tx) => {
      console.log('tx.studentArrival is:', tx.studentArrival);
      if(!tx.studentArrival) throw new Error("studentArrival is undefined on tx");
    });
    console.log("Success");
  } catch(e) {
    console.error('Error:', e);
  }
}
test();
