import { API_URL } from '../config';
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { useTranslation } from 'react-i18next';
import { 
  Users, BookOpen, Send, LayoutDashboard, FileCheck, 
  BarChart, Plus, X, UserPlus, Inbox, GraduationCap, Clock 
} from 'lucide-react';
import CreateCourseModal from './CreateCourseModal';
import CustomLessonModal from './CustomLessonModal';
import CourseCard from './CourseCard';
import { TeacherAnalytics } from './AnalyticsDashboard';
import AttachmentList from './AttachmentList';
import GlassDateTimePicker from './GlassDateTimePicker';
import './TeacherDashboard.css';

export default function TeacherDashboard({ courses, schedules = {}, onScheduleUpdate, onCourseClick, onEditCourse, onDeleteCourse }) {
  const { token } = useContext(AuthContext);
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [libraryCourses, setLibraryCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [assignableCourses, setAssignableCourses] = useState([]);
  const [error, setError] = useState(null);

  // Safe date parser
  const safeDate = (dateStr) => {
    if (!dateStr) return new Date();
    if (dateStr.endsWith('Z')) return new Date(dateStr);
    return new Date(dateStr + 'Z');
  };
  
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignCourseId, setAssignCourseId] = useState('');
  const [lessonDeadlines, setLessonDeadlines] = useState({});
  const [activeTab, setActiveTab] = useState('library');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customLessonStudent, setCustomLessonStudent] = useState(null);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const fetchStudents = () => {
    fetch(`${API_URL}/teacher/students`, { headers })
      .then(r => r.json()).then(setStudents).catch(() => setError(t('app.error', 'Network error. Please try again.')));
  };

  const fetchAssignments = () => {
    fetch(`${API_URL}/teacher/assignments`, { headers })
      .then(r => r.json()).then(setAssignments).catch(() => setError(t('app.error', 'Network error. Please try again.')));
  };

  const fetchLibrary = () => {
    fetch(`${API_URL}/teacher/library`, { headers })
      .then(r => r.json()).then(setLibraryCourses).catch(() => setError(t('app.error', 'Network error. Please try again.')));
    fetch(`${API_URL}/teacher/assignable-courses`, { headers })
      .then(r => r.json()).then(setAssignableCourses).catch(() => setError(t('app.error', 'Network error. Please try again.')));
  };

  const fetchSubmissions = () => {
    fetch(`${API_URL}/teacher/submissions`, { headers })
      .then(r => r.json()).then(setSubmissions).catch(() => setError(t('app.error', 'Network error. Please try again.')));
  };

  useEffect(() => {
    fetchStudents();
    fetchAssignments();
    fetchLibrary();
    fetchSubmissions();
  }, []);

  const addStudent = async () => {
    if (!newStudentEmail.trim()) return;
    const res = await fetch(`${API_URL}/teacher/students`, {
      method: 'POST', headers,
      body: JSON.stringify({ email: newStudentEmail })
    });
    if (res.ok) {
      setNewStudentEmail('');
      fetchStudents();
    } else {
      const data = await res.json();
      alert(data.detail || t('teacher.add_fail'));
    }
  };

  const removeStudent = async (id) => {
    await fetch(`${API_URL}/teacher/students/${id}`, {
      method: 'DELETE', headers
    });
    fetchStudents();
    fetchAssignments();
  };

  const assignCourse = async () => {
    if (!assignStudentId || !assignCourseId) return;
    
    const deadlinesISO = {};
    for (const [lessonId, val] of Object.entries(lessonDeadlines)) {
      if (val) {
        deadlinesISO[lessonId] = new Date(val).toISOString();
      }
    }
    
    const res = await fetch(`${API_URL}/teacher/assign`, {
      method: 'POST', headers,
      body: JSON.stringify({ 
        student_id: parseInt(assignStudentId), 
        course_id: parseInt(assignCourseId),
        deadlines: deadlinesISO
      })
    });
    if (res.ok) {
      setAssignStudentId('');
      setAssignCourseId('');
      setLessonDeadlines({});
      fetchAssignments();
    } else {
      const data = await res.json();
      alert(data.detail || t('teacher.assign_fail'));
    }
  };

  const selectedCourseForAssign = assignableCourses.find(c => c.id === parseInt(assignCourseId));

  const TABS = [
    { id: 'library', label: t('teacher.tab_library'), icon: <BookOpen size={18} />, count: libraryCourses.length },
    { id: 'students', label: t('teacher.tab_students'), icon: <Users size={18} />, count: students.length },
    { id: 'assign', label: t('teacher.tab_assign'), icon: <Send size={18} /> },
    { id: 'overview', label: t('teacher.tab_overview'), icon: <LayoutDashboard size={18} /> },
    { id: 'submissions', label: t('teacher.submissions_tab'), icon: <FileCheck size={18} />, count: submissions.length },
    { id: 'analytics', label: t('app.analytics'), icon: <BarChart size={18} /> }
  ];

  return (
    <div className="teacher-dashboard fade-in">
      <div className="teacher-header-section">
        <h1 className="teacher-title">{t('teacher.title')}</h1>
        <p className="teacher-subtitle">{t('teacher.subtitle')}</p>
      </div>
      
      {error && <div className="error-message" style={{color: '#ef4444', marginBottom: '1rem', textAlign: 'center'}}>{error}</div>}

      <div className="segmented-control-global" style={{marginBottom: '2.5rem'}}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`segmented-btn-global ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span className="tab-label">{tab.label}</span>
            {tab.count !== undefined && <span className="tab-badge">{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className="tab-content-wrapper slide-up">
        {/* LIBRARY TAB */}
        {activeTab === 'library' && (
          <div className="teacher-panel">
            <div className="panel-header">
              <h3>{t('teacher.my_library')}</h3>
              <button className="btn-gold btn-icon" onClick={() => setShowCreateModal(true)}>
                <Plus size={18} /> {t('create.add_course')}
              </button>
            </div>
            
            {libraryCourses.length === 0 ? (
              <div className="empty-state-global">
                <div className="empty-icon-global"><BookOpen size={48} /></div>
                <p className="empty-msg-global">{t('teacher.no_library')}</p>
                <button className="btn-gold mt-4" onClick={() => setShowCreateModal(true)}>
                  {t('create.add_course')}
                </button>
              </div>
            ) : (
              <div className="courses-grid">
                {libraryCourses.map(course => (
                  <CourseCard 
                    key={course.id} 
                    id={course.id}
                    title={course.title}
                    description={course.description}
                    image_url={course.image_url}
                    lessonsCount={course.lessons?.length || 0}
                    scheduledDate={schedules[course.id]}
                    onScheduleUpdate={onScheduleUpdate}
                    authorId={course.author_id}
                    currentUserId={course.author_id}
                    onClick={() => onCourseClick && onCourseClick(course)}
                    onEdit={() => onEditCourse && onEditCourse(course)}
                    onDelete={() => onDeleteCourse && onDeleteCourse(course.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === 'students' && (
          <div className="teacher-panel">
            <h3>{t('teacher.my_students')}</h3>
            <div className="add-student-card glass-panel-teacher">
              <div className="add-student-row">
                <div className="input-with-icon">
                  <UserPlus size={20} className="input-icon" />
                  <input
                    type="email"
                    className="glass-input-teacher with-icon"
                    placeholder={t('teacher.student_email_ph')}
                    value={newStudentEmail}
                    onChange={e => setNewStudentEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addStudent()}
                  />
                </div>
                <button className="btn-gold" onClick={addStudent}>
                  {t('teacher.add_student')}
                </button>
              </div>
            </div>

            {students.length === 0 ? (
              <div className="empty-state-global">
                <div className="empty-icon-global"><Users size={48} /></div>
                <p className="empty-msg-global">{t('teacher.no_students')}</p>
              </div>
            ) : (
              <div className="students-grid">
                {students.map(s => (
                  <div key={s.id} className="student-card modern-card">
                    <div className="student-info">
                      <div className="student-avatar">{s.email[0].toUpperCase()}</div>
                      <span className="student-email">{s.email}</span>
                    </div>
                    <div className="student-actions">
                      <button 
                        className="btn-glass btn-sm btn-action text-amber"
                        onClick={() => setCustomLessonStudent(s)}
                        title={t('teacher.custom_lesson_btn')}
                      >
                        <Plus size={16} />
                      </button>
                      <button 
                        className="btn-glass btn-sm btn-action text-red"
                        onClick={() => removeStudent(s.id)}
                        title="Remove Student"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ASSIGN TAB */}
        {activeTab === 'assign' && (
          <div className="teacher-panel">
            <h3>{t('teacher.assign_course')}</h3>
            {students.length === 0 ? (
              <div className="empty-state-global">
                <div className="empty-icon-global"><Send size={48} /></div>
                <p className="empty-msg-global">{t('teacher.add_students_first')}</p>
              </div>
            ) : (
              <div className="assign-form glass-panel-teacher">
                <div className="assign-row">
                  <div className="assign-field">
                    <label>{t('teacher.select_student')}</label>
                    <div className="select-wrapper">
                      <select
                        className="glass-input-teacher"
                        value={assignStudentId}
                        onChange={e => setAssignStudentId(e.target.value)}
                      >
                        <option value="" className="select-placeholder">— {t('teacher.select_student')} —</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.email}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="assign-field">
                    <label>{t('teacher.select_course')}</label>
                    <div className="select-wrapper">
                      <select
                        className="glass-input-teacher"
                        value={assignCourseId}
                        onChange={e => setAssignCourseId(e.target.value)}
                      >
                        <option value="" className="select-placeholder">— {t('teacher.select_course')} —</option>
                        {assignableCourses.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                {selectedCourseForAssign && selectedCourseForAssign.lessons && selectedCourseForAssign.lessons.length > 0 && (
                  <div className="deadlines-section">
                    <h4>{t('teacher.set_deadlines')}</h4>
                    <div className="deadlines-list">
                      {selectedCourseForAssign.lessons.map((lesson, idx) => (
                        <div key={lesson.id} className="deadline-item">
                          <span className="lesson-name">
                            <span className="lesson-index">{idx + 1}</span> {lesson.title}
                          </span>
                          <div className="deadline-input-wrapper" style={{ minWidth: '220px' }}>
                            <GlassDateTimePicker 
                              value={lessonDeadlines[lesson.id] || ''}
                              onChange={val => setLessonDeadlines(prev => ({...prev, [lesson.id]: val}))}
                              popoverDirection="down"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <button className="btn-gold w-full mt-4 btn-lg" onClick={assignCourse} disabled={!assignStudentId || !assignCourseId}>
                  {t('teacher.assign_btn')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="teacher-panel">
            <h3>{t('teacher.assignments_overview')}</h3>
            {assignments.length === 0 ? (
              <div className="empty-state-global">
                <div className="empty-icon-global"><LayoutDashboard size={48} /></div>
                <p className="empty-msg-global">{t('teacher.no_assignments')}</p>
              </div>
            ) : (
              <div className="data-grid glass-panel-teacher">
                <div className="grid-header">
                  <span>{t('teacher.col_student')}</span>
                  <span>{t('teacher.col_course')}</span>
                  <span>{t('teacher.col_progress')}</span>
                </div>
                <div className="grid-body">
                  {assignments.map(a => (
                    <div key={a.id} className="grid-row">
                      <div className="grid-cell student-cell">
                        <div className="student-avatar-sm">{a.student_email[0].toUpperCase()}</div>
                        {a.student_email}
                      </div>
                      <div className="grid-cell course-cell">
                        <GraduationCap size={16} className="text-amber" />
                        {a.course_title}
                      </div>
                      <div className="grid-cell progress-cell">
                        <div className="progress-bar-container-teacher">
                          <div className="progress-bar-teacher" style={{ width: `${a.progress}%` }}></div>
                        </div>
                        <span className="progress-text">{a.completed_lessons}/{a.total_lessons} ({a.progress}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUBMISSIONS TAB */}
        {activeTab === 'submissions' && (
          <div className="teacher-panel">
            <h3>{t('teacher.tab_submissions')}</h3>
            
            {submissions.length === 0 ? (
              <div className="empty-state-global">
                <div className="empty-icon-global"><Inbox size={48} /></div>
                <p className="empty-msg-global">{t('teacher.no_submissions')}</p>
              </div>
            ) : (
              <div className="submissions-list">
                {submissions.map(sub => (
                  <div key={sub.id} className="submission-card glass-panel-teacher">
                    <div className="submission-header">
                      <div className="submission-meta">
                        <div className="student-avatar-sm">{sub.student_email[0].toUpperCase()}</div>
                        <div>
                          <h4 className="submission-student">{sub.student_email}</h4>
                          <p className="submission-course">
                            {sub.course_title} <span className="separator">•</span> {sub.lesson_title}
                          </p>
                        </div>
                      </div>
                      <div className="submission-date">
                        {safeDate(sub.submitted_at).toLocaleString()}
                      </div>
                    </div>
                    
                    {sub.content && (
                      <div className="submission-content">
                        {sub.content}
                      </div>
                    )}
                    
                    {sub.attachments && sub.attachments.length > 0 && (
                      <div className="submission-attachments" style={{marginTop: '0.75rem'}}>
                        <h5 style={{marginBottom: '0.5rem'}}>{t('create.attachments')} ({sub.attachments.length}):</h5>
                        <AttachmentList attachments={sub.attachments} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="fade-in">
            <TeacherAnalytics />
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateCourseModal 
          onClose={() => setShowCreateModal(false)} 
          onCourseCreated={() => { setShowCreateModal(false); fetchLibrary(); }} 
        />
      )}

      {customLessonStudent && (
        <CustomLessonModal
          student={customLessonStudent}
          onClose={() => setCustomLessonStudent(null)}
          onLessonCreated={() => { setCustomLessonStudent(null); fetchLibrary(); fetchAssignments(); }}
        />
      )}
    </div>
  );
}
