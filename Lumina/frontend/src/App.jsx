import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import HomePage from './pages/HomePage';
import CoursePage from './pages/CoursePage';
import TeacherPage from './pages/TeacherPage';
import './App.css';

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const location = useLocation();
  const isTeacherView = location.pathname.startsWith('/teacher');

  return (
    <div className={`app-container ${isTeacherView ? 'teacher-mode' : ''}`}>
      <Navbar onLoginClick={() => setShowAuthModal(true)} />
      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={<HomePage onLoginClick={() => setShowAuthModal(true)} />}
          />
          <Route path="/courses/:courseId" element={<CoursePage />} />
          <Route
            path="/courses/:courseId/lesson/:lessonId"
            element={<CoursePage />}
          />
          <Route path="/teacher" element={<TeacherPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}

export default App;
