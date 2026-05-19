import client from './client';

// Phase 5
export const recordDelivery = (matchId, data) =>
  client.post(`/scoring/${matchId}/delivery`, data);
export const undoLastBall = (matchId) =>
  client.delete(`/scoring/${matchId}/delivery/last`);
export const getScorecard = (matchId) => client.get(`/scoring/${matchId}/scorecard`);
export const getLiveScore = (matchId) => client.get(`/scoring/${matchId}/live`);
