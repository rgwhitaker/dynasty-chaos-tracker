import api from './api';

const getMappingConfig = async (dynastyId) => {
  const response = await api.get(`/dynasties/${dynastyId}/depth-chart/config`);
  return response.data;
};

const saveMappingConfig = async (dynastyId, depthChartMapping) => {
  const response = await api.put(`/dynasties/${dynastyId}/depth-chart/config`, { depthChartMapping });
  return response.data;
};

const resetMappingConfig = async (dynastyId) => {
  const response = await api.delete(`/dynasties/${dynastyId}/depth-chart/config`);
  return response.data;
};

const getArchetypeGroups = async (dynastyId) => {
  const response = await api.get(`/dynasties/${dynastyId}/depth-chart/archetype-groups`);
  return response.data;
};

const saveArchetypeGroups = async (dynastyId, archetypeGroups) => {
  const response = await api.put(`/dynasties/${dynastyId}/depth-chart/archetype-groups`, { archetypeGroups });
  return response.data;
};

const resetArchetypeGroups = async (dynastyId) => {
  const response = await api.delete(`/dynasties/${dynastyId}/depth-chart/archetype-groups`);
  return response.data;
};

const depthChartService = {
  getMappingConfig,
  saveMappingConfig,
  resetMappingConfig,
  getArchetypeGroups,
  saveArchetypeGroups,
  resetArchetypeGroups,
};

export default depthChartService;
