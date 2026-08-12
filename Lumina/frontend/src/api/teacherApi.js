/**
 * Teacher Portal API Service.
 */

import { apiClient } from './client';

export const teacherApi = {
  /**
   * Fetch list of students in teacher's roster.
   */
  getStudents: () => apiClient('/teacher/students'),

  /**
   * Add a student by email to roster.
   */
  addStudent: (email) =>
    apiClient('/teacher/students', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  /**
   * Remove a student from roster.
   */
  removeStudent: (studentId) =>
    apiClient(`/teacher/students/${studentId}`, {
      method: 'DELETE',
    }),

  /**
   * Fetch courses authored by this teacher.
   */
  getLibrary: () => apiClient('/teacher/library'),

  /**
   * Fetch assignable course templates.
   */
  getAssignableCourses: () => apiClient('/teacher/assignable-courses'),

  /**
   * Assign course to a student.
   */
  assignCourse: (studentId, courseId, deadlines = {}) =>
    apiClient('/teacher/assign', {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, course_id: courseId, deadlines }),
    }),

  /**
   * List active assignments with progress.
   */
  getAssignments: () => apiClient('/teacher/assignments'),

  /**
   * Create custom 1-on-1 curriculum for a student.
   */
  createCustomLesson: (studentId, courseData) =>
    apiClient(`/teacher/custom-lesson?student_id=${studentId}`, {
      method: 'POST',
      body: JSON.stringify(courseData),
    }),

  /**
   * Fetch submissions across teacher's courses.
   */
  getSubmissions: () => apiClient('/teacher/submissions'),

  /**
   * Toggle user role (student <-> teacher).
   */
  toggleRole: () =>
    apiClient('/teacher/toggle-role', {
      method: 'POST',
    }),
};
