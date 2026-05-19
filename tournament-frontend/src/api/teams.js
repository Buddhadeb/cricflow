import client from './client';

export const getTeams = () => client.get('/teams');
export const getMyTeams = () => client.get('/teams/my').then((r) => r.data);
export const getTeam = (id) => client.get(`/teams/${id}`);
export const getTeamSquad = (id) => client.get(`/teams/${id}/squad`).then((r) => r.data);
export const getTeamBudget = (id) => client.get(`/teams/${id}/budget`);
export const getTeamStandings = () => client.get('/teams/standings');
export const createTeam = (data) => client.post('/teams', data).then((r) => r.data);

// Join requests
export const requestToJoinTeam = (teamId) => client.post(`/teams/${teamId}/join-request`).then((r) => r.data);
export const getJoinRequests = (teamId) => client.get(`/teams/${teamId}/join-requests`).then((r) => r.data);
export const approveJoinRequest = (teamId, requestId) => client.patch(`/teams/${teamId}/join-requests/${requestId}/approve`).then((r) => r.data);
export const rejectJoinRequest = (teamId, requestId) => client.patch(`/teams/${teamId}/join-requests/${requestId}/reject`).then((r) => r.data);
export const getMyJoinRequests = () => client.get('/teams/my-join-requests').then((r) => r.data);
