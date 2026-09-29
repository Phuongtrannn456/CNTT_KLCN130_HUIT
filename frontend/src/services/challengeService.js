import apiService from './apiService';

const challengeService = {
  // =====================
  // K-12 CHALLENGE APIs
  // =====================
  getChallenges: async () => {
    const response = await apiService.get('/challenges');
    return response.data;
  },
  getChallengeById: async (id) => {
    const response = await apiService.get(`/challenges/${id}`);
    return response.data;
  },
  createChallenge: async (challengeData) => {
    const response = await apiService.post('/challenges', challengeData);
    return response.data;
  },
  updateChallenge: async (id, challengeData) => {
    const response = await apiService.put(`/challenges/${id}`, challengeData);
    return response.data;
  },
  deleteChallenge: async (id) => {
    const response = await apiService.delete(`/challenges/${id}`);
    return response.data;
  },

  // =====================
  // K-12 PARTICIPATION APIs
  // =====================
  joinChallenge: async (id) => {
    const response = await apiService.post(`/challenges/${id}/join`, {});
    return response.data;
  },
  getMyParticipations: async () => {
    const response = await apiService.get('/participations/me');
    return response.data;
  },
  getParticipants: async (id) => {
    const response = await apiService.get(`/challenges/${id}/participants`);
    return response.data;
  },

  // =====================
  // K-12 SUBMISSION APIs
  // =====================
  submitWork: async (participationId, data) => {
    const response = await apiService.post(`/participations/${participationId}/submissions`, data);
    return response.data;
  },
  getSubmissions: async (participationId) => {
    const response = await apiService.get(`/participations/${participationId}/submissions`);
    return response.data;
  },

  // =====================
  // K-12 EVALUATION & RESULT APIs
  // =====================
  evaluateSubmission: async (submissionId, data) => {
    const response = await apiService.post(`/submissions/${submissionId}/evaluate`, data);
    return response.data;
  },
  getEvaluation: async (submissionId) => {
    const response = await apiService.get(`/submissions/${submissionId}/evaluation`);
    return response.data;
  },
  getMyAchievements: async () => {
    const response = await apiService.get('/achievements/me');
    return response.data;
  },

  // =====================
  // PHASE 4 - AI APIs
  // =====================
  getRecommendedChallenges: async () => {
    const response = await apiService.get('/ai/recommended-challenges');
    return response.data;
  },
  analyzeSubmission: async (submissionId) => {
    const response = await apiService.post(`/ai/submissions/${submissionId}/analyze`, {});
    return response.data;
  },
  suggestEvaluation: async (submissionId) => {
    const response = await apiService.post(`/ai/submissions/${submissionId}/evaluate-suggest`, {});
    return response.data;
  }
};

export default challengeService;
