import api from './api';

const getRecruiterHubAnalysis = async (dynastyId) => {
  const response = await api.get(`/dynasties/${dynastyId}/recruiter-hub`);
  return response.data;
};

const getConfig = async (dynastyId) => {
  const response = await api.get(`/dynasties/${dynastyId}/recruiter-hub/config`);
  return response.data;
};

const saveConfig = async (dynastyId, positionTargets) => {
  const response = await api.put(`/dynasties/${dynastyId}/recruiter-hub/config`, { positionTargets });
  return response.data;
};

const getRecruitingBoard = async (dynastyId) => {
  const response = await api.get(`/dynasties/${dynastyId}/recruiter-hub/board`);
  return response.data;
};

const recruiterHubService = {
  getRecruiterHubAnalysis,
  getConfig,
  saveConfig,
  getRecruitingBoard,
};

export default recruiterHubService;
