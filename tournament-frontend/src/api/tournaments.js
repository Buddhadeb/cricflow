import client from './client';

export const getTournaments = (status) =>
  client.get('/tournaments', { params: status ? { status } : {} }).then((r) => r.data);

export const getMyTournaments = () =>
  client.get('/tournaments/my').then((r) => r.data);

export const getTournament = (id) =>
  client.get(`/tournaments/${id}`).then((r) => r.data);

export const createTournament = (data) =>
  client.post('/tournaments', data).then((r) => r.data);

export const updateTournament = (id, data) =>
  client.patch(`/tournaments/${id}`, data).then((r) => r.data);

export const deleteTournament = (id) =>
  client.delete(`/tournaments/${id}`);

export const getTournamentPlayers = (id, status) =>
  client.get(`/tournaments/${id}/players`, { params: status ? { status } : {} }).then((r) => r.data);

export const getTournamentTeams = (id) =>
  client.get(`/tournaments/${id}/teams`).then((r) => r.data);

export const approvePayment = (playerId) =>
  client.post(`/payments/approve/${playerId}`).then((r) => r.data);

export const approvePlayer = (tournamentId, playerId) =>
  client.patch(`/tournaments/${tournamentId}/players/${playerId}/approve`).then((r) => r.data);

export const rejectPlayer = (tournamentId, playerId) =>
  client.patch(`/tournaments/${tournamentId}/players/${playerId}/reject`).then((r) => r.data);

export const startAuction = (id) =>
  client.post(`/tournaments/${id}/start-auction`).then((r) => r.data);

export const startLeague = (id) =>
  client.post(`/tournaments/${id}/start-league`).then((r) => r.data);

export const completeTournament = (id) =>
  client.post(`/tournaments/${id}/complete`).then((r) => r.data);

export const createTournamentTeam = (tournamentId, data) =>
  client.post(`/tournaments/${tournamentId}/teams`, data).then((r) => r.data);

export const assignTeamOwner = (tournamentId, teamId, ownerEmail) =>
  client.patch(`/tournaments/${tournamentId}/teams/${teamId}/owner`, { owner_email: ownerEmail }).then((r) => r.data);

export const addPlayerManually = (tournamentId, formData) =>
  client.post(`/tournaments/${tournamentId}/players/manual`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);

export const generateTournamentFixtures = (tournamentId, data) =>
  client.post(`/tournaments/${tournamentId}/matches/generate`, data).then((r) => r.data);

export const scheduleTournamentMatch = (tournamentId, data) =>
  client.post(`/tournaments/${tournamentId}/matches`, data).then((r) => r.data);
