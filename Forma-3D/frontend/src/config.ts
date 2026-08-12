/**
 * @file config.ts
 * @description Centralized client configuration and dynamic API URL resolver.
 */

const defaultHost = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${defaultHost}:8000`;

export const API_URL: string = rawApiUrl.replace(/\/+$/, '');
