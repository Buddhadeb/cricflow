import client from './client';

export const register = (data) => client.post('/auth/register', data);
export const login = (data) => client.post('/auth/login', data);
export const googleAuth = (credential) => client.post('/auth/google', { credential });
export const getMe = () => client.get('/auth/me');
export const updateProfile = (formData) =>
  client.put('/auth/me', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
