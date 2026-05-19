import client from './client';

export const createChallenge = (teamAId, body) =>
  client.post(`/challenges?team_a_id=${teamAId}`, body).then((r) => r.data);

export const listChallenges = () =>
  client.get('/challenges').then((r) => r.data);

export const getChallenge = (id) =>
  client.get(`/challenges/${id}`).then((r) => r.data);

export const acceptChallenge = (id) =>
  client.patch(`/challenges/${id}/accept`).then((r) => r.data);

export const rejectChallenge = (id) =>
  client.patch(`/challenges/${id}/reject`).then((r) => r.data);

export const pollAvailability = (challengeId, teamId) =>
  client.post(`/challenges/${challengeId}/poll-availability?team_id=${teamId}`).then((r) => r.data);

export const getAvailability = (challengeId, teamId) =>
  client.get(`/challenges/${challengeId}/availability?team_id=${teamId}`).then((r) => r.data);

export const respondAvailability = (challengeId, status) =>
  client.patch(`/challenges/${challengeId}/availability/respond`, { status }).then((r) => r.data);

export const discoverTeams = (params) =>
  client.get('/teams/discover', { params }).then((r) => r.data);

export const updateTeam = (teamId, data) =>
  client.patch(`/teams/${teamId}`, data).then((r) => r.data);
