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
  console.log('🧪 Test End-to-End Backend Phase 5 (Web3 Credentials)\n');
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
    const t1Token = await loginWithWallet(TEACHER_PK);
    const s1Token = await loginWithWallet(STUDENT_PK);

    // 1. Create Challenge & Join & Submit
    const chalRes = await axios.post(`${API_URL}/challenges`, {
      title: 'Web3 Phase 5 Challenge',
      description: 'Test Web3 Claiming',
      subject: 'Toán',
      challengeType: 'Project',
      deadline: new Date(Date.now() + 86400000).toISOString()
    }, { headers: { Authorization: `Bearer ${t1Token}` } });
    const challengeId = chalRes.data.challenge._id;

    await axios.post(`${API_URL}/challenges/${challengeId}/join`, {}, { headers: { Authorization: `Bearer ${s1Token}` } });
    const partsRes = await axios.get(`${API_URL}/participations/me`, { headers: { Authorization: `Bearer ${s1Token}` } });
    const partId = partsRes.data.participations.find(p => p.challenge._id === challengeId || p.challenge === challengeId)._id;
    
    await axios.post(`${API_URL}/participations/${partId}/submissions`, { content: 'My Final submission for Phase 5' }, { headers: { Authorization: `Bearer ${s1Token}` } });
    const subsRes = await axios.get(`${API_URL}/participations/${partId}/submissions`, { headers: { Authorization: `Bearer ${t1Token}` } }); // Teacher fetches
    const submissionId = subsRes.data.submissions[0]._id;

    // 2. Teacher Evaluates as FINAL (Triggers Achievement)
    await axios.post(`${API_URL}/submissions/${submissionId}/evaluate`, {
      teacherTotalScore: 9.5,
      teacherFeedback: 'Excellent work!',
      status: 'FINAL'
    }, { headers: { Authorization: `Bearer ${t1Token}` } });

    // 3. Student fetches Achievements
    const achRes = await axios.get(`${API_URL}/achievements/me`, { headers: { Authorization: `Bearer ${s1Token}` } });
    const achievements = achRes.data.achievements;
    assert(achievements.length > 0, 'Student received Achievement after FINAL evaluation');
    
    // Tìm Achievement vừa sinh ra
    const latestAch = achievements.find(a => a.challenge._id === challengeId || a.challenge === challengeId);
    
    console.log('\n--- Web3 Claim Flow ---');
    // 4. Request Claim Message
    const msgRes = await axios.get(`${API_URL}/credentials/claim-message/${latestAch._id}`, { headers: { Authorization: `Bearer ${s1Token}` } });
    assert(msgRes.status === 200, 'Claim message generated successfully');
    
    const { messageToSign, credentialId } = msgRes.data;
    
    // 5. Sign Message using Student PK
    const studentWallet = new ethers.Wallet(STUDENT_PK);
    const signature = await studentWallet.signMessage(messageToSign);
    
    // Try to claim with wrong PK (Replay / spoof)
    const teacherWallet = new ethers.Wallet(TEACHER_PK);
    const badSignature = await teacherWallet.signMessage(messageToSign);
    try {
      await axios.post(`${API_URL}/credentials/claim`, { credentialId, signature: badSignature }, { headers: { Authorization: `Bearer ${s1Token}` } });
      assert(false, 'Should block claim with wrong signature');
    } catch (e) {
      assert(e.response.status === 400, 'Blocked bad signature claim');
    }

    // 6. Valid Claim
    const claimRes = await axios.post(`${API_URL}/credentials/claim`, { credentialId, signature }, { headers: { Authorization: `Bearer ${s1Token}` } });
    assert(claimRes.status === 200, 'Valid claim succeeded');
    assert(claimRes.data.credential.status === 'ANCHORED', 'Credential status is ANCHORED');
    assert(claimRes.data.credential.blockchain.transactionHash != null, 'Blockchain TxHash is recorded');

    // 7. Verify Public API
    console.log('\n--- Web3 Verification Flow ---');
    const verifyRes = await axios.get(`${API_URL}/credentials/${credentialId}/verify`);
    assert(verifyRes.status === 200, 'Public verify API returns 200');
    assert(verifyRes.data.verified === true, 'Verification is TRUE on-chain');
    assert(verifyRes.data.details.hashMatch === true, 'Metadata Hash Matches');
    assert(verifyRes.data.details.ownershipMatch === true, 'Ownership Matches');
    
    console.log('\n========================================');
    console.log(`🧪 Results: ${passCount} PASS, ${failCount} FAIL`);
    console.log('========================================\n');
    process.exit(failCount > 0 ? 1 : 0);

  } catch (err) {
    console.error('Test crashed:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

runTests();
