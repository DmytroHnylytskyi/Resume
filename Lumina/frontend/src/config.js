/**
 * config.js — centralized client configuration.
 * Resolves the backend API base URL from the VITE_API_URL build variable,
 * falling back to the current hostname on port 8000 for local development;
 * trailing slashes are stripped so callers can append endpoint paths.
 */
const defaultHost = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
const rawApiUrl = import.meta.env.VITE_API_URL || `http://${defaultHost}:8000`;
export const API_URL = rawApiUrl.replace(/\/+$/, '');
