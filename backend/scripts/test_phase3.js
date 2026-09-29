require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const http = require('http');
const { ethers } = require('ethers');

const API_BASE = 'http://127.0.0.1:' + (process.env.PORT || 5000) + '/api';

const TEACHER1_PK = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const TEACHER2_PK = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
const STUDENT_PK = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6';
const STUDENT2_PK = '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a'; 

let results = [];
let t1Token = '', t2Token = '', s1Token = '', s2Token = '';
let challengeId = '';

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname, port: url.port, path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = 'Bearer ' + token;
    
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

async function loginWithWallet(pk) {
  const wallet = new ethers.Wallet(pk);
  const ch = await req('POST', '/auth/challenge', { walletAddress: wallet.address });
  const signature = await wallet.signMessage(ch.body.challenge);
  return await req('POST', '/auth/verify', { challengeId: ch.body.challengeId, signature });
}

function log(name, pass, detail) {
  const icon = pass ? 'PASS' : 'FAIL';
  console.log('  [' + icon + '] ' + name + (detail ? ' - ' + detail : ''));
  results.push({ name, pass, detail });
}

async function run() {
  console.log('Test End-to-End Backend Phase 3\n');

  console.log('--- 0. Setup ---');
  let r = await loginWithWallet(TEACHER1_PK); t1Token = r.body.token;
  r = await loginWithWallet(TEACHER2_PK); t2Token = r.body.token;
  r = await loginWithWallet(STUDENT_PK); s1Token = r.body.token;
  r = await loginWithWallet(STUDENT2_PK); s2Token = r.body.token;
  
  r = await req('POST', '/challenges', {
    title: 'Phase 3 Challenge', eligibleGrades: [10, 11, 12],
    deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    challengeType: 'Project'
  }, t1Token);
  challengeId = r.body.challenge._id;
  log('Create Challenge', true, challengeId);

  console.log('\n--- 1. Participation ---');
  r = await req('POST', '/challenges/' + challengeId + '/join', null, s1Token);
  if (r.status === 201) log('Student Join', true, '201 Created');
  else log('Student Join', false, r.status);

  r = await req('POST', '/challenges/' + challengeId + '/join', null, s1Token);
  if (r.status === 400) log('Duplicate Join Prevented', true, '400 Bad Request');
  else log('Duplicate Join Prevented', false, r.status);

  r = await req('POST', '/challenges/' + challengeId + '/join', null, t2Token);
  if (r.status === 403) log('Teacher Join Prevented', true, '403 Forbidden');
  else log('Teacher Join Prevented', false, r.status);

  r = await req('GET', '/challenges/' + challengeId + '/participants', null, t1Token);
  if (r.status === 200 && r.body.participants.length > 0) log('Read Participants (Owner)', true, '200 OK');
  else log('Read Participants (Owner)', false, r.status);

  r = await req('GET', '/challenges/' + challengeId + '/participants', null, t2Token);
  if (r.status === 403) log('Read Participants (Non-Owner Prevented)', true, '403 Forbidden');
  else log('Read Participants (Non-Owner Prevented)', false, r.status);

  r = await req('GET', '/participations/me', null, s1Token);
  if (r.status === 200 && r.body.participations.length > 0) log('Read My Participations', true, '200 OK');
  else log('Read My Participations', false, r.status);

  console.log('\n--- 2. Submission ---');
  const myParts = await req('GET', '/participations/me', null, s1Token);
  const pId = myParts.body.participations.find(p => (p.challenge._id || p.challenge) === challengeId)._id;
  
  r = await req('POST', '/participations/' + pId + '/submissions', { content: 'Code v1' }, s1Token);
  if (r.status === 201 && r.body.submission.version === 1) log('Submit v1', true, 'Version 1 created');
  else log('Submit v1', false, r.status);

  r = await req('POST', '/participations/' + pId + '/submissions', { content: 'Code v2' }, s1Token);
  if (r.status === 201 && r.body.submission.version === 2) log('Submit v2 (Resubmission)', true, 'Version 2 created');
  else log('Submit v2 (Resubmission)', false, r.status);

  r = await req('GET', '/participations/' + pId + '/submissions', null, s1Token);
  if (r.status === 200 && r.body.submissions.length === 2) log('View Submissions (Student)', true, '200 OK');
  else log('View Submissions (Student)', false, r.status);

  r = await req('GET', '/participations/' + pId + '/submissions', null, t1Token);
  if (r.status === 200) log('View Submissions (Owner)', true, '200 OK');
  else log('View Submissions (Owner)', false, r.status);

  r = await req('GET', '/participations/' + pId + '/submissions', null, t2Token);
  if (r.status === 403) log('View Submissions (Non-Owner Blocked)', true, '403 Forbidden');
  else log('View Submissions (Non-Owner Blocked)', false, r.status);

  r = await req('GET', '/participations/' + pId + '/submissions', null, s2Token);
  if (r.status === 403) log('View Submissions (Other Student Blocked)', true, '403 Forbidden');
  else log('View Submissions (Other Student Blocked)', false, r.status);

  console.log('\n--- 3. Evaluation & 4. Result ---');
  // L?y submission ID c?a version m?i nh?t
  const sRes = await req('GET', '/participations/' + pId + '/submissions', null, t1Token);
  const subId = sRes.body.submissions[0]._id;

  // Teacher 2 c? ch?m (Blocked 403)
  r = await req('POST', '/submissions/' + subId + '/evaluate', { teacherTotalScore: 8 }, t2Token);
  if (r.status === 403) log('Teacher 2 Eval (Blocked)', true, '403');
  else log('Teacher 2 Eval (Blocked)', false, r.status);

  // Student xem khi chua có gì (404)
  r = await req('GET', '/submissions/' + subId + '/evaluation', null, s1Token);
  if (r.status === 404) log('Student View Empty Eval', true, '404');
  else log('Student View Empty Eval', false, r.status);

  // Teacher 1 ch?m DRAFT
  r = await req('POST', '/submissions/' + subId + '/evaluate', { teacherTotalScore: 8, teacherFeedback: 'T?t', status: 'DRAFT' }, t1Token);
  if (r.status === 200 && r.body.evaluation.status === 'DRAFT') log('Teacher Eval (DRAFT)', true, '200 OK');
  else log('Teacher Eval (DRAFT)', false, r.status);

  // Student xem khi DRAFT (403 Blocked)
  r = await req('GET', '/submissions/' + subId + '/evaluation', null, s1Token);
  if (r.status === 403) log('Student View DRAFT Eval (Blocked)', true, '403');
  else log('Student View DRAFT Eval (Blocked)', false, r.status);

  // Teacher 1 ch?t FINAL
  r = await req('POST', '/submissions/' + subId + '/evaluate', { status: 'FINAL' }, t1Token);
  if (r.status === 200 && r.body.evaluation.status === 'FINAL') log('Teacher Eval (FINAL)', true, '200 OK');
  else log('Teacher Eval (FINAL)', false, r.status);

  // Student xem FINAL (OK 200)
  r = await req('GET', '/submissions/' + subId + '/evaluation', null, s1Token);
  if (r.status === 200) log('Student View FINAL Eval', true, '200 OK');
  else log('Student View FINAL Eval', false, r.status);

  // Teacher 1 c? s?a FINAL (Blocked 403)
  r = await req('POST', '/submissions/' + subId + '/evaluate', { teacherTotalScore: 9, status: 'FINAL' }, t1Token);
  if (r.status === 403) log('Edit FINAL Eval (Blocked)', true, '403');
  else log('Edit FINAL Eval (Blocked)', false, r.status);
  console.log('\n--- Summary ---');
  const failed = results.filter(x => !x.pass).length;
  console.log('Results: ' + results.filter(x => x.pass).length + ' PASS, ' + failed + ' FAIL');
  if (failed > 0) results.filter(x => !x.pass).forEach(x => console.log('  [FAIL] ' + x.name + ': ' + x.detail));
  process.exit(failed > 0 ? 1 : 0);
}
run().catch(e => { console.error('Fatal:', e); process.exit(1); });
