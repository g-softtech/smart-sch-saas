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
    const result = JSON.parse(body);
    const token = result.data?.accessToken;
    if (!token) return console.log('Login failed');

    http.get({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/workspaces',
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res2) => {
      let body2 = '';
      res2.on('data', d => body2 += d);
      res2.on('end', () => {
        const ws = JSON.parse(body2);
        console.log('Workspaces:', ws);
        const tenantId = ws[0]?.tenantId;

        http.get({
          hostname: 'localhost',
          port: 3000,
          path: '/api/v1/cms/admin/config',
          headers: { 
            'Authorization': 'Bearer ' + token,
            'x-tenant-id': tenantId
          }
        }, (res3) => {
          let body3 = '';
          res3.on('data', d => body3 += d);
          res3.on('end', () => {
            console.log('CMS Config Status:', res3.statusCode);
            console.log('CMS Config Body:', body3);
          });
        });
      });
    });
  });
});
req.write(data);
req.end();
