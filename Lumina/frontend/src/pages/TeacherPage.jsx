import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import { AuthContext } from '../components/AuthContext';
import TeacherDashboard from '../components/TeacherDashboard';
import EditCourseModal from '../components/EditCourseModal';

export default function TeacherPage() {
  const { user, token } = useContext(AuthContext);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [editingCourse, setEditingCourse] = useState(null);

  const fetchCourses = () => {
    if (!token) return;
    fetch(`${API_URL}/courses/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  };

  const fetchProgress = () => {
    if (!token) return;
    fetch(`${API_URL}/courses/my-progress`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.schedules) {
          const schedMap = {};
          data.schedules.forEach((s) => {
            schedMap[s.course_id] = s.scheduled_date;
          });
          setSchedules(schedMap);
        }
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    if (token) {
      fetchCourses();
      fetchProgress();
    }
  }, [token]);

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm(t('app.confirm_delete_course', 'Are you sure you want to delete this course?'))) return;
    try {
      const res = await fetch(`${API_URL}/courses/${courseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchCourses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user || user.role !== 'teacher') {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>{t('teacher.access_denied', 'Teacher access required')}</h2>
        <p>{t('teacher.become_desc', 'Please sign in with a teacher account or switch role in the navbar.')}</p>
        <button className="btn-oil" onClick={() => navigate('/')} style={{ marginTop: '1.5rem' }}>
          {t('player.back', 'Return to Courses')}
        </button>
      </div>
    );
  }

  return (
    <div className="teacher-page-container" style={{ padding: '1rem 0' }}>
      <TeacherDashboard
        courses={courses}
        schedules={schedules}
        onScheduleUpdate={fetchProgress}
        onCourseClick={(course) => navigate(`/courses/${course.id}`)}
        onEditCourse={(course) => setEditingCourse(course)}
        onDeleteCourse={handleDeleteCourse}
      />

      {editingCourse && (
        <EditCourseModal
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onCourseUpdated={fetchCourses}
        />
      )}
    </div>
  );
}
