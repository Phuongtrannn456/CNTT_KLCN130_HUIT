const axios = require('axios');
const { ethers } = require('ethers');

const API_URL = 'http://127.0.0.1:5000/api';

const TEACHER1_PK = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const TEACHER2_PK = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
const STUDENT_PK = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6';
const STUDENT2_PK = '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a'; 

async function loginWithWallet(pk) {
  const wallet = new ethers.Wallet(pk);
  const chRes = await axios.post(`${API_URL}/auth/challenge`, { walletAddress: wallet.address });
  const signature = await wallet.signMessage(chRes.data.challenge);
  const vRes = await axios.post(`${API_URL}/auth/verify`, { challengeId: chRes.data.challengeId, signature });
  return vRes.data.token;
}

async function runTests() {
  console.log('🧪 Test End-to-End Backend Phase 4 (AI Features)\n');
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
    const t1Token = await loginWithWallet(TEACHER1_PK);
    const s1Token = await loginWithWallet(STUDENT_PK);
    const s2Token = await loginWithWallet(STUDENT2_PK);

    // 1. Create a Challenge with Rubrics
    const chalRes = await axios.post(`${API_URL}/challenges`, {
      title: 'AI Education Phase 4 Test Challenge',
      description: 'Test AI capabilities',
      requirements: ['Must be good'],
      subject: 'Tin học',
      eligibleGrades: [10],
      deadline: new Date(Date.now() + 86400000).toISOString(),
      maxTeamSize: 1,
      challengeType: 'Project',
      useRubrics: true,
      rubrics: [
        { criteriaName: 'Accuracy', weight: 50, maxScore: 5 },
        { criteriaName: 'Creativity', weight: 50, maxScore: 5 }
      ]
    }, { headers: { Authorization: `Bearer ${t1Token}` } });
    const challengeId = chalRes.data.challenge._id;

    console.log('\n--- 4.1 AI Matching ---');
    const matchRes = await axios.get(`${API_URL}/ai/recommended-challenges`, {
      headers: { Authorization: `Bearer ${s1Token}` }
    });
    assert(matchRes.status === 200, 'Recommendation API returns 200 OK');
    assert(matchRes.data.success === true, 'Recommendation API success field is true');
    assert(Array.isArray(matchRes.data.recommendations), 'Returns an array of recommendations');
    if (!matchRes.data.aiAvailable) {
      console.log('  ⚠️ AI Server offline, graceful fallback triggered.');
    }

    try {
      await axios.get(`${API_URL}/ai/recommended-challenges`, { headers: { Authorization: `Bearer ${t1Token}` } });
      assert(false, 'Teacher should not access student recommendations');
    } catch (e) {
      assert(e.response.status === 403, 'Teacher prevented from accessing matching');
    }

    // Join & Submit
    await axios.post(`${API_URL}/challenges/${challengeId}/join`, {}, { headers: { Authorization: `Bearer ${s1Token}` } });
    const partsRes = await axios.get(`${API_URL}/participations/me`, { headers: { Authorization: `Bearer ${s1Token}` } });
    const partId = partsRes.data.participations.find(p => p.challenge._id === challengeId || p.challenge === challengeId)._id;
    
    await axios.post(`${API_URL}/participations/${partId}/submissions`, { content: 'My test submission content' }, { headers: { Authorization: `Bearer ${s1Token}` } });
    const subsRes = await axios.get(`${API_URL}/participations/${partId}/submissions`, { headers: { Authorization: `Bearer ${s1Token}` } });
    const submissionId = subsRes.data.submissions[0]._id;

    console.log('\n--- 4.2 Submission Analysis ---');
    const analyzeRes = await axios.post(`${API_URL}/ai/submissions/${submissionId}/analyze`, {}, {
      headers: { Authorization: `Bearer ${s1Token}` }
    });
    assert(analyzeRes.status === 200, 'Analysis API returns 200 OK');
    
    try {
      await axios.post(`${API_URL}/ai/submissions/${submissionId}/analyze`, {}, { headers: { Authorization: `Bearer ${s2Token}` } });
      assert(false, 'Other student should not analyze submission');
    } catch (e) {
      assert(e.response.status === 403, 'Unauthorized student prevented from analysis');
    }

    console.log('\n--- 4.4 Suggested Evaluation ---');
    try {
      await axios.post(`${API_URL}/ai/submissions/${submissionId}/evaluate-suggest`, {}, { headers: { Authorization: `Bearer ${s1Token}` } });
      assert(false, 'Student should not request evaluation suggestion');
    } catch (e) {
      assert(e.response.status === 403, 'Student prevented from evaluate-suggest');
    }

    const evalSuggestRes = await axios.post(`${API_URL}/ai/submissions/${submissionId}/evaluate-suggest`, {}, {
      headers: { Authorization: `Bearer ${t1Token}` }
    });
    assert(evalSuggestRes.status === 200, 'Teacher can request evaluate-suggest');
    assert(evalSuggestRes.data.success === true, 'Suggestion API success field is true');

    try {
      const getEval = await axios.get(`${API_URL}/submissions/${submissionId}/evaluation`, { headers: { Authorization: `Bearer ${t1Token}` } });
      assert(getEval.data.evaluation.status !== 'FINAL', 'Evaluation status is not FINALized by AI');
    } catch (e) {
      assert(true, 'No final evaluation created directly by AI');
    }

    console.log('\n========================================');
    console.log(`🧪 Results: ${passCount} PASS, ${failCount} FAIL (Total: ${passCount + failCount})`);
    console.log('========================================\n');
    process.exit(failCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test crashed:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

runTests();
