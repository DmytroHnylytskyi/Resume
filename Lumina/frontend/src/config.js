const defaultHost = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
const rawApiUrl = import.meta.env.VITE_API_URL || `http://${defaultHost}:8000`;
export const API_URL = rawApiUrl.replace(/\/+$/, '');
