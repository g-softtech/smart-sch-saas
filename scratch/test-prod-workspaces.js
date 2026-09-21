const https = require('https');

const data = JSON.stringify({
  email: 'admin@schoolos.com',
  password: 'Password123!'
});

const req = https.request({
  hostname: 'smart-sch-saas.onrender.com',
  port: 443,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const response = JSON.parse(body);
    const token = response.data.accessToken;
    
    const req2 = https.request({
      hostname: 'smart-sch-saas.onrender.com',
      port: 443,
      path: '/api/v1/identity/me/workspaces',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    }, (res2) => {
      let body2 = '';
      res2.on('data', d => body2 += d);
      res2.on('end', () => console.log('Workspaces Status:', res2.statusCode, 'Body:', body2));
    });
    
    req2.end();
  });
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
