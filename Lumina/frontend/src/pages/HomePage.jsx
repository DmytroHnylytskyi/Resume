import React, { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, BarChart, Plus, SearchX } from 'lucide-react';
import { coursesApi } from '../api/coursesApi';
import { AuthContext } from '../components/AuthContext';
import Hero from '../components/Hero';
import FeaturesDeck from '../components/FeaturesDeck';
import HowToUse from '../components/HowToUse';
import CourseCard from '../components/CourseCard';
import CreateCourseModal from '../components/CreateCourseModal';
import EditCourseModal from '../components/EditCourseModal';
import { UserAnalytics } from '../components/AnalyticsDashboard';

/**
 * Main Home & Catalog Page Component.
 *
 * Uses TanStack Query v5 for cached course list fetching, optimistic updates,
 * and progress tracking.
 *
 * @component
 * @param {Object} props
 * @param {Function} props.onLoginClick - Callback to open login modal.
 * @returns {JSX.Element} Rendered HomePage component.
 */
export default function HomePage({ onLoginClick }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [activeTab, setActiveTab] = useState('courses');

  const { t } = useTranslation();
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query: Fetch courses list
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['courses', token],
    queryFn: coursesApi.getCourses,
    enabled: !!token,
  });

  // Query: Fetch student progress & schedules
  const { data: progressData } = useQuery({
    queryKey: ['my-progress', token],
    queryFn: coursesApi.getMyProgress,
    enabled: !!token,
  });

  // Mutation: Delete course
  const deleteMutation = useMutation({
    mutationFn: (courseId) => coursesApi.deleteCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['my-progress'] });
    },
  });

  // Derived completion lookup set
  const completedLessons = useMemo(() => {
    if (!progressData?.progress) return new Set();
    return new Set(
      progressData.progress
        .filter((p) => p.is_completed)
        .map((p) => p.lesson_id)
    );
  }, [progressData]);

  // Derived schedules map
  const schedules = useMemo(() => {
    if (!progressData?.schedules) return {};
    const map = {};
    progressData.schedules.forEach((s) => {
      map[s.course_id] = s.scheduled_date;
    });
    return map;
  }, [progressData]);

  const getCourseProgress = (course) => {
    if (!course.lessons || course.lessons.length === 0) return 0;
    const completedCount = course.lessons.filter((l) => completedLessons.has(l.id)).length;
    return Math.round((completedCount / course.lessons.length) * 100);
  };

  const getCompletedCount = (course) => {
    if (!course.lessons) return 0;
    return course.lessons.filter((l) => completedLessons.has(l.id)).length;
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm(t('app.confirm_delete_course', 'Are you sure you want to delete this course?'))) return;
    deleteMutation.mutate(courseId);
  };

  return (
    <>
      <Hero />

      {!user && (
        <>
          <FeaturesDeck />
          <div style={{ textAlign: 'center', margin: '3rem 0' }}>
            <button
              className="btn-oil"
              style={{ fontSize: '1.2rem', padding: '1rem 3rem' }}
              onClick={onLoginClick}
            >
              {t('app.start_learning_cta', 'Start Learning / Create Course')}
            </button>
          </div>
        </>
      )}

      {user && (
        <section id="courses" className="courses-section">
          <div
            className="courses-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div className="segmented-control-global">
              <button
                className={`segmented-btn-global ${activeTab === 'courses' ? 'active' : ''}`}
                onClick={() => setActiveTab('courses')}
              >
                <BookOpen size={18} />
                {t('app.courses')}
              </button>
              <button
                className={`segmented-btn-global ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                <BarChart size={18} />
                {t('app.analytics')}
              </button>
            </div>
            <button
              className="btn-oil"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={18} /> {t('create.add_course', 'Create Course')}
            </button>
          </div>

          {activeTab === 'courses' ? (
            coursesLoading ? (
              <p>{t('app.loading')}</p>
            ) : courses.length === 0 ? (
              <div className="empty-state-global">
                <div className="empty-icon-global">
                  <SearchX size={32} />
                </div>
                <p className="empty-msg-global">
                  {t('app.no_courses_assigned', 'No courses assigned yet. Create your own in the Teacher Dashboard!')}
                </p>
              </div>
            ) : (
              <div className="courses-grid">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    id={course.id}
                    title={course.title}
                    description={course.description}
                    image_url={course.image_url}
                    lessonsCount={course.lessons?.length || 0}
                    completedCount={getCompletedCount(course)}
                    progress={getCourseProgress(course)}
                    scheduledDate={schedules[course.id]}
                    onScheduleUpdate={() => queryClient.invalidateQueries({ queryKey: ['my-progress'] })}
                    authorId={course.author_id}
                    currentUserId={user?.id}
                    onClick={() => navigate(`/courses/${course.id}`)}
                    onEdit={() => setEditingCourse(course)}
                    onDelete={() => handleDeleteCourse(course.id)}
                  />
                ))}
              </div>
            )
          ) : (
            <UserAnalytics />
          )}
        </section>
      )}

      <HowToUse />

      {showCreateModal && (
        <CreateCourseModal
          isPersonal={true}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['courses'] })}
        />
      )}

      {editingCourse && (
        <EditCourseModal
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onCourseUpdated={() => queryClient.invalidateQueries({ queryKey: ['courses'] })}
        />
      )}
    </>
  );
}
