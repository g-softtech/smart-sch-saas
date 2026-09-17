const argon2 = require('argon2');
const hash = '$argon2id$v=19$m=65536,p=4,t=3$MG7ES2cw97wZF9FLyFJkqg$pkT6CBdJ9r81aKsJy2aVgeCMx6CMdIpmSVZm09doqJY';

async function verify() {
  const passwords = ['password', 'admin', 'admin123', 'Password123', 'Password'];
  for (const p of passwords) {
    if (await argon2.verify(hash, p)) {
      console.log('Match: ' + p);
      return;
    }
  }
  console.log('No match found');
}
verify();
