import api from './api';

/**
 * Get all weight presets for the current user
 */
export const getPresets = async () => {
  const response = await api.get('/stud-score/presets');
  return response.data;
};

/**
 * Create a new weight preset
 */
export const createPreset = async (preset) => {
  const response = await api.post('/stud-score/presets', preset);
  return response.data;
};

/**
 * Update preset dev trait and potential weights
 */
export const updatePreset = async (presetId, updates) => {
  const response = await api.put(`/stud-score/presets/${presetId}`, updates);
  return response.data;
};

/**
 * Get weights for a specific preset/position/archetype
 */
export const getWeights = async (presetId, position, archetype = null) => {
  const params = { presetId, position };
  if (archetype) {
    params.archetype = archetype;
  }
  const response = await api.get('/stud-score/weights', { params });
  return response.data;
};

/**
 * Get default weights for a position
 */
export const getDefaultWeights = async (position) => {
  const response = await api.get('/stud-score/weights/defaults', { 
    params: { position } 
  });
  return response.data;
};

/**
 * Update a single weight
 */
export const updateWeight = async (presetId, position, archetype, attributeName, weight) => {
  const response = await api.put('/stud-score/weights', {
    presetId,
    position,
    archetype,
    attributeName,
    weight
  });
  return response.data;
};

/**
 * Batch update weights for a position/archetype
 */
export const batchUpdateWeights = async (presetId, position, archetype, weights) => {
  const response = await api.post('/stud-score/weights/batch', {
    presetId,
    position,
    archetype,
    weights
  });
  return response.data;
};

/**
 * Reset weights to defaults for a position/archetype
 */
export const resetWeights = async (presetId, position, archetype = null) => {
  const response = await api.post('/stud-score/weights/reset', {
    presetId,
    position,
    archetype
  });
  return response.data;
};

/**
 * Get archetypes for a position
 */
export const getArchetypes = async (position) => {
  const response = await api.get('/stud-score/archetypes', { 
    params: { position } 
  });
  return response.data;
};

const studScoreServiceAPI = {
  getPresets,
  createPreset,
  updatePreset,
  getWeights,
  getDefaultWeights,
  updateWeight,
  batchUpdateWeights,
  resetWeights,
  getArchetypes
};

export default studScoreServiceAPI;
