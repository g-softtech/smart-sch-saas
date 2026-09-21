require('ts-node/register');
const { AdmissionsRepository } = require('./src/modules/admissions/repositories/admissions.repository');
const repo = new AdmissionsRepository();

async function run() {
  try {
    const res = await repo.findFormByToken('pub_14ceddddc120d5b64ef75d6887807360fc43dc5788c7be06f8cd173648324518');
    console.log('Result:', res);
  } catch (e) {
    console.error('Error:', e);
  }
}

run();
