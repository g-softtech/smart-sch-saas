const http = require('http');
const https = require('https');

const API_BASE = process.env.API_URL || 'http://localhost:3000';

function makeRequest(urlStr, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: { ...headers },
    };

    let bodyPayload = null;
    if (data && !(data instanceof Buffer) && typeof data === 'object') {
      bodyPayload = JSON.stringify(data);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(bodyPayload);
    } else if (data instanceof Buffer) {
      bodyPayload = data;
    }

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let body = [];
      res.on('data', (chunk) => body.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(body);
        let parsed = raw.toString();
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            parsed = JSON.parse(raw.toString());
          } catch (e) {}
        }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw });
      });
    });

    req.on('error', reject);
    if (bodyPayload) req.write(bodyPayload);
    req.end();
  });
}

async function runTest() {
  console.log('=== PHASE 5F: TEACHER PORTAL & ONBOARDING LIVE E2E TEST ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  try {
    // 1. Authenticate as Super Admin / Tenant Admin to seed staff
    console.log('Step 1: Authenticate Super Admin...');
    const loginRes = await makeRequest(`${API_BASE}/api/v1/auth/login`, 'POST', {
      email: 'admin@schoolos.com',
      password: 'Password123!',
    });

    const token = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
    if (loginRes.status !== 200 || !token) {
      console.error('Super Admin login failed:', loginRes.data);
      throw new Error('Super Admin login failed');
    }

    const adminToken = token;
    const authHeaders = { Authorization: `Bearer ${adminToken}` };

    // Get Active Tenant/School Workspace
    const meRes = await makeRequest(`${API_BASE}/api/v1/auth/me`, 'GET', null, authHeaders);
    assert(meRes.status === 200, 'GET /auth/me returns 200 OK');
    const meData = meRes.data?.data || meRes.data;
    const { tenantId, schoolId } = meData;
    assert(tenantId && schoolId, 'Identity me returns active tenantId and schoolId');

    const workspaceHeaders = {
      ...authHeaders,
      'x-tenant-id': tenantId,
      'x-school-id': schoolId,
    };

    function getData(res) {
      if (res && res.data && typeof res.data === 'object' && 'data' in res.data && res.data.data !== undefined) {
        return res.data.data;
      }
      return res.data;
    }

    // 2. Create a new Teaching Staff profile
    console.log('\nStep 2: Create Teaching Staff Profile...');
    const teacherEmail = `test.teacher.${Date.now()}@thecortexsystems.com`;
    const createStaffRes = await makeRequest(`${API_BASE}/api/v1/staff`, 'POST', {
      firstName: 'Emily',
      lastName: 'Watson',
      email: teacherEmail,
      phone: '+2348123456789',
      joiningDate: new Date().toISOString(),
      type: 'TEACHING',
      designation: 'Senior Physics Instructor',
    }, workspaceHeaders);

    assert(createStaffRes.status === 201 || createStaffRes.status === 200, 'Create Teaching Staff returns 201/200');
    const staffData = getData(createStaffRes);
    const staffId = staffData.id;
    assert(staffId, `Staff created with ID: ${staffId}`);
    assert(staffData.email === teacherEmail, 'Staff email recorded correctly');

    // 3. Test Staff Profile Photo Avatar Upload
    console.log('\nStep 3: Upload Staff Photo Avatar (Admin)...');
    // Create a 1x1 valid PNG image buffer
    const pngMagicBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    // Construct multipart form-data
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let bodyBuffer = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="avatar.png"\r\nContent-Type: image/png\r\n\r\n`),
      pngMagicBytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const uploadRes = await makeRequest(
      `${API_BASE}/api/v1/staff/${staffId}/photo`,
      'POST',
      bodyBuffer,
      {
        ...workspaceHeaders,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length,
      }
    );

    assert(uploadRes.status === 201 || uploadRes.status === 200, 'Upload staff photo avatar returns 200/201');

    // Retrieve staff photo
    const getPhotoRes = await makeRequest(`${API_BASE}/api/v1/staff/${staffId}/photo`, 'GET', null, workspaceHeaders);
    assert(getPhotoRes.status === 200, 'Get staff photo avatar returns 200 OK');
    assert(getPhotoRes.headers['content-type'] === 'image/png', 'Get photo returns Content-Type image/png');

    // 4. Test Email Validation Controls for Provisioning
    console.log('\nStep 4: Test Email Validation Controls for Teacher Provisioning...');
    const syntheticFailRes = await makeRequest(
      `${API_BASE}/api/v1/portal/account/staff/${staffId}/provision`,
      'POST',
      { email: 'teacher@school.internal' },
      workspaceHeaders
    );
    assert(syntheticFailRes.status === 400, 'Synthetic @school.internal email rejected with 400 Bad Request');

    // 5. Provision Teacher Portal Account with Real Email
    console.log('\nStep 5: Provision Teacher Portal Account with Real Email...');
    const provisionRes = await makeRequest(
      `${API_BASE}/api/v1/portal/account/staff/${staffId}/provision`,
      'POST',
      { email: teacherEmail },
      workspaceHeaders
    );

    const provisionData = getData(provisionRes);
    assert(provisionRes.status === 201 || provisionRes.status === 200, 'Provision teacher portal account returns 200/201');
    assert(provisionData.token, 'Provision returns raw single-use activation token');
    assert(provisionData.emailSent !== undefined, 'Provision returns honest emailSent status');

    const rawToken = provisionData.token;

    // Check invitation status endpoint
    const statusRes = await makeRequest(
      `${API_BASE}/api/v1/portal/account/staff/${staffId}/invitation-status`,
      'GET',
      null,
      workspaceHeaders
    );
    const statusData = getData(statusRes);
    assert(statusRes.status === 200, 'Get staff invitation status returns 200 OK');
    assert(statusData.status === 'INVITED' || statusData.status === 'PENDING', 'Staff invitation status is INVITED/PENDING');

    // 6. Public Activation Token Validation
    console.log('\nStep 6: Validate Activation Token Publicly...');
    const validateRes = await makeRequest(
      `${API_BASE}/api/v1/portal/account/validate-token?token=${rawToken}`,
      'GET'
    );
    const validateData = getData(validateRes);

    assert(validateRes.status === 200, 'Public validate-token returns 200 OK');
    assert(validateData.valid === true, 'Validate-token returns valid: true');
    assert(validateData.targetType === 'STAFF', 'Validate-token returns targetType STAFF');

    // 7. Activate Account & Set Password
    console.log('\nStep 7: Activate Teacher Account & Set Password...');
    const newPassword = 'TeacherPassword123!';
    const activateRes = await makeRequest(
      `${API_BASE}/api/v1/portal/account/activate`,
      'POST',
      { token: rawToken, password: newPassword }
    );
    const activateData = getData(activateRes);

    assert(activateRes.status === 200, 'Activate account returns 200 OK');
    assert(activateData.success === true, 'Activation returns success: true');
    assert(activateData.redirectUrl === '/portal/teacher/dashboard', 'Activation returns Teacher Portal redirectUrl');

    // Re-validate consumed token
    const revalidateRes = await makeRequest(
      `${API_BASE}/api/v1/portal/account/validate-token?token=${rawToken}`,
      'GET'
    );
    const revalidateData = getData(revalidateRes);
    assert(revalidateData.valid === false, 'Consumed token is now invalid');
    assert(revalidateData.status === 'CONSUMED', 'Consumed token returns status CONSUMED');

    // 8. Authenticate Teacher via /login
    console.log('\nStep 8: Authenticate Teacher via /login...');
    const teacherLoginRes = await makeRequest(`${API_BASE}/api/v1/auth/login`, 'POST', {
      email: teacherEmail,
      password: newPassword,
    });

    assert(teacherLoginRes.status === 200, 'Teacher /login returns 200 OK');
    const teacherLoginData = getData(teacherLoginRes);
    const teacherToken = teacherLoginData?.accessToken || teacherLoginRes.data?.accessToken;
    assert(teacherToken, 'Teacher receives JWT accessToken');

    const teacherAuthHeaders = { Authorization: `Bearer ${teacherToken}` };

    // 9. Identity Context Discovery (/auth/me)
    console.log('\nStep 9: Test Teacher Identity Context Discovery (/auth/me)...');
    const teacherMeRes = await makeRequest(`${API_BASE}/api/v1/auth/me`, 'GET', null, teacherAuthHeaders);
    const teacherMeData = getData(teacherMeRes);
    assert(teacherMeRes.status === 200, 'Teacher GET /auth/me returns 200 OK');
    assert(teacherMeData.portalType === 'TEACHER', 'Teacher identity discovers portalType: TEACHER');
    assert(teacherMeData.redirectUrl === '/portal/teacher/dashboard', 'Teacher identity discovers redirectUrl: /portal/teacher/dashboard');
    assert(teacherMeData.staffId === staffId, 'Teacher identity returns correct staffId');

    // 10. Teacher Portal BFF Endpoints
    console.log('\nStep 10: Test Teacher Portal BFF Endpoints...');
    const teacherWorkspaceHeaders = {
      ...teacherAuthHeaders,
      'x-tenant-id': tenantId,
      'x-school-id': schoolId,
    };

    // GET /portal/teacher/dashboard
    const dashboardRes = await makeRequest(`${API_BASE}/api/v1/portal/teacher/dashboard`, 'GET', null, teacherWorkspaceHeaders);
    const dashboardData = getData(dashboardRes);
    assert(dashboardRes.status === 200, 'GET /portal/teacher/dashboard returns 200 OK');
    assert(dashboardData.teacherName.includes('Emily Watson'), 'Dashboard returns teacher name');

    // GET /portal/teacher/profile
    const profileRes = await makeRequest(`${API_BASE}/api/v1/portal/teacher/profile`, 'GET', null, teacherWorkspaceHeaders);
    const profileData = getData(profileRes);
    assert(profileRes.status === 200, 'GET /portal/teacher/profile returns 200 OK');
    assert(profileData.email === teacherEmail, 'Profile returns teacher email');
    assert(profileData.hasPhoto === true, 'Profile confirms avatar photo present');

    // PATCH /portal/teacher/profile
    const patchProfileRes = await makeRequest(`${API_BASE}/api/v1/portal/teacher/profile`, 'PATCH', { phone: '+2349000000000' }, teacherWorkspaceHeaders);
    const patchProfileData = getData(patchProfileRes);
    assert(patchProfileRes.status === 200, 'PATCH /portal/teacher/profile returns 200 OK');
    assert(patchProfileData.phone === '+2349000000000', 'Profile phone updated');

    // GET /portal/teacher/profile/photo
    const selfPhotoRes = await makeRequest(`${API_BASE}/api/v1/portal/teacher/profile/photo`, 'GET', null, teacherWorkspaceHeaders);
    assert(selfPhotoRes.status === 200, 'GET /portal/teacher/profile/photo returns 200 OK');
    assert(selfPhotoRes.headers['content-type'] === 'image/png', 'Self photo returns image/png');

    // GET /portal/teacher/timetable
    const timetableRes = await makeRequest(`${API_BASE}/api/v1/portal/teacher/timetable`, 'GET', null, teacherWorkspaceHeaders);
    assert(timetableRes.status === 200, 'GET /portal/teacher/timetable returns 200 OK');

    // GET /portal/teacher/classes
    const classesRes = await makeRequest(`${API_BASE}/api/v1/portal/teacher/classes`, 'GET', null, teacherWorkspaceHeaders);
    assert(classesRes.status === 200, 'GET /portal/teacher/classes returns 200 OK');

    console.log('\n=== TEST RESULTS SUMMARY ===');
    console.log(`Passed: ${passed}/${total} assertions`);

    if (passed === total) {
      console.log('>>> PHASE 5F LIVE E2E SUITE CERTIFIED COMPLETE & PASSED! <<<');
    } else {
      console.error('!!! SUITE HAD FAILURES !!!');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Unhandled test failure:', err);
    process.exitCode = 1;
  }
}

runTest();
