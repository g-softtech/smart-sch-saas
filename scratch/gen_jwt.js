const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    sub: 'cortex-admin-id',
    email: 'admin@schoolos.com',
    role: 'SUPER_ADMIN'
  },
  '5qm7_C1016GhZuppzNcpQmDbjDWrBY7HU3uSbatVppfbZ6B0quX8IIFbmVtDtW7kfhfrAixnA-pirx5VtOJ7JA',
  { expiresIn: '1h' }
);

console.log(token);
