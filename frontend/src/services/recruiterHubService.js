import api from './api';

const getRecruiterHubAnalysis = async (dynastyId) => {
  const response = await api.get(`/dynasties/${dynastyId}/recruiter-hub`);
  return response.data;
};

const recruiterHubService = {
  getRecruiterHubAnalysis,
};

export default recruiterHubService;
