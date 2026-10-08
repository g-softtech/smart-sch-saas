const http = require('http');

const data = JSON.stringify({
  email: 'admin@schoolos.com',
  password: 'securePassword123'
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
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
    console.log('Login Status:', res.statusCode);
    const result = JSON.parse(body);
    if (!result.data || !result.data.accessToken) {
      console.log('No token:', body);
      return;
    }
    const token = result.data.accessToken;
    
    // Call /me
    http.get({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/auth/me',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res2) => {
      let body2 = '';
      res2.on('data', d => body2 += d);
      res2.on('end', () => {
        console.log('Me Status:', res2.statusCode);
        console.log('Me Body:', body2);
      });
    });
  });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
