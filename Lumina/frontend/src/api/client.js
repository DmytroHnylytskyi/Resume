/**
 * Centralized API Client Module.
 *
 * Handles HTTP requests with automatic Bearer token injection,
 * response parsing, and unified error handling.
 */

import { API_URL } from '../config';

/**
 * Custom API Error class containing HTTP status and response payload.
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Standard authenticated fetch wrapper.
 *
 * @async
 * @param {string} endpoint - API path (e.g. '/courses/').
 * @param {RequestInit} [options={}] - Fetch configuration options.
 * @returns {Promise<any>} Parsed JSON response body.
 * @throws {ApiError} If HTTP response status is not OK.
 */
export async function apiClient(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Do not set Content-Type header if sending FormData (browser sets boundary automatically)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    throw new ApiError(
      errorData.detail || `Request failed with status ${response.status}`,
      response.status,
      errorData
    );
  }

  // Handle empty 204 No Content responses
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
