
/**
 * Phase 6F Media Upload E2E Test
 * Run: node packages/core-platform/src/scripts/test-phase6f-media-upload.js
 * Env: TEST_API_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
 */
const API = process.env.TEST_API_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@test.com';
const ADMIN_PASS = process.env.TEST_ADMIN_PASSWORD || 'Admin1234!';

let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log('  PASS:', n); };
const ko = (n, e) => { fail++; console.error('  FAIL:', n, String(e)); };

// 1x1 valid PNG (89 50 4E 47 magic bytes)
const TINY_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010802' +
  '0000009001' + '2e00000000c4944415408d76360606000000002000' +
  '17f4640000000049454e44ae426082', 'hex');

const PDF = Buffer.from('%PDF-1.4 fake');
const BIG = Buffer.alloc(6 * 1024 * 1024, 0xab);

async function login() {
  const r = await fetch(API + '/v1/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS })
  });
  if (!r.ok) throw new Error('Login failed ' + r.status);
  const d = await r.json();
  return d.access_token || d.accessToken || d.token;
}

async function resolveWorkspace(token) {
  const r = await fetch(API + '/v1/auth/me', { headers: { authorization: 'Bearer ' + token } });
  const me = await r.json();
  const tenantId = me.tenantId || me.primaryTenantId;
  const sr = await fetch(API + '/v1/schools', { headers: { authorization: 'Bearer ' + token, 'x-tenant-id': tenantId } });
  const sd = await sr.json();
  const school = Array.isArray(sd) ? sd[0] : (sd.data ? sd.data[0] : null);
  return { tenantId, schoolId: school?.id };
}

async function uploadFile(token, tenantId, schoolId, buf, name, mime) {
  const { FormData } = await import('formdata-node');
  const { Blob } = require('buffer');
  const form = new FormData();
  form.set('file', new Blob([buf], { type: mime }), name);
  const r = await fetch(API + '/v1/cms/admin/media/upload', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'x-tenant-id': tenantId, 'x-school-id': schoolId },
    body: form
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

async function run() {
  console.log('\n=== Phase 6F Media Upload Tests ===\n');
  let token, tenantId, schoolId;
  try {
    token = await login();
    ({ tenantId, schoolId } = await resolveWorkspace(token));
    if (!token || !tenantId || !schoolId) throw new Error('Could not resolve workspace');
    console.log('  Auth OK. tenantId=' + tenantId + ' schoolId=' + schoolId);
  } catch (e) { console.error('SETUP FAILED:', e.message); process.exit(1); }

  let uploadedId;

  // 1. Authorized upload - PNG logo
  try {
    const r = await uploadFile(token, tenantId, schoolId, TINY_PNG, 'logo.png', 'image/png');
    if ((r.status === 200 || r.status === 201) && r.data.id) {
      uploadedId = r.data.id;
      ok('1. Authorized admin uploads logo (PNG)');
    } else ko('1. Authorized admin uploads logo', JSON.stringify(r));
  } catch (e) { ko('1.', e); }

  // 2. Authorized upload - favicon PNG
  try {
    const r = await uploadFile(token, tenantId, schoolId, TINY_PNG, 'favicon.png', 'image/png');
    if (r.status === 200 || r.status === 201) ok('2. Authorized admin uploads favicon');
    else ko('2. Upload favicon', JSON.stringify(r));
  } catch (e) { ko('2.', e); }

  // 3. Authorized upload - hero image
  try {
    const r = await uploadFile(token, tenantId, schoolId, TINY_PNG, 'hero.png', 'image/png');
    if (r.status === 200 || r.status === 201) ok('3. Authorized admin uploads hero image');
    else ko('3. Upload hero', JSON.stringify(r));
  } catch (e) { ko('3.', e); }

  // 4. Unauthorized (no token) upload is rejected
  try {
    const r = await fetch(API + '/v1/cms/admin/media/upload', { method: 'POST' });
    if (r.status === 401) ok('4. Unauthorized upload rejected (401)');
    else ko('4. Unauthorized upload', 'Expected 401 got ' + r.status);
  } catch (e) { ko('4.', e); }

  // 5. Invalid type (PDF) rejected
  try {
    const r = await uploadFile(token, tenantId, schoolId, PDF, 'file.pdf', 'application/pdf');
    if (r.status === 400) ok('5. Invalid file type (PDF) rejected (400)');
    else ko('5. Invalid type', 'Expected 400 got ' + r.status);
  } catch (e) { ko('5.', e); }

  // 6. Oversized file rejected
  try {
    const r = await uploadFile(token, tenantId, schoolId, BIG, 'big.png', 'image/png');
    if (r.status === 400 || r.status === 413) ok('6. Oversized file rejected (400/413)');
    else ko('6. Oversized file', 'Expected 400/413 got ' + r.status);
  } catch (e) { ko('6.', e); }

  // 7. Uploaded media serves from correct authenticated endpoint
  if (uploadedId) {
    try {
      const r = await fetch(API + '/v1/cms/admin/media/' + uploadedId + '/serve', {
        headers: { authorization: 'Bearer ' + token, 'x-tenant-id': tenantId, 'x-school-id': schoolId }
      });
      if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) {
        ok('7. Uploaded media serves with correct content-type');
      } else ko('7. Media serve', 'status=' + r.status);
    } catch (e) { ko('7.', e); }
  }

  // 8. Cross-school media access rejected
  if (uploadedId) {
    try {
      const fakeSchool = '00000000-0000-0000-0000-000000000000';
      const r = await fetch(API + '/v1/cms/admin/media/' + uploadedId + '/serve', {
        headers: { authorization: 'Bearer ' + token, 'x-tenant-id': tenantId, 'x-school-id': fakeSchool }
      });
      if (r.status === 403 || r.status === 404) ok('8. Cross-school media access rejected');
      else ko('8. Cross-school', 'Expected 403/404 got ' + r.status);
    } catch (e) { ko('8.', e); }
  }

  console.log('\nResults: ' + pass + ' passed, ' + fail + ' failed');
  if (fail > 0) process.exit(1);
}
run();
