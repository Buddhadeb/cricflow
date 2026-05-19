import client from './client';

export const getAuctionStatus = () => client.get('/auction/status');
export const getAuctionHistory = () => client.get('/auction/history');
export const startAuction = (data) => client.post('/auction/start', data);
export const pauseAuction = () => client.post('/auction/pause');
export const resumeAuction = () => client.post('/auction/resume');
export const nextPlayer = () => client.post('/auction/next-player');
export const sellPlayer = () => client.post('/auction/sell');
export const unsoldPlayer = () => client.post('/auction/unsold');
export const completeAuction = () => client.post('/auction/complete');
