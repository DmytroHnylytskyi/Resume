import React from 'react';
import { useNavigate } from 'react-router-dom';
import CoursePlayer from '../components/CoursePlayer';

export default function CoursePage() {
  const navigate = useNavigate();

  return (
    <div className="courses-section" style={{ padding: '2rem 1rem' }}>
      <CoursePlayer onBack={() => navigate('/')} />
    </div>
  );
}
