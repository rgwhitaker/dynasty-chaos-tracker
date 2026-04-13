import api from './api';

const getPlayers = async (dynastyId, token) => {
  const response = await api.get(`/dynasties/${dynastyId}/players`);
  return response.data;
};

const createPlayer = async (dynastyId, playerData, token) => {
  const response = await api.post(`/dynasties/${dynastyId}/players`, playerData);
  return response.data;
};

const updatePlayer = async (dynastyId, playerId, data, token) => {
  const response = await api.put(`/dynasties/${dynastyId}/players/${playerId}`, data);
  return response.data;
};

const deletePlayer = async (dynastyId, playerId, token) => {
  const response = await api.delete(`/dynasties/${dynastyId}/players/${playerId}`);
  return response.data;
};

const advanceSeason = async (dynastyId) => {
  const response = await api.post(`/dynasties/${dynastyId}/players/advance-season`);
  return response.data;
};

const uploadScreenshots = async (dynastyId, files, ocrMethod = 'tesseract') => {
  const formData = new FormData();
  if (files.length > 1) {
    files.forEach(file => {
      formData.append('screenshots', file);
    });
  } else {
    formData.append('screenshot', files[0]);
  }
  formData.append('ocrMethod', ocrMethod);

  const response = await api.post(
    `/dynasties/${dynastyId}/ocr/upload${files.length > 1 ? '-batch' : ''}`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  return response.data;
};

const uploadStatGroupScreenshot = async (dynastyId, playerId, file, position, archetype) => {
  const formData = new FormData();
  formData.append('screenshot', file);
  formData.append('position', position);
  if (archetype) {
    formData.append('archetype', archetype);
  }

  const response = await api.post(
    `/dynasties/${dynastyId}/ocr/stat-groups/${playerId}`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  return response.data;
};

const uploadVideo = async (dynastyId, file, ocrMethod = 'tesseract') => {
  const formData = new FormData();
  formData.append('video', file);
  formData.append('ocrMethod', ocrMethod);

  const response = await api.post(
    `/dynasties/${dynastyId}/ocr/upload-video`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  return response.data;
};

const getVideoResults = async (dynastyId, uploadId) => {
  const response = await api.get(`/dynasties/${dynastyId}/ocr/video-results/${uploadId}`);
  return response.data;
};

const approveVideoResults = async (dynastyId, uploadId, approvedNewPlayerIds, approvedUpdatePlayerIds) => {
  const response = await api.post(
    `/dynasties/${dynastyId}/ocr/video-approve/${uploadId}`,
    { approvedNewPlayerIds, approvedUpdatePlayerIds }
  );
  return response.data;
};

const getUploadStatus = async (dynastyId, uploadId) => {
  const response = await api.get(`/dynasties/${dynastyId}/ocr/status/${uploadId}`);
  return response.data;
};

const playerService = {
  getPlayers,
  createPlayer,
  updatePlayer,
  deletePlayer,
  advanceSeason,
  uploadScreenshots,
  uploadStatGroupScreenshot,
  uploadVideo,
  getVideoResults,
  approveVideoResults,
  getUploadStatus,
};

export default playerService;
