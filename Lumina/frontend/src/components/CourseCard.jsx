import { API_URL } from '../config';
import React, { useContext, useState } from 'react';
import './CourseCard.css';
import { AuthContext } from './AuthContext';
import { useTranslation } from 'react-i18next';
import { Edit3, Trash2, BookOpen, CheckCircle2, Calendar, Clock } from 'lucide-react';
import GlassDateTimePicker from './GlassDateTimePicker';

/**
 * Course Card Component.
 *
 * Renders a glassmorphic curriculum card with cover image, module count,
 * completion progress bar, study calendar scheduler, and author edit/delete actions.
 *
 * @component
 * @param {Object} props
 * @param {number} props.id - Unique course ID.
 * @param {string} props.title - Course title.
 * @param {string} props.description - Course summary description.
 * @param {string} [props.image_url] - Optional URL to cover image thumbnail.
 * @param {number} [props.authorId] - User ID of the course creator.
 * @param {number} [props.currentUserId] - Currently logged-in user ID.
 * @param {number} [props.lessonsCount=0] - Total number of lessons in this course.
 * @param {number} [props.completedCount=0] - Number of lessons marked completed.
 * @param {number} [props.progress=0] - Overall completion percentage (0 - 100).
 * @param {string|null} [props.scheduledDate] - ISO string of planned study session.
 * @param {Function} [props.onScheduleUpdate] - Callback triggered when study date is modified.
 * @param {Function} [props.onClick] - Click handler navigating to course viewer.
 * @param {Function} [props.onEdit] - Edit trigger for course author.
 * @param {Function} [props.onDelete] - Delete trigger for course author.
 * @returns {JSX.Element} Rendered CourseCard component.
 */
export default function CourseCard({ 
  id, 
  title, 
  description, 
  image_url,
  authorId, 
  currentUserId, 
  lessonsCount = 0, 
  completedCount = 0, 
  progress = 0, 
  scheduledDate, 
  onScheduleUpdate, 
  onClick, 
  onEdit, 
  onDelete 
}) {
  const { user, token } = useContext(AuthContext);
  const [scheduleDate, setScheduleDate] = useState('');
  const [showScheduleInput, setShowScheduleInput] = useState(false);
  const { t } = useTranslation();

  const isFullyCompleted = progress === 100;
  const isAuthor = authorId && currentUserId && authorId === currentUserId;

  const handleSchedule = async (e) => {
    e.stopPropagation();
    if (!scheduleDate) return alert(t('courses.select_date'));
    const res = await fetch(`${API_URL}/courses/${id}/schedule`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ scheduled_date: new Date(scheduleDate).toISOString() })
    });
    if (res.ok) {
      setScheduleDate('');
      setShowScheduleInput(false);
      if (onScheduleUpdate) onScheduleUpdate();
    } else {
      alert(t('courses.failed_schedule'));
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div 
      className={`course-card glass-panel ${isFullyCompleted ? 'course-completed' : ''}`} 
      onClick={onClick}
    >
      {/* Header Banner */}
      <div className="course-card-image-wrapper">
        {image_url ? (
          <img src={image_url} alt={title} className="course-card-bg-image" />
        ) : (
          <div className="course-card-fallback-banner">
            <div className="banner-ambient-glow"></div>
            <div className="banner-icon-badge">
              <BookOpen size={28} />
            </div>
          </div>
        )}

        {/* Left Side Status Badges */}
        <div className="course-card-badges-left">
          {isFullyCompleted && (
            <span className="completed-badge">
              <CheckCircle2 size={13} /> {t('courses.completed', 'Completed')}
            </span>
          )}
        </div>

        {/* Right Side Action Buttons */}
        {isAuthor && (
          <div className="course-actions">
            <button 
              type="button"
              className="action-btn edit" 
              onClick={(e) => { e.stopPropagation(); onEdit(); }} 
              title={t('app.edit', 'Edit')}
            >
              <Edit3 size={15} />
            </button>
            <button 
              type="button"
              className="action-btn delete" 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              title={t('app.delete', 'Delete')}
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="course-card-content">
        <h3 className="course-card-title">{title}</h3>
        <p className="course-card-desc">{description}</p>

        {user && scheduledDate && (
          <div className="scheduled-badge">
            <Calendar size={13} /> {t('courses.scheduled_for')}: {formatDate(scheduledDate)}
          </div>
        )}

        <div className="course-meta">
          <span>{lessonsCount} {t('courses.lessons')}</span>
          {user && completedCount > 0 && (
            <span className="completed-info">
              {completedCount}/{lessonsCount} {t('courses.done')}
            </span>
          )}
        </div>

        {user && progress !== undefined && (
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
        )}
        
        {user && (
          <div className="schedule-section" onClick={(e) => e.stopPropagation()}>
            {!showScheduleInput ? (
              <button 
                type="button"
                className="btn-glass btn-sm w-full schedule-toggle-btn"
                onClick={() => setShowScheduleInput(true)}
              >
                <Clock size={14} /> {t('courses.schedule', 'Schedule')}
              </button>
            ) : (
              <div className="schedule-input-group">
                <GlassDateTimePicker 
                  value={scheduleDate}
                  onChange={setScheduleDate}
                  popoverDirection="up"
                />
                <div className="schedule-action-buttons">
                  <button 
                    type="button" 
                    className="btn-oil btn-sm" 
                    onClick={handleSchedule}
                  >
                    {t('app.save', 'Save')}
                  </button>
                  <button 
                    type="button" 
                    className="btn-glass btn-sm" 
                    onClick={() => setShowScheduleInput(false)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
