/**
 * Analytics & Learning Metrics API Service.
 */

import { apiClient } from './client';

export const analyticsApi = {
  /**
   * Fetch current user/student study metrics.
   */
  getUserAnalytics: () => apiClient('/analytics/user'),

  /**
   * Fetch teacher dashboard metrics.
   */
  getTeacherAnalytics: () => apiClient('/analytics/teacher'),
};
