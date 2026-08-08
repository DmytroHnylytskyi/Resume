import { API_URL } from '../config';
import React, { useState, useContext, useEffect } from 'react';
import './CoursePlayer.css';
import { AuthContext } from './AuthContext';
import { useTranslation } from 'react-i18next';
import { Video, BarChart2, FileText, Clock, Paperclip, CheckCircle, Check, Plus, Link as LinkIcon } from 'lucide-react';
import { handleMultipleFileUploadsUtil } from '../utils/upload';
import AttachmentList from './AttachmentList';
import AddLinkModal from './AddLinkModal';

// Safe date parser
const safeDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr.endsWith('Z')) return new Date(dateStr);
  return new Date(dateStr + 'Z');
};

function ResourceViewer({ lesson }) {
  const { t } = useTranslation();
  const url = lesson.video_url;
  const type = lesson.resource_type || 'video';

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
            allowFullScreen>
          </iframe>
        </div>
      );

    case 'pdf':
      return (
        <div className="resource-frame-wrapper">
          <iframe 
            src={(!url.includes('localhost') && !url.includes('127.0.0.1')) ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true` : url}
            width="100%" 
            height="100%" 
            title="PDF Viewer"
            frameBorder="0"
          />
        </div>
      );

    case 'gdrive':
      const embedUrl = url.includes('/preview') ? url : 
        url.replace('/view', '/preview').replace('/edit', '/preview');
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
        <div className="resource-link-wrapper" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '15px'}}>
          <div style={{opacity: 0.8}}>
            {type === 'presentation' ? <BarChart2 size={64} /> : <FileText size={64} />}
          </div>
          <h3 style={{margin: 0}}>{type === 'presentation' ? t('player.presentation_file', 'Presentation File') : t('player.document_file', 'Document File')}</h3>
          <p style={{opacity: 0.6}}>{t('player.download_desc', 'This file type cannot be previewed in the browser. Please download it to view.')}</p>
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
        <div className="resource-meeting-card glass-panel" style={{textAlign: 'center', padding: '3rem 1rem'}}>
          <div style={{marginBottom: '1rem'}}><Video size={64} color="#ec4899" /></div>
          <h3 style={{marginBottom: '1rem', color: '#fff'}}>{t('create.type_meeting')}</h3>
          {lesson.deadline && (
            <p style={{color: 'var(--text-secondary)', marginBottom: '2rem'}}>
              {t('create.meeting_time')} <strong style={{color: '#fff'}}>{safeDate(lesson.deadline).toLocaleString()}</strong>
            </p>
          )}
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-oil" style={{fontSize: '1.2rem', padding: '1rem 3rem', textDecoration: 'none', display: 'inline-block'}}>
            {t('create.join_meeting')}
          </a>
        </div>
      );

    default:
      return <div className="resource-empty">{t('player.no_resource')}</div>;
  }
}

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
    <span className="resource-badge" style={{ background: `${info.color}33`, color: info.color, borderColor: `${info.color}66` }}>
      {info.label}
    </span>
  );
}

export default function CoursePlayer({ course, onBack }) {
  const [activeLesson, setActiveLesson] = useState(course.lessons && course.lessons.length > 0 ? course.lessons[0] : null);
  const { user, token } = useContext(AuthContext);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [submission, setSubmission] = useState(null);
  const [homeworkText, setHomeworkText] = useState('');
  const [homeworkAttachments, setHomeworkAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (user && token) {
      fetch(`${API_URL}/courses/my-progress`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        const completed = new Set(data.progress.filter(p => p.is_completed).map(p => p.lesson_id));
        setCompletedLessons(completed);
      });
    }
  }, [user, token]);

  useEffect(() => {
    if (user && token && activeLesson && course && user.id !== course.author_id) {
      fetch(`${API_URL}/courses/lessons/${activeLesson.id}/my-submission`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setSubmission(data);
        setHomeworkText('');
        setHomeworkAttachments([]);
      })
      .catch(err => console.error(err));
    } else {
      setSubmission(null);
    }
  }, [user, token, activeLesson, course]);

  const toggleComplete = async () => {
    if (!user || !activeLesson) return alert(t('player.login_track'));
    const isCompleted = completedLessons.has(activeLesson.id);
    
    const res = await fetch(`${API_URL}/courses/lessons/${activeLesson.id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ is_completed: !isCompleted })
    });

    if (res.ok) {
      const newSet = new Set(completedLessons);
      if (isCompleted) {
        newSet.delete(activeLesson.id);
      } else {
        newSet.add(activeLesson.id);
      }
      setCompletedLessons(newSet);
    }
  };

  const [isHwLinkModalOpen, setIsHwLinkModalOpen] = useState(false);

  const handleHomeworkUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (homeworkAttachments.length + files.length > 10) {
      alert("Maximum 10 attachments allowed.");
      return;
    }
    
    for (let file of files) {
      if (file.size > 50 * 1024 * 1024) {
        alert("One or more files exceed 50MB limit.");
        return;
      }
    }
    
    const uploadedResults = await handleMultipleFileUploadsUtil(files, token, API_URL);
    const newAttachments = uploadedResults.map(res => ({
      id: 'att_' + Math.random().toString(36).substring(2, 9),
      type: 'file',
      title: res.filename || 'Homework File',
      url: res.url,
      filename: res.filename || '',
      file_size: res.size || null,
      content_type: res.content_type || null
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

  const submitHomework = async () => {
    if (!homeworkText.trim() && homeworkAttachments.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/courses/lessons/${activeLesson.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          content: homeworkText,
          attachments: homeworkAttachments
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSubmission(data);
      } else {
        alert("Failed to submit homework");
      }
    } catch (err) {
      console.error(err);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="course-player glass-panel">
      <button className="btn-glass back-btn" onClick={onBack}>{t('player.back')}</button>
      
      <div className="player-layout">
        <div className="video-section">
          <h2>{course.title}</h2>
          {activeLesson ? (
            <>
              <ResourceViewer lesson={activeLesson} />
              <div className="lesson-details">
                <div className="lesson-header">
                  <div style={{display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap'}}>
                    <h3>{activeLesson.title}</h3>
                    <ResourceBadge type={activeLesson.resource_type || 'video'} />
                    {activeLesson.deadline && user && user.id !== course.author_id && (
                      <span style={{
                        fontSize: '0.85rem', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        background: safeDate(activeLesson.deadline) < new Date() ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: safeDate(activeLesson.deadline) < new Date() ? '#ef4444' : '#10b981',
                        border: `1px solid ${safeDate(activeLesson.deadline) < new Date() ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)'}`,
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}>
                        <Clock size={14} /> {t('player.deadline')}: {safeDate(activeLesson.deadline).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {user && (
                    <button 
                      className={"btn-complete " + (completedLessons.has(activeLesson.id) ? 'btn-complete--done' : '')}
                      onClick={toggleComplete}
                    >
                      {completedLessons.has(activeLesson.id) ? t('player.completed') : t('player.mark_viewed')}
                    </button>
                  )}
                </div>
                <p>{activeLesson.content}</p>
                
                {/* Lesson Attachments */}
                {activeLesson.attachments && activeLesson.attachments.length > 0 && (
                  <div className="lesson-attachments" style={{marginTop: '1.5rem', background: 'var(--glass-bg)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--glass-border)'}}>
                    <h4 style={{marginBottom: '0.75rem', color: 'var(--text-primary)', fontSize: '1.05rem'}}>{t('player.materials')}</h4>
                    <AttachmentList attachments={activeLesson.attachments} />
                  </div>
                )}

                {/* Homework Submission Section */}
                {user && user.id !== course.author_id && (
                  <div className="homework-section" style={{marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem'}}>
                    <h3>{t('player.homework')}</h3>
                    
                    {submission ? (
                      <div className="submission-view glass-panel" style={{marginTop: '1rem', padding: '1.25rem'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem'}}>
                          <div>
                            <span>{t('player.submitted_on')}: {safeDate(submission.submitted_at).toLocaleString()} </span>
                            {activeLesson.deadline && (
                              <span style={{
                                color: safeDate(submission.submitted_at) <= safeDate(activeLesson.deadline) ? '#10b981' : '#ef4444',
                                fontWeight: 'bold'
                              }}>
                                {safeDate(submission.submitted_at) <= safeDate(activeLesson.deadline) ? '(' + t('player.on_time') + ')' : '(' + t('player.late') + ')'}
                              </span>
                            )}
                          </div>
                          <span style={{color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px'}}><CheckCircle size={16} /> {t('player.status_sent')}</span>
                        </div>
                        <p style={{whiteSpace: 'pre-wrap', marginBottom: '1rem'}}>{submission.content}</p>
                        
                        {submission.attachments && submission.attachments.length > 0 && (
                          <div style={{marginTop: '0.75rem'}}>
                            <AttachmentList attachments={submission.attachments} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="submission-form" style={{marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                        <textarea
                          className="glass-input glass-textarea"
                          placeholder={t('player.hw_placeholder')}
                          value={homeworkText}
                          onChange={e => setHomeworkText(e.target.value)}
                          rows={4}
                        />
                        
                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                              {t('player.hw_files')} ({homeworkAttachments.length}/10)
                            </span>
                            {homeworkAttachments.length < 10 && (
                              <div style={{display: 'flex', gap: '0.5rem'}}>
                                <label className="btn-glass btn-sm" style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                  <Plus size={16} /> {t('create.add_file')}
                                  <input 
                                    type="file" 
                                    multiple 
                                    style={{display: 'none'}} 
                                    onChange={handleHomeworkUpload} 
                                  />
                                </label>
                                <button 
                                  type="button" 
                                  className="btn-glass btn-sm" 
                                  style={{display: 'flex', alignItems: 'center', gap: '4px'}}
                                  onClick={() => setIsHwLinkModalOpen(true)}
                                >
                                  <LinkIcon size={15} /> {t('create.add_link')}
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <AttachmentList 
                            attachments={homeworkAttachments} 
                            isEditable={true} 
                            onRemove={removeHomeworkAttachment} 
                          />
                        </div>

                        <button 
                          className="btn-oil" 
                          onClick={submitHomework} 
                          disabled={isSubmitting || (!homeworkText.trim() && homeworkAttachments.length === 0)}
                          style={{alignSelf: 'flex-start'}}
                        >
                          {isSubmitting ? t('app.loading') : t('player.submit_hw')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <AddLinkModal
                isOpen={isHwLinkModalOpen}
                onClose={() => setIsHwLinkModalOpen(false)}
                onAdd={handleAddHwLink}
              />
            </>
          ) : (
            <p>{t('player.no_lessons')}</p>
          )}
        </div>
        
        <div className="sidebar">
          <h3>{t('player.course_content')}</h3>
          <div className="lesson-list">
            {course.lessons && course.lessons.map((lesson, idx) => (
              <div 
                key={lesson.id} 
                className={"lesson-item " + (activeLesson?.id === lesson.id ? 'active' : '') + " " + (completedLessons.has(lesson.id) ? 'lesson-done' : '')}
                onClick={() => setActiveLesson(lesson)}
              >
                <div className={"lesson-number " + (completedLessons.has(lesson.id) ? 'lesson-number--done' : '')} style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                  {completedLessons.has(lesson.id) ? <Check size={16} strokeWidth={3} /> : idx + 1}
                </div>
                <div className="lesson-title-col">
                  <div className="lesson-title">{lesson.title}</div>
                  <ResourceBadge type={lesson.resource_type || 'video'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
