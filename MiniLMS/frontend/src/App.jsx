import { API_URL } from './config';
import React, { useState, useEffect, useContext } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CourseCard from './components/CourseCard';
import CoursePlayer from './components/CoursePlayer';
import CreateCourseModal from './components/CreateCourseModal';
import HowToUse from './components/HowToUse';
import TeacherDashboard from './components/TeacherDashboard';
import FeaturesDeck from './components/FeaturesDeck';
import AuthModal from './components/AuthModal';
import EditCourseModal from './components/EditCourseModal';
import { UserAnalytics } from './components/AnalyticsDashboard';
import { BookOpen, BarChart, Plus, SearchX } from 'lucide-react';
import './App.css';
import { useTranslation } from 'react-i18next';
import { AuthContext } from './components/AuthContext';

function App() {
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [schedules, setSchedules] = useState({});
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [currentView, setCurrentView] = useState('student');
  const [activeTab, setActiveTab] = useState('courses');
  const { t } = useTranslation();
  const { user, token } = useContext(AuthContext);

  const fetchCourses = () => {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    fetch(`${API_URL}/courses/`, { headers })
      .then(res => res.json())
      .then(data => {
        setCourses(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching courses:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCourses();
  }, [token]);

  const fetchProgress = () => {
    if (user && token) {
      fetch(`${API_URL}/courses/my-progress`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        const completed = new Set(
          data.progress.filter(p => p.is_completed).map(p => p.lesson_id)
        );
        setCompletedLessons(completed);

        const schedMap = {};
        if (data.schedules) {
          data.schedules.forEach(s => {
            schedMap[s.course_id] = s.scheduled_date;
          });
        }
        setSchedules(schedMap);
      });
    } else {
      setCompletedLessons(new Set());
      setSchedules({});
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [user, token]);

  // Reset to student view on logout
  useEffect(() => {
    if (!user) setCurrentView('student');
  }, [user]);

  const handleBackFromPlayer = () => {
    setActiveCourse(null);
    fetchProgress();
  };

  const getCourseProgress = (course) => {
    if (!course.lessons || course.lessons.length === 0) return 0;
    const completedCount = course.lessons.filter(l => completedLessons.has(l.id)).length;
    return Math.round((completedCount / course.lessons.length) * 100);
  };

  const getCompletedCount = (course) => {
    if (!course.lessons) return 0;
    return course.lessons.filter(l => completedLessons.has(l.id)).length;
  };

  const isTeacherView = currentView === 'teacher' && user && user.role === 'teacher';

  const handleEditCourse = (course) => {
    setEditingCourse(course);
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm(t('app.confirm_delete_course', 'Are you sure you want to delete this course?'))) return;
    try {
      const res = await fetch(`${API_URL}/courses/${courseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCourses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={`app-container ${isTeacherView ? 'teacher-mode' : ''}`}>
      <Navbar currentView={currentView} onViewChange={setCurrentView} onLoginClick={() => setShowAuthModal(true)} />
      <main className="main-content">
        {activeCourse ? (
          <div className="courses-section" style={{ padding: '2rem 1rem' }}>
            <CoursePlayer course={activeCourse} onBack={handleBackFromPlayer} />
          </div>
        ) : isTeacherView ? (
          <TeacherDashboard 
            courses={courses} 
            schedules={schedules}
            onScheduleUpdate={fetchProgress}
            onCourseClick={setActiveCourse}
            onEditCourse={handleEditCourse}
            onDeleteCourse={handleDeleteCourse}
          />
        ) : (
          <>
            {!activeCourse && <Hero />}
            
            {!activeCourse && !user && (
              <>
                <FeaturesDeck />
                <div style={{textAlign: 'center', margin: '3rem 0'}}>
                  <button className="btn-oil" style={{fontSize: '1.2rem', padding: '1rem 3rem'}} onClick={() => setShowAuthModal(true)}>
                    {t('app.start_learning_cta', 'Start Learning / Create Course')}
                  </button>
                </div>
              </>
            )}

            {user && (
              <section id="courses" className="courses-section">
                {!activeCourse ? (
                  <>
                    <div className="courses-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem'}}>
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
                      <button className="btn-oil" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}} onClick={() => setShowCreateModal(true)}>
                        <Plus size={18} /> {t('create.add_course', 'Create Course')}
                      </button>
                    </div>
                    
                    {activeTab === 'courses' ? (
                      loading ? (
                        <p>{t('app.loading')}</p>
                      ) : courses.length === 0 ? (
                        <div className="empty-state-global">
                          <div className="empty-icon-global">
                            <SearchX size={32} />
                          </div>
                          <p className="empty-msg-global">{t('app.no_courses_assigned', 'No courses assigned yet. Create your own in the Teacher Dashboard!')}</p>
                        </div>
                      ) : (
                        <div className="courses-grid">
                          {courses.map(course => (
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
                              onScheduleUpdate={fetchProgress}
                              authorId={course.author_id}
                              currentUserId={user?.id}
                              onClick={() => setActiveCourse(course)}
                              onEdit={() => handleEditCourse(course)}
                              onDelete={() => handleDeleteCourse(course.id)}
                            />
                          ))}
                        </div>
                      )
                    ) : (
                      <UserAnalytics />
                    )}
                  </>
                ) : (
                  <CoursePlayer course={activeCourse} onBack={handleBackFromPlayer} />
                )}
              </section>
            )}

            {!activeCourse && <HowToUse />}
          </>
        )}
      </main>

      {showCreateModal && <CreateCourseModal onClose={() => setShowCreateModal(false)} onCreated={fetchCourses} />}
      {editingCourse && <EditCourseModal course={editingCourse} onClose={() => setEditingCourse(null)} onCourseUpdated={fetchCourses} />}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}

export default App;
