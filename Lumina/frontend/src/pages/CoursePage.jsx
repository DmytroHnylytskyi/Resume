import React from 'react';
import { useNavigate } from 'react-router-dom';
import CoursePlayer from '../components/CoursePlayer';

/**
 * CoursePage — route shell for the course/lesson player.
 * Wraps CoursePlayer (which reads the :courseId / :lessonId route params
 * itself) and provides the "back to catalog" navigation.
 */
export default function CoursePage() {
  const navigate = useNavigate();

  return (
    <div className="courses-section" style={{ padding: '2rem 1rem' }}>
      <CoursePlayer onBack={() => navigate('/')} />
    </div>
  );
}
