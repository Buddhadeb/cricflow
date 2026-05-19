import client from './client';

export const getTopBatsmen = (limit = 20, tournamentId) =>
  client.get('/stats/batsmen', { params: { limit, ...(tournamentId ? { tournament_id: tournamentId } : {}) } });
export const getTopBowlers = (limit = 20, tournamentId) =>
  client.get('/stats/bowlers', { params: { limit, ...(tournamentId ? { tournament_id: tournamentId } : {}) } });
export const getPlayerStats = (playerId) => client.get(`/stats/players/${playerId}`);
export const getTeamStats = (tournamentId) =>
  client.get('/stats/teams', { params: tournamentId ? { tournament_id: tournamentId } : {} });
