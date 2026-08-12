import React, { useState, useContext, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Video,
  BarChart2,
  FileText,
  Clock,
  Paperclip,
  CheckCircle,
  Check,
  Plus,
  Link as LinkIcon,
} from 'lucide-react';
import { API_URL } from '../config';
import { coursesApi } from '../api/coursesApi';
import { AuthContext } from './AuthContext';
import { handleMultipleFileUploadsUtil } from '../utils/upload';
import AttachmentList from './AttachmentList';
import AddLinkModal from './AddLinkModal';
import './CoursePlayer.css';

// Safe UTC/ISO date parser
const safeDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr.endsWith('Z')) return new Date(dateStr);
  return new Date(dateStr + 'Z');
};

/**
 * Embedded media viewer for videos, PDFs, Google Drive, and text lectures.
 */
function ResourceViewer({ lesson }) {
  const { t } = useTranslation();
  const url = lesson?.video_url;
  const type = lesson?.resource_type || 'video';

  if (!url && type !== 'text') {
    return <div className="resource-empty">{t('player.no_resource')}</div>;
  }

  switch (type) {
    case 'video':
      return (
        <div className="video-wrapper">
          <iframe
            width="100%"
            height="100%"
            src={url}
            title="Video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );

    case 'pdf':
      return (
        <div className="resource-frame-wrapper">
          <iframe
            src={
              !url.includes('localhost') && !url.includes('127.0.0.1')
                ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
                : url
            }
            width="100%"
            height="100%"
            title="PDF Viewer"
            frameBorder="0"
          />
        </div>
      );

    case 'gdrive': {
      const embedUrl = url.includes('/preview')
        ? url
        : url.replace('/view', '/preview').replace('/edit', '/preview');
      return (
        <div className="resource-frame-wrapper">
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            title="Google Drive Viewer"
            frameBorder="0"
            allow="autoplay"
          />
        </div>
      );
    }

    case 'link':
      return (
        <div className="resource-link-wrapper">
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-oil">
            {t('player.open_link', 'Open Link')} ↗
          </a>
        </div>
      );

    case 'document':
    case 'presentation':
      return (
        <div
          className="resource-link-wrapper"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '1rem',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '15px',
          }}
        >
          <div style={{ opacity: 0.8 }}>
            {type === 'presentation' ? <BarChart2 size={64} /> : <FileText size={64} />}
          </div>
          <h3 style={{ margin: 0 }}>
            {type === 'presentation'
              ? t('player.presentation_file', 'Presentation File')
              : t('player.document_file', 'Document File')}
          </h3>
          <p style={{ opacity: 0.6 }}>
            {t(
              'player.download_desc',
              'This file type cannot be previewed in the browser. Please download it to view.'
            )}
          </p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-oil" download>
            ↓ {t('player.download_file', 'Download File')}
          </a>
        </div>
      );

    case 'text':
      return (
        <div className="resource-text-card glass-panel">
          <h4>{lesson.title}</h4>
          <div className="resource-text-content">{lesson.content}</div>
        </div>
      );

    case 'meeting':
      return (
        <div
          className="resource-meeting-card glass-panel"
          style={{ textAlign: 'center', padding: '3rem 1rem' }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <Video size={64} color="#ec4899" />
          </div>
          <h3 style={{ marginBottom: '1rem', color: '#fff' }}>{t('create.type_meeting')}</h3>
          {lesson.deadline && (
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              {t('create.meeting_time')}{' '}
              <strong style={{ color: '#fff' }}>
                {safeDate(lesson.deadline).toLocaleString()}
              </strong>
            </p>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-oil"
            style={{
              fontSize: '1.2rem',
              padding: '1rem 3rem',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            {t('create.join_meeting')}
          </a>
        </div>
      );

    default:
      return <div className="resource-empty">{t('player.no_resource')}</div>;
  }
}

/**
 * Visual badge indicating media type.
 */
function ResourceBadge({ type }) {
  const { t } = useTranslation();
  const labels = {
    video: { label: t('player.type_video'), color: '#ef4444' },
    pdf: { label: 'PDF', color: '#f59e0b' },
    gdrive: { label: 'Google Drive', color: '#3b82f6' },
    link: { label: t('player.type_link'), color: '#8b5cf6' },
    document: { label: t('player.type_doc'), color: '#10b981' },
    text: { label: t('player.type_text'), color: '#6b7280' },
    meeting: { label: t('create.type_meeting'), color: '#ec4899' },
  };
  const info = labels[type] || labels.link;
  return (
    <span
      className="resource-badge"
      style={{
        background: `${info.color}33`,
        color: info.color,
        borderColor: `${info.color}66`,
      }}
    >
      {info.label}
    </span>
  );
}

/**
 * Course Player & Interactive Learning Component.
 *
 * @component
 * @param {Object} props
 * @param {Object} [props.course] - Initial course data if passed from parent.
 * @param {Function} [props.onBack] - Custom back button callback.
 * @returns {JSX.Element} Rendered CoursePlayer.
 */
export default function CoursePlayer({ course: initialCourse, onBack }) {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, token } = useContext(AuthContext);
  const { t } = useTranslation();

  const [activeLesson, setActiveLesson] = useState(null);
  const [homeworkText, setHomeworkText] = useState('');
  const [homeworkAttachments, setHomeworkAttachments] = useState([]);
  const [isHwLinkModalOpen, setIsHwLinkModalOpen] = useState(false);

  // Fetch course details via TanStack Query
  const { data: fetchedCourse, isLoading: loadingCourse } = useQuery({
    queryKey: ['course', courseId || initialCourse?.id],
    queryFn: () => coursesApi.getCourse(courseId || initialCourse?.id),
    enabled: !!(courseId || initialCourse?.id),
    initialData: initialCourse,
  });

  const course = fetchedCourse || initialCourse;

  // Fetch student progress
  const { data: progressData } = useQuery({
    queryKey: ['my-progress', token],
    queryFn: coursesApi.getMyProgress,
    enabled: !!token,
  });

  // Completed lessons set
  const completedLessons = useMemo(() => {
    if (!progressData?.progress) return new Set();
    return new Set(
      progressData.progress
        .filter((p) => p.is_completed)
        .map((p) => p.lesson_id)
    );
  }, [progressData]);

  // Set active lesson based on URL or first available lesson
  useEffect(() => {
    if (course?.lessons && course.lessons.length > 0) {
      if (lessonId) {
        const found = course.lessons.find((l) => String(l.id) === String(lessonId));
        setActiveLesson(found || course.lessons[0]);
      } else if (!activeLesson) {
        setActiveLesson(course.lessons[0]);
      }
    }
  }, [course, lessonId]);

  // Fetch submission for active lesson
  const { data: submission } = useQuery({
    queryKey: ['my-submission', activeLesson?.id, token],
    queryFn: () => coursesApi.getMySubmission(activeLesson.id),
    enabled: !!(token && activeLesson && user && user.id !== course?.author_id),
  });

  // Optimistic Mutation: Toggle lesson completion
  const completeMutation = useMutation({
    mutationFn: ({ lessonId, isCompleted }) =>
      coursesApi.completeLesson(lessonId, isCompleted),
    onMutate: async ({ lessonId, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: ['my-progress'] });
      const previousProgress = queryClient.getQueryData(['my-progress', token]);

      queryClient.setQueryData(['my-progress', token], (old) => {
        if (!old) return old;
        const filtered = (old.progress || []).filter((p) => p.lesson_id !== lessonId);
        return {
          ...old,
          progress: [...filtered, { lesson_id: lessonId, is_completed: isCompleted }],
        };
      });

      return { previousProgress };
    },
    onError: (err, variables, context) => {
      if (context?.previousProgress) {
        queryClient.setQueryData(['my-progress', token], context.previousProgress);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-progress'] });
    },
  });

  // Mutation: Submit homework
  const submitHomeworkMutation = useMutation({
    mutationFn: ({ lessonId, payload }) =>
      coursesApi.submitHomework(lessonId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-submission', activeLesson?.id] });
      setHomeworkText('');
      setHomeworkAttachments([]);
    },
  });

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  const handleSelectLesson = (lesson) => {
    setActiveLesson(lesson);
    if (course?.id) {
      navigate(`/courses/${course.id}/lesson/${lesson.id}`, { replace: true });
    }
  };

  const toggleComplete = () => {
    if (!user || !activeLesson) return alert(t('player.login_track'));
    const isCompleted = completedLessons.has(activeLesson.id);
    completeMutation.mutate({
      lessonId: activeLesson.id,
      isCompleted: !isCompleted,
    });
  };

  const handleHomeworkUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (homeworkAttachments.length + files.length > 10) {
      alert('Maximum 10 attachments allowed.');
      return;
    }

    const uploadedResults = await handleMultipleFileUploadsUtil(files, token, API_URL);
    const newAttachments = uploadedResults.map((res) => ({
      id: 'att_' + Math.random().toString(36).substring(2, 9),
      type: 'file',
      title: res.filename || 'Homework File',
      url: res.url,
      filename: res.filename || '',
      file_size: res.size || null,
      content_type: res.content_type || null,
    }));

    setHomeworkAttachments([...homeworkAttachments, ...newAttachments]);
  };

  const handleAddHwLink = (linkObject) => {
    setHomeworkAttachments([...homeworkAttachments, linkObject]);
  };

  const removeHomeworkAttachment = (idx) => {
    const newAtt = [...homeworkAttachments];
    newAtt.splice(idx, 1);
    setHomeworkAttachments(newAtt);
  };

  const submitHomework = () => {
    if (!homeworkText.trim() && homeworkAttachments.length === 0) return;
    submitHomeworkMutation.mutate({
      lessonId: activeLesson.id,
      payload: {
        content: homeworkText,
        attachments: homeworkAttachments,
      },
    });
  };

  if (loadingCourse) {
    return (
      <div className="course-player-container glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>{t('app.loading')}</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="course-player-container glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>{t('player.course_not_found', 'Course not found')}</h2>
        <button className="btn-oil" onClick={handleBack}>
          {t('player.back_to_catalog')}
        </button>
      </div>
    );
  }

  const isAssigned = user && user.id !== course.author_id;

  return (
    <div className="course-player-container glass-panel">
      <button className="btn-oil back-btn" onClick={handleBack}>
        {t('player.back_to_catalog')}
      </button>

      <div className="player-layout">
        <div className="player-main">
          {activeLesson ? (
            <>
              <div className="video-container glass-panel">
                <ResourceViewer lesson={activeLesson} />
              </div>
              <div className="lesson-details">
                <div className="lesson-header-row">
                  <div>
                    <h2 className="lesson-title">{activeLesson.title}</h2>
                    <ResourceBadge type={activeLesson.resource_type || 'video'} />
                  </div>
                  <button
                    className={`btn-complete ${completedLessons.has(activeLesson.id) ? 'completed' : ''}`}
                    onClick={toggleComplete}
                  >
                    <Check size={18} />
                    {completedLessons.has(activeLesson.id)
                      ? t('player.completed')
                      : t('player.mark_complete')}
                  </button>
                </div>
                <div className="lesson-description">{activeLesson.content}</div>

                {activeLesson.attachments && activeLesson.attachments.length > 0 && (
                  <div className="lesson-attachments-section">
                    <h3 className="section-title">
                      <Paperclip size={18} /> {t('player.materials', 'Lesson Materials')}
                    </h3>
                    <AttachmentList attachments={activeLesson.attachments} />
                  </div>
                )}

                {isAssigned && (
                  <div className="homework-section glass-panel">
                    <h3 className="section-title">{t('player.homework_title', 'Homework Assignment')}</h3>

                    {submission ? (
                      <div className="submission-card">
                        <div className="submission-badge">
                          <CheckCircle size={16} /> {t('player.submitted', 'Submitted')}
                        </div>
                        <p className="submission-date">
                          {new Date(submission.submitted_at).toLocaleString()}
                        </p>
                        {submission.content && <p className="submission-text">{submission.content}</p>}
                        {submission.attachments && submission.attachments.length > 0 && (
                          <AttachmentList attachments={submission.attachments} />
                        )}
                      </div>
                    ) : (
                      <div className="homework-form">
                        <textarea
                          placeholder={t('player.homework_placeholder', 'Write your notes or homework answer here...')}
                          value={homeworkText}
                          onChange={(e) => setHomeworkText(e.target.value)}
                          rows={4}
                        />

                        {homeworkAttachments.length > 0 && (
                          <div style={{ margin: '1rem 0' }}>
                            <AttachmentList
                              attachments={homeworkAttachments}
                              onDelete={removeHomeworkAttachment}
                            />
                          </div>
                        )}

                        <div className="hw-actions">
                          <label className="btn-oil-secondary" style={{ cursor: 'pointer' }}>
                            <Paperclip size={16} /> {t('player.attach_files', 'Attach Files')}
                            <input
                              type="file"
                              multiple
                              style={{ display: 'none' }}
                              onChange={handleHomeworkUpload}
                            />
                          </label>

                          <button
                            type="button"
                            className="btn-oil-secondary"
                            onClick={() => setIsHwLinkModalOpen(true)}
                          >
                            <LinkIcon size={16} /> {t('create.add_link', 'Add Link')}
                          </button>

                          <button
                            className="btn-oil"
                            onClick={submitHomework}
                            disabled={submitHomeworkMutation.isPending}
                          >
                            {submitHomeworkMutation.isPending
                              ? t('app.loading')
                              : t('player.submit_hw', 'Submit Homework')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-lesson-selected">
              <h3>{t('player.select_lesson')}</h3>
            </div>
          )}
        </div>

        <div className="player-sidebar glass-panel">
          <div className="course-info">
            <h3 className="course-title">{course.title}</h3>
            <p className="course-desc">{course.description}</p>
          </div>
          <div className="lessons-list">
            <h4>{t('player.curriculum')}</h4>
            {course.lessons &&
              course.lessons.map((lesson, index) => {
                const isCompleted = completedLessons.has(lesson.id);
                const isActive = activeLesson && activeLesson.id === lesson.id;
                return (
                  <div
                    key={lesson.id}
                    className={`lesson-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    onClick={() => handleSelectLesson(lesson)}
                  >
                    <div className="lesson-item-status">
                      {isCompleted ? <CheckCircle size={16} /> : <span>{index + 1}</span>}
                    </div>
                    <div className="lesson-item-info">
                      <div className="lesson-item-title">{lesson.title}</div>
                      <div className="lesson-item-meta">
                        <ResourceBadge type={lesson.resource_type || 'video'} />
                        {lesson.deadline && (
                          <span
                            className="lesson-deadline"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              fontSize: '0.75rem',
                              color: 'var(--color-primary-light)',
                            }}
                          >
                            <Clock size={12} /> {safeDate(lesson.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {isHwLinkModalOpen && (
        <AddLinkModal
          onClose={() => setIsHwLinkModalOpen(false)}
          onAdd={handleAddHwLink}
        />
      )}
    </div>
  );
}
