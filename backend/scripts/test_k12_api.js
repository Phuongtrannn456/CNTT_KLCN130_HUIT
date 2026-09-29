/**
 * Test End-to-End Backend K-12
 * 
 * Chạy: MONGODB_URI=mongodb://127.0.0.1:27017/web3k12 node scripts/test_k12_api.js
 * 
 * Test bao gồm:
 * 1. Auth flow (ký challenge bằng ethers.js test wallet)
 * 2. Challenge CRUD (Teacher)
 * 3. Authorization (Student bị chặn create/update/delete)
 * 4. Ownership (Teacher không sửa/xóa Challenge của Teacher khác)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const http = require('http');
const { ethers } = require('ethers');

const API_BASE = `http://127.0.0.1:${process.env.PORT || 5000}/api`;

// Hardhat default test account private keys (publicly known, NOT secrets)
// Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
const TEACHER1_PK = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
// Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
const TEACHER2_PK = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
// Account #4: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
const STUDENT_PK = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6';

let results = [];
let teacherToken = '';
let teacher2Token = '';
let studentToken = '';
let createdChallengeId = '';

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function loginWithWallet(privateKey) {
  const wallet = new ethers.Wallet(privateKey);
  
  // Step 1: Get challenge
  const ch = await req('POST', '/auth/challenge', { walletAddress: wallet.address });
  if (!ch.body.success) throw new Error(`Challenge failed: ${JSON.stringify(ch.body)}`);
  
  // Step 2: Sign challenge
  const signature = await wallet.signMessage(ch.body.challenge);
  
  // Step 3: Verify
  const vr = await req('POST', '/auth/verify', { challengeId: ch.body.challengeId, signature });
  return vr;
}

function log(name, pass, detail) {
  const icon = pass ? '✅' : '❌';
  console.log(`  ${icon} ${name}${detail ? ' — ' + detail : ''}`);
  results.push({ name, pass, detail });
}

async function run() {
  console.log('🧪 Test End-to-End Backend K-12\n');

  // =====================
  // 1. AUTH TESTS
  // =====================
  console.log('--- 1. Authentication ---');
  
  try {
    const r = await loginWithWallet(TEACHER1_PK);
    if (r.body.token && r.body.user?.role_id === 'TEACHER_ROLE') {
      teacherToken = r.body.token;
      log('Teacher1 Login', true, `role=${r.body.user.role_id}`);
    } else {
      log('Teacher1 Login', false, JSON.stringify(r.body));
    }
  } catch (e) { log('Teacher1 Login', false, e.message); }

  try {
    const r = await loginWithWallet(TEACHER2_PK);
    if (r.body.token && r.body.user?.role_id === 'TEACHER_ROLE') {
      teacher2Token = r.body.token;
      log('Teacher2 Login', true, `role=${r.body.user.role_id}`);
    } else {
      log('Teacher2 Login', false, JSON.stringify(r.body));
    }
  } catch (e) { log('Teacher2 Login', false, e.message); }

  try {
    const r = await loginWithWallet(STUDENT_PK);
    if (r.body.token && r.body.user?.role_id === 'STUDENT_ROLE') {
      studentToken = r.body.token;
      log('Student Login', true, `role=${r.body.user.role_id}`);
    } else {
      log('Student Login', false, JSON.stringify(r.body));
    }
  } catch (e) { log('Student Login', false, e.message); }

  // =====================
  // 2. CHALLENGE READ
  // =====================
  console.log('\n--- 2. Challenge Read ---');
  
  try {
    const r = await req('GET', '/challenges', null, teacherToken);
    if (r.status === 200 && r.body.success && Array.isArray(r.body.challenges)) {
      log('GET /challenges (Teacher)', true, `count=${r.body.challenges.length}`);
    } else {
      log('GET /challenges (Teacher)', false, `status=${r.status}`);
    }
  } catch (e) { log('GET /challenges (Teacher)', false, e.message); }

  try {
    const r = await req('GET', '/challenges', null, studentToken);
    if (r.status === 200 && r.body.success) {
      log('GET /challenges (Student)', true, `count=${r.body.challenges.length}`);
    } else {
      log('GET /challenges (Student)', false, `status=${r.status}`);
    }
  } catch (e) { log('GET /challenges (Student)', false, e.message); }

  // =====================
  // 3. CHALLENGE CREATE
  // =====================
  console.log('\n--- 3. Challenge Create ---');
  
  try {
    const r = await req('POST', '/challenges', {
      title: 'Test Challenge từ API',
      description: 'Challenge tạo bởi test script',
      eligibleGrades: [10, 11],
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      subject: 'Test',
      challengeType: 'Project'
    }, teacherToken);
    if (r.status === 201 && r.body.success) {
      createdChallengeId = r.body.challenge._id;
      log('POST /challenges (Teacher)', true, `id=${createdChallengeId}`);
    } else {
      log('POST /challenges (Teacher)', false, `status=${r.status} ${JSON.stringify(r.body)}`);
    }
  } catch (e) { log('POST /challenges (Teacher)', false, e.message); }

  // Student KHÔNG được create
  try {
    const r = await req('POST', '/challenges', {
      title: 'Student Hack Challenge',
      deadline: new Date().toISOString()
    }, studentToken);
    if (r.status === 403) {
      log('POST /challenges (Student blocked)', true, `status=403`);
    } else {
      log('POST /challenges (Student blocked)', false, `status=${r.status} — should be 403`);
    }
  } catch (e) { log('POST /challenges (Student blocked)', false, e.message); }

  // =====================
  // 4. CHALLENGE UPDATE
  // =====================
  console.log('\n--- 4. Challenge Update ---');
  
  if (createdChallengeId) {
    // Teacher1 (owner) UPDATE — should succeed
    try {
      const r = await req('PUT', `/challenges/${createdChallengeId}`, {
        title: 'Test Challenge Updated'
      }, teacherToken);
      if (r.status === 200 && r.body.success) {
        log('PUT /challenges (Owner)', true, `title=${r.body.challenge.title}`);
      } else {
        log('PUT /challenges (Owner)', false, `status=${r.status}`);
      }
    } catch (e) { log('PUT /challenges (Owner)', false, e.message); }

    // Teacher2 (NOT owner) UPDATE — should be 403
    try {
      const r = await req('PUT', `/challenges/${createdChallengeId}`, {
        title: 'Hacked by Teacher2'
      }, teacher2Token);
      if (r.status === 403) {
        log('PUT /challenges (Non-owner blocked)', true, `status=403`);
      } else {
        log('PUT /challenges (Non-owner blocked)', false, `status=${r.status} — should be 403`);
      }
    } catch (e) { log('PUT /challenges (Non-owner blocked)', false, e.message); }

    // Student UPDATE — should be 403
    try {
      const r = await req('PUT', `/challenges/${createdChallengeId}`, {
        title: 'Hacked by Student'
      }, studentToken);
      if (r.status === 403) {
        log('PUT /challenges (Student blocked)', true, `status=403`);
      } else {
        log('PUT /challenges (Student blocked)', false, `status=${r.status} — should be 403`);
      }
    } catch (e) { log('PUT /challenges (Student blocked)', false, e.message); }
  }

  // =====================
  // 5. CHALLENGE DELETE
  // =====================
  console.log('\n--- 5. Challenge Delete ---');
  
  if (createdChallengeId) {
    // Teacher2 (NOT owner) DELETE — should be 403
    try {
      const r = await req('DELETE', `/challenges/${createdChallengeId}`, null, teacher2Token);
      if (r.status === 403) {
        log('DELETE /challenges (Non-owner blocked)', true, `status=403`);
      } else {
        log('DELETE /challenges (Non-owner blocked)', false, `status=${r.status} — should be 403`);
      }
    } catch (e) { log('DELETE /challenges (Non-owner blocked)', false, e.message); }

    // Student DELETE — should be 403
    try {
      const r = await req('DELETE', `/challenges/${createdChallengeId}`, null, studentToken);
      if (r.status === 403) {
        log('DELETE /challenges (Student blocked)', true, `status=403`);
      } else {
        log('DELETE /challenges (Student blocked)', false, `status=${r.status} — should be 403`);
      }
    } catch (e) { log('DELETE /challenges (Student blocked)', false, e.message); }

    // Teacher1 (owner) DELETE — should succeed
    try {
      const r = await req('DELETE', `/challenges/${createdChallengeId}`, null, teacherToken);
      if (r.status === 200 && r.body.success) {
        log('DELETE /challenges (Owner)', true);
      } else {
        log('DELETE /challenges (Owner)', false, `status=${r.status}`);
      }
    } catch (e) { log('DELETE /challenges (Owner)', false, e.message); }
  }

  // =====================
  // SUMMARY
  // =====================
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log('\n========================================');
  console.log(`🧪 Results: ${passed} PASS, ${failed} FAIL (Total: ${results.length})`);
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.pass).forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
  }
  console.log('========================================');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
