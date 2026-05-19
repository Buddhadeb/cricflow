import client from './client';

export const listMatches = (params) => client.get('/matches', { params });
export const getMatch = (id) => client.get(`/matches/${id}`);
export const generateFixtures = (data) => client.post('/matches/generate', data);
export const recordToss = (id, data) => client.post(`/matches/${id}/toss`, data);
export const submitPlayingXI = (id, data) => client.post(`/matches/${id}/playing-xi`, data);
export const getPlayingXI = (id, teamId) => client.get(`/matches/${id}/playing-xi/${teamId}`);
export const startMatch = (id) => client.post(`/matches/${id}/start`);
export const completeMatch = (id, data) => client.post(`/matches/${id}/complete`, data);
