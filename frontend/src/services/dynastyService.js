import api from './api';

const getDynasties = async (token) => {
  const response = await api.get('/dynasties');
  return response.data;
};

const getDynasty = async (id, token) => {
  const response = await api.get(`/dynasties/${id}`);
  return response.data;
};

const createDynasty = async (dynastyData, token) => {
  const response = await api.post('/dynasties', dynastyData);
  return response.data;
};

const updateDynasty = async (id, data, token) => {
  const response = await api.put(`/dynasties/${id}`, data);
  return response.data;
};

const updateSelectedPreset = async (id, selectedPresetId, token) => {
  const response = await api.patch(`/dynasties/${id}/preset`, { 
    selected_preset_id: selectedPresetId 
  });
  return response.data;
};

const deleteDynasty = async (id, token) => {
  const response = await api.delete(`/dynasties/${id}`);
  return response.data;
};

const dynastyService = {
  getDynasties,
  getDynasty,
  createDynasty,
  updateDynasty,
  updateSelectedPreset,
  deleteDynasty,
};

export default dynastyService;
