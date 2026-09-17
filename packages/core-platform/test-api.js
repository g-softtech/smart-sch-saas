const http = require('http');

async function testApi() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/academics/classes',
    method: 'GET',
    headers: {
      'x-tenant-id': '702c8661-2f3b-4dc5-bcb4-9ce99519cddc',
      'x-school-id': '7596632e-659a-404e-91e6-bdc3e96cdc27'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      console.log('BODY:', data);
    });
  });

  req.on('error', (e) => {
    console.error('problem with request:', e.message);
  });
  req.end();
}

testApi();
