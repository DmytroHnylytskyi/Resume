/**
 * Courses & Learning Pipeline API Service.
 */

import { apiClient } from './client';

export const coursesApi = {
  /**
   * Fetch all courses accessible to user.
   */
  getCourses: () => apiClient('/courses/'),

  /**
   * Fetch a single course with lessons.
   */
  getCourse: (courseId) => apiClient(`/courses/${courseId}`),

  /**
   * Fetch user's completion progress and study schedules.
   */
  getMyProgress: () => apiClient('/courses/my-progress'),

  /**
   * Create a new course.
   */
  createCourse: (courseData) =>
    apiClient('/courses/', {
      method: 'POST',
      body: JSON.stringify(courseData),
    }),

  /**
   * Update an existing course.
   */
  updateCourse: (courseId, courseData) =>
    apiClient(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    }),

  /**
   * Delete an authored course.
   */
  deleteCourse: (courseId) =>
    apiClient(`/courses/${courseId}`, {
      method: 'DELETE',
    }),

  /**
   * Schedule study date for a course.
   */
  scheduleCourse: (courseId, scheduledDate) =>
    apiClient(`/courses/${courseId}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduled_date: scheduledDate }),
    }),

  /**
   * Mark a lesson complete or incomplete.
   */
  completeLesson: (lessonId, isCompleted) =>
    apiClient(`/courses/lessons/${lessonId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ is_completed: isCompleted }),
    }),

  /**
   * Submit homework assignment.
   */
  submitHomework: (lessonId, submissionData) =>
    apiClient(`/courses/lessons/${lessonId}/submit`, {
      method: 'POST',
      body: JSON.stringify(submissionData),
    }),

  /**
   * Fetch student's latest submission for a lesson.
   */
  getMySubmission: (lessonId) =>
    apiClient(`/courses/lessons/${lessonId}/my-submission`),
};
