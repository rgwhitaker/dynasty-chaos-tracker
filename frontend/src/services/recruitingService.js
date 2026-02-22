import api from './api';

const getRecruits = async (dynastyId, token) => {
  const response = await api.get(`/dynasties/${dynastyId}/recruiting`);
  return response.data;
};

const getRecruitingTargets = async (dynastyId, token) => {
  const response = await api.get(`/dynasties/${dynastyId}/recruiting/targets`);
  return response.data;
};

const createRecruit = async (dynastyId, recruitData, token) => {
  const response = await api.post(`/dynasties/${dynastyId}/recruiting`, recruitData);
  return response.data;
};

const updateRecruit = async (dynastyId, recruitId, recruitData) => {
  const response = await api.put(`/dynasties/${dynastyId}/recruiting/${recruitId}`, recruitData);
  return response.data;
};

const deleteRecruit = async (dynastyId, recruitId) => {
  const response = await api.delete(`/dynasties/${dynastyId}/recruiting/${recruitId}`);
  return response.data;
};

const recruitingService = {
  getRecruits,
  getRecruitingTargets,
  createRecruit,
  updateRecruit,
  deleteRecruit,
};

export default recruitingService;
