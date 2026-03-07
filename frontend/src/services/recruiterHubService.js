import api from './api';

const getRecruiterHubAnalysis = async (dynastyId) => {
  const response = await api.get(`/dynasties/${dynastyId}/recruiter-hub`);
  return response.data;
};

const getRecruitingBoard = async (dynastyId) => {
  const response = await api.get(`/dynasties/${dynastyId}/recruiter-hub/board`);
  return response.data;
};

const recruiterHubService = {
  getRecruiterHubAnalysis,
  getRecruitingBoard,
};

export default recruiterHubService;
