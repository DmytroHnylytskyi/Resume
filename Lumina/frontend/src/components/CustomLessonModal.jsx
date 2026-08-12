import { API_URL } from '../config';
import React, { useState, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { useTranslation } from 'react-i18next';
import { Paperclip, Link as LinkIcon } from 'lucide-react';
import { handleFileUploadUtil, handleMultipleFileUploadsUtil } from '../utils/upload';
import AttachmentList from './AttachmentList';
import AddLinkModal from './AddLinkModal';
import './CreateCourseModal.css';

const RESOURCE_TYPES = [
  { value: 'video', label: 'create.type_video' },
  { value: 'pdf', label: 'create.type_pdf' },
  { value: 'gdrive', label: 'create.type_gdrive' },
  { value: 'link', label: 'create.type_link' },
  { value: 'document', label: 'create.type_doc' },
  { value: 'text', label: 'create.type_text' },
];

export default function CustomLessonModal({ student, onClose, onCreated, onLessonCreated }) {
  const { token } = useContext(AuthContext);
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lesson, setLesson] = useState({ title: '', content: '', video_url: '', resource_type: 'video', attachments: [] });
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !lesson.title.trim()) return;

    let url = lesson.video_url || '';
    if (lesson.resource_type === 'video' && url) {
      url = url.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/');
    }

    const payload = {
      title,
      description,
      lessons: [{
        title: lesson.title,
        content: lesson.content,
        video_url: url || null,
        resource_type: lesson.resource_type,
        attachments: lesson.attachments || []
      }]
    };

    const res = await fetch(`${API_URL}/teacher/custom-lesson?student_id=${student.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      if (onCreated) onCreated();
      if (onLessonCreated) onLessonCreated();
      onClose();
    } else {
      alert(t('create.fail'));
    }
  };

  const handleAttachmentsUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const currentAttachments = lesson.attachments || [];
    if (currentAttachments.length + files.length > 10) {
      alert("Maximum 10 attachments allowed.");
      e.target.value = '';
      return;
    }
    
    for (let file of files) {
      if (file.size > 50 * 1024 * 1024) {
        alert("One or more files exceed 50MB limit.");
        e.target.value = '';
        return;
      }
    }
    
    const uploadedResults = await handleMultipleFileUploadsUtil(files, token, API_URL);
    const newAttachments = uploadedResults.map(res => ({
      id: 'att_' + Math.random().toString(36).substring(2, 9),
      type: 'file',
      title: res.filename || 'Attachment File',
      url: res.url,
      filename: res.filename || '',
      file_size: res.size || null,
      content_type: res.content_type || null
    }));

    setLesson(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), ...newAttachments]
    }));
    e.target.value = '';
  };

  const handleAddLinkAttachment = (linkObject) => {
    setLesson(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), linkObject]
    }));
  };

  const removeAttachment = (attachIdx) => {
    setLesson(prev => {
      const updated = [...(prev.attachments || [])];
      updated.splice(attachIdx, 1);
      return { ...prev, attachments: updated };
    });
  };

  const getUrlPlaceholder = (type) => {
    switch(type) {
      case 'video': return t('create.ph_video');
      case 'pdf': return t('create.ph_pdf');
      case 'gdrive': return t('create.ph_gdrive');
      case 'link': return t('create.ph_link');
      case 'document': return t('create.ph_doc');
      case 'text': return '';
      default: return '';
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel create-course-modal">
        <button className="close-btn" onClick={onClose}>×</button>
        <h2>{t('teacher.custom_lesson_title', { email: student.email })}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('create.course_name')}</label>
            <input
              type="text"
              className="glass-input"
              placeholder={t('create.course_name_ph')}
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('create.course_desc')}</label>
            <textarea
              className="glass-input glass-textarea"
              placeholder={t('create.course_desc_ph')}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="lessons-section">
            <h3>{t('create.lessons')} (1)</h3>
            <div className="lesson-form-item">
              <input
                type="text"
                className="glass-input"
                placeholder={t('create.lesson_title')}
                value={lesson.title}
                onChange={e => setLesson({...lesson, title: e.target.value})}
                required
              />
              <input
                type="text"
                className="glass-input"
                placeholder={t('create.lesson_desc')}
                value={lesson.content}
                onChange={e => setLesson({...lesson, content: e.target.value})}
              />
              <div className="resource-type-row">
                <select
                  className="glass-input resource-type-select"
                  value={lesson.resource_type}
                  onChange={e => setLesson({...lesson, resource_type: e.target.value})}
                >
                  {RESOURCE_TYPES.map(rt => (
                    <option key={rt.value} value={rt.value} style={{color:'#333'}}>
                      {t(rt.label)}
                    </option>
                  ))}
                </select>
                {lesson.resource_type !== 'text' && (
                  <input
                    type="text"
                    className="glass-input resource-url-input"
                    placeholder={getUrlPlaceholder(lesson.resource_type)}
                    value={lesson.video_url}
                    onChange={e => setLesson({...lesson, video_url: e.target.value})}
                  />
                )}
              </div>

              <div className="attachments-section" style={{marginTop: '1rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem'}}>
                  <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                    {t('create.attachments')} ({(lesson.attachments || []).length}/10)
                  </span>
                  {(lesson.attachments || []).length < 10 && (
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <label className="btn-glass btn-sm" style={{cursor: 'pointer', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                        <Paperclip size={15} /> {t('create.add_file', 'Attach File')}
                        <input 
                          type="file" 
                          multiple 
                          style={{display: 'none'}} 
                          onChange={handleAttachmentsUpload} 
                        />
                      </label>
                      <button 
                        type="button" 
                        className="btn-glass btn-sm" 
                        style={{padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px'}}
                        onClick={() => setIsLinkModalOpen(true)}
                      >
                        <LinkIcon size={15} /> {t('create.add_link', 'Add Link')}
                      </button>
                    </div>
                  )}
                </div>

                <AttachmentList 
                  attachments={lesson.attachments || []} 
                  isEditable={true} 
                  onRemove={removeAttachment} 
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-oil w-full mt-4">
            {t('teacher.create_custom_btn')}
          </button>
        </form>

        <AddLinkModal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          onAdd={handleAddLinkAttachment}
        />
      </div>
    </div>
  );
}
