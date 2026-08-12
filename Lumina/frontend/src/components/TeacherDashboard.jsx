import React, { useState, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Users,
  BookOpen,
  Send,
  LayoutDashboard,
  FileCheck,
  BarChart,
  Plus,
  X,
  UserPlus,
  Inbox,
  GraduationCap,
} from 'lucide-react';
import { teacherApi } from '../api/teacherApi';
import { AuthContext } from './AuthContext';
import CreateCourseModal from './CreateCourseModal';
import CustomLessonModal from './CustomLessonModal';
import CourseCard from './CourseCard';
import { TeacherAnalytics } from './AnalyticsDashboard';
import AttachmentList from './AttachmentList';
import GlassDateTimePicker from './GlassDateTimePicker';
import './TeacherDashboard.css';

// Safe date parser
const safeDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr.endsWith('Z')) return new Date(dateStr);
  return new Date(dateStr + 'Z');
};

/**
 * Teacher Portal Management Dashboard.
 *
 * @component
 * @returns {JSX.Element} Rendered TeacherDashboard.
 */
export default function TeacherDashboard({
  schedules = {},
  onScheduleUpdate,
  onCourseClick,
  onEditCourse,
  onDeleteCourse,
}) {
  const { token } = useContext(AuthContext);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignCourseId, setAssignCourseId] = useState('');
  const [lessonDeadlines, setLessonDeadlines] = useState({});
  const [activeTab, setActiveTab] = useState('library');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customLessonStudent, setCustomLessonStudent] = useState(null);

  // Queries
  const { data: students = [] } = useQuery({
    queryKey: ['teacher-students', token],
    queryFn: teacherApi.getStudents,
    enabled: !!token,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['teacher-assignments', token],
    queryFn: teacherApi.getAssignments,
    enabled: !!token,
  });

  const { data: libraryCourses = [] } = useQuery({
    queryKey: ['teacher-library', token],
    queryFn: teacherApi.getLibrary,
    enabled: !!token,
  });

  const { data: assignableCourses = [] } = useQuery({
    queryKey: ['teacher-assignable', token],
    queryFn: teacherApi.getAssignableCourses,
    enabled: !!token,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['teacher-submissions', token],
    queryFn: teacherApi.getSubmissions,
    enabled: !!token,
  });

  // Mutations
  const addStudentMutation = useMutation({
    mutationFn: (email) => teacherApi.addStudent(email),
    onSuccess: () => {
      setNewStudentEmail('');
      queryClient.invalidateQueries({ queryKey: ['teacher-students'] });
    },
    onError: (err) => {
      alert(err.message || t('teacher.add_fail'));
    },
  });

  const removeStudentMutation = useMutation({
    mutationFn: (id) => teacherApi.removeStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-students'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
    },
  });

  const assignCourseMutation = useMutation({
    mutationFn: ({ studentId, courseId, deadlines }) =>
      teacherApi.assignCourse(studentId, courseId, deadlines),
    onSuccess: () => {
      setAssignStudentId('');
      setAssignCourseId('');
      setLessonDeadlines({});
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
    },
    onError: (err) => {
      alert(err.message || t('teacher.assign_fail'));
    },
  });

  const handleAddStudent = () => {
    if (!newStudentEmail.trim()) return;
    addStudentMutation.mutate(newStudentEmail.trim());
  };

  const handleAssignCourse = () => {
    if (!assignStudentId || !assignCourseId) return;
    const deadlinesISO = {};
    for (const [lessonId, val] of Object.entries(lessonDeadlines)) {
      if (val) {
        deadlinesISO[lessonId] = new Date(val).toISOString();
      }
    }
    assignCourseMutation.mutate({
      studentId: parseInt(assignStudentId),
      courseId: parseInt(assignCourseId),
      deadlines: deadlinesISO,
    });
  };

  const selectedCourseForAssign = assignableCourses.find(
    (c) => c.id === parseInt(assignCourseId)
  );

  const TABS = [
    { id: 'library', label: t('teacher.tab_library'), icon: <BookOpen size={18} />, count: libraryCourses.length },
    { id: 'students', label: t('teacher.tab_students'), icon: <Users size={18} />, count: students.length },
    { id: 'assign', label: t('teacher.tab_assign'), icon: <Send size={18} /> },
    { id: 'overview', label: t('teacher.tab_overview'), icon: <LayoutDashboard size={18} /> },
    { id: 'submissions', label: t('teacher.submissions_tab'), icon: <FileCheck size={18} />, count: submissions.length },
    { id: 'analytics', label: t('app.analytics'), icon: <BarChart size={18} /> },
  ];

  return (
    <div className="teacher-dashboard fade-in">
      <div className="teacher-header-section">
        <h1 className="teacher-title">{t('teacher.title')}</h1>
        <p className="teacher-subtitle">{t('teacher.subtitle')}</p>
      </div>

      <div className="segmented-control-global" style={{ marginBottom: '2.5rem' }}>
        {TABS.map((tab) => (
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

            {assignableCourses.length === 0 ? (
              <div className="empty-state-global">
                <div className="empty-icon-global">
                  <BookOpen size={48} />
                </div>
                <p className="empty-msg-global">{t('teacher.no_library')}</p>
                <button className="btn-gold mt-4" onClick={() => setShowCreateModal(true)}>
                  {t('create.add_course')}
                </button>
              </div>
            ) : (
              <div className="courses-grid">
                {assignableCourses.map((course) => (
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
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                  />
                </div>
                <button
                  className="btn-gold"
                  onClick={handleAddStudent}
                  disabled={addStudentMutation.isPending}
                >
                  {addStudentMutation.isPending ? t('app.loading') : t('teacher.add_student')}
                </button>
              </div>
            </div>

            {students.length === 0 ? (
              <div className="empty-state-global">
                <div className="empty-icon-global">
                  <Users size={48} />
                </div>
                <p className="empty-msg-global">{t('teacher.no_students')}</p>
              </div>
            ) : (
              <div className="students-grid">
                {students.map((s) => (
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
                        onClick={() => removeStudentMutation.mutate(s.id)}
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
                <div className="empty-icon-global">
                  <Send size={48} />
                </div>
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
                        onChange={(e) => setAssignStudentId(e.target.value)}
                      >
                        <option value="" className="select-placeholder">
                          — {t('teacher.select_student')} —
                        </option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.email}
                          </option>
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
                        onChange={(e) => setAssignCourseId(e.target.value)}
                      >
                        <option value="" className="select-placeholder">
                          — {t('teacher.select_course')} —
                        </option>
                        {assignableCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {selectedCourseForAssign &&
                  selectedCourseForAssign.lessons &&
                  selectedCourseForAssign.lessons.length > 0 && (
                    <div className="deadlines-section">
                      <h4>{t('teacher.set_deadlines')}</h4>
                      <div className="deadlines-list">
                        {selectedCourseForAssign.lessons.map((lesson, idx) => (
                          <div key={lesson.id} className="deadline-item">
                            <span className="lesson-name">
                              <span className="lesson-index">{idx + 1}</span> {lesson.title}
                            </span>
                            <div
                              className="deadline-input-wrapper"
                              style={{ minWidth: '220px' }}
                            >
                              <GlassDateTimePicker
                                value={lessonDeadlines[lesson.id] || ''}
                                onChange={(val) =>
                                  setLessonDeadlines((prev) => ({
                                    ...prev,
                                    [lesson.id]: val,
                                  }))
                                }
                                popoverDirection="down"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                <button
                  className="btn-gold w-full mt-4 btn-lg"
                  onClick={handleAssignCourse}
                  disabled={
                    !assignStudentId ||
                    !assignCourseId ||
                    assignCourseMutation.isPending
                  }
                >
                  {assignCourseMutation.isPending
                    ? t('app.loading')
                    : t('teacher.assign_btn')}
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
                <div className="empty-icon-global">
                  <LayoutDashboard size={48} />
                </div>
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
                  {assignments.map((a) => (
                    <div key={a.id} className="grid-row">
                      <div className="grid-cell student-cell">
                        <div className="student-avatar-sm">
                          {a.student_email[0].toUpperCase()}
                        </div>
                        {a.student_email}
                      </div>
                      <div className="grid-cell course-cell">
                        <GraduationCap size={16} className="text-amber" />
                        {a.course_title}
                      </div>
                      <div className="grid-cell progress-cell">
                        <div className="progress-bar-container-teacher">
                          <div
                            className="progress-bar-teacher"
                            style={{ width: `${a.progress}%` }}
                          />
                        </div>
                        <span className="progress-text">
                          {a.completed_lessons}/{a.total_lessons} ({a.progress}%)
                        </span>
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
                <div className="empty-icon-global">
                  <Inbox size={48} />
                </div>
                <p className="empty-msg-global">{t('teacher.no_submissions')}</p>
              </div>
            ) : (
              <div className="submissions-list">
                {submissions.map((sub) => (
                  <div key={sub.id} className="submission-card glass-panel-teacher">
                    <div className="submission-header">
                      <div className="submission-meta">
                        <div className="student-avatar-sm">
                          {sub.student_email[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="submission-student">{sub.student_email}</h4>
                          <p className="submission-course">
                            {sub.course_title} <span className="separator">•</span>{' '}
                            {sub.lesson_title}
                          </p>
                        </div>
                      </div>
                      <div className="submission-date">
                        {safeDate(sub.submitted_at).toLocaleString()}
                      </div>
                    </div>

                    {sub.content && (
                      <div className="submission-content">{sub.content}</div>
                    )}

                    {sub.attachments && sub.attachments.length > 0 && (
                      <div
                        className="submission-attachments"
                        style={{ marginTop: '0.75rem' }}
                      >
                        <h5 style={{ marginBottom: '0.5rem' }}>
                          {t('create.attachments')} ({sub.attachments.length}):
                        </h5>
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
          isPersonal={false}
          onClose={() => setShowCreateModal(false)}
          onCourseCreated={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['teacher-library'] });
            queryClient.invalidateQueries({ queryKey: ['teacher-assignable'] });
          }}
        />
      )}

      {customLessonStudent && (
        <CustomLessonModal
          student={customLessonStudent}
          onClose={() => setCustomLessonStudent(null)}
          onLessonCreated={() => {
            setCustomLessonStudent(null);
            queryClient.invalidateQueries({ queryKey: ['teacher-assignable'] });
            queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
          }}
        />
      )}
    </div>
  );
}
