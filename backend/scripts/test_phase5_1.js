const axios = require('axios');
const { ethers } = require('ethers');

const API_URL = 'http://127.0.0.1:5000/api';
const TEACHER_PK = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const STUDENT_PK = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6';

async function loginWithWallet(pk) {
  const wallet = new ethers.Wallet(pk);
  const chRes = await axios.post(`${API_URL}/auth/challenge`, { walletAddress: wallet.address });
  const signature = await wallet.signMessage(chRes.data.challenge);
  const vRes = await axios.post(`${API_URL}/auth/verify`, { challengeId: chRes.data.challengeId, signature });
  return vRes.data.token;
}

async function runTests() {
  console.log('🧪 Test Phase 5.1 (Security, Privacy & Revoke)\n');
  let passCount = 0;
  let failCount = 0;

  const assert = (condition, msg) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${msg}`);
      passCount++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      failCount++;
    }
  };

  try {
    const tToken = await loginWithWallet(TEACHER_PK);
    const sToken = await loginWithWallet(STUDENT_PK);

    // Setup Challenge -> Participate -> Submit -> Eval -> Achievement
    const chalRes = await axios.post(`${API_URL}/challenges`, {
      title: 'Phase 5.1 Challenge',
      description: 'Test Privacy and Revoke',
      subject: 'Toán',
      challengeType: 'Project',
      deadline: new Date(Date.now() + 86400000).toISOString()
    }, { headers: { Authorization: `Bearer ${tToken}` } });
    const challengeId = chalRes.data.challenge._id;

    await axios.post(`${API_URL}/challenges/${challengeId}/join`, {}, { headers: { Authorization: `Bearer ${sToken}` } });
    const partsRes = await axios.get(`${API_URL}/participations/me`, { headers: { Authorization: `Bearer ${sToken}` } });
    const partId = partsRes.data.participations.find(p => p.challenge._id === challengeId || p.challenge === challengeId)._id;
    
    await axios.post(`${API_URL}/participations/${partId}/submissions`, { content: 'My Phase 5.1 submission' }, { headers: { Authorization: `Bearer ${sToken}` } });
    const subsRes = await axios.get(`${API_URL}/participations/${partId}/submissions`, { headers: { Authorization: `Bearer ${tToken}` } });
    const submissionId = subsRes.data.submissions[0]._id;

    await axios.post(`${API_URL}/submissions/${submissionId}/evaluate`, {
      teacherTotalScore: 10,
      teacherFeedback: 'Perfect!',
      status: 'FINAL'
    }, { headers: { Authorization: `Bearer ${tToken}` } });

    const achRes = await axios.get(`${API_URL}/achievements/me`, { headers: { Authorization: `Bearer ${sToken}` } });
    const latestAch = achRes.data.achievements.find(a => a.challenge._id === challengeId || a.challenge === challengeId);
    
    // Claim Flow
    const msgRes = await axios.get(`${API_URL}/credentials/claim-message/${latestAch._id}`, { headers: { Authorization: `Bearer ${sToken}` } });
    const { messageToSign, credentialId } = msgRes.data;
    const studentWallet = new ethers.Wallet(STUDENT_PK);
    const signature = await studentWallet.signMessage(messageToSign);
    
    await axios.post(`${API_URL}/credentials/claim`, { credentialId, signature }, { headers: { Authorization: `Bearer ${sToken}` } });
    
    // 1. Replay Attack Protection
    try {
      await axios.post(`${API_URL}/credentials/claim`, { credentialId, signature }, { headers: { Authorization: `Bearer ${sToken}` } });
      assert(false, 'Should block replay signature');
    } catch (e) {
      assert(e.response.status === 400, 'Replay Signature successfully blocked');
    }

    // 2. Public Verify Privacy Audit
    console.log('\n--- Privacy Audit ---');
    const verifyRes = await axios.get(`${API_URL}/credentials/${credentialId}/verify`);
    const publicData = verifyRes.data.data;
    
    const piiKeys = ['fullName', 'email', 'studentId', 'school', 'gpa', 'finalGrade', 'submission', 'issuerName'];
    const containsPII = piiKeys.some(key => Object.keys(publicData).includes(key) || Object.keys(publicData.challenge || {}).includes(key));
    
    assert(!containsPII, 'Public response completely free of PII');
    assert(publicData.challenge === 'Phase 5.1 Challenge', 'Exposes only Challenge Title safely');
    assert(publicData.studentWallet != null, 'Exposes student wallet for ownership check');
    assert(verifyRes.data.verified === true, 'Initially Verified = true');

    // 3. Teacher Revokes Credential
    console.log('\n--- Revoke Audit ---');
    // Unauthorized student trying to revoke
    try {
      await axios.post(`${API_URL}/credentials/${credentialId}/revoke`, {}, { headers: { Authorization: `Bearer ${sToken}` } });
      assert(false, 'Student should not revoke');
    } catch (e) {
      assert(e.response.status === 403, 'Student prevented from revoking');
    }

    // Authorized Teacher
    const revokeRes = await axios.post(`${API_URL}/credentials/${credentialId}/revoke`, {}, { headers: { Authorization: `Bearer ${tToken}` } });
    assert(revokeRes.status === 200, 'Teacher successfully revoked credential');

    // 4. Verify after Revoke
    const verifyRevoked = await axios.get(`${API_URL}/credentials/${credentialId}/verify`);
    assert(verifyRevoked.data.verified === false, 'Verified flag is FALSE after revoke');
    
    assert(verifyRevoked.data.data.status === 'REVOKED', 'Database status is REVOKED');

    console.log('\n========================================');
    console.log(`🧪 Phase 5.1 Results: ${passCount} PASS, ${failCount} FAIL`);
    console.log('========================================\n');
    process.exit(failCount > 0 ? 1 : 0);

  } catch (err) {
    console.error('Test crashed:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

runTests();
