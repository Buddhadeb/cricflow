import client from './client';

export const registerPlayer = (formData) =>
  client.post('/players/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getMyPlayers = () => client.get('/players/mine').then((r) => r.data);
export const updateMyPlayer = (data) => client.patch('/players/mine', data).then((r) => r.data);

export const getPlayer = (id) => client.get(`/players/${id}`);
export const listPlayers = (params) => client.get('/players', { params });
export const availablePlayers = () => client.get('/players/available');
export const approvePlayer = (id) => client.patch(`/players/${id}/approve`);
export const rejectPlayer = (id) => client.patch(`/players/${id}/reject`);
