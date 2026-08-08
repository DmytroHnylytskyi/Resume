import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, Link as LinkIcon } from 'lucide-react';
import { handleFileUploadUtil, handleMultipleFileUploadsUtil } from '../utils/upload';
import { API_URL } from '../config';
import AttachmentList from './AttachmentList';
import AddLinkModal from './AddLinkModal';

const RESOURCE_TYPES = [
  { value: 'video', label: 'create.type_video' },
  { value: 'pdf', label: 'create.type_pdf' },
  { value: 'gdrive', label: 'create.type_gdrive' },
  { value: 'meeting', label: 'create.type_meeting' },
  { value: 'link', label: 'create.type_link' },
  { value: 'document', label: 'create.type_doc' },
  { value: 'presentation', label: 'create.type_presentation' },
  { value: 'text', label: 'create.type_text' },
];

export default function CourseForm({ 
  title, setTitle, 
  description, setDescription, 
  lessons, setLessons,
  onSubmit, 
  submitLabel,
  token
}) {
  const { t } = useTranslation();
  const [activeLinkLessonIdx, setActiveLinkLessonIdx] = useState(null);

  const addLesson = () => {
    setLessons([...lessons, { title: '', content: '', video_url: '', attachments: [], resource_type: 'video' }]);
  };

  const removeLesson = (idx) => {
    if (lessons.length <= 1) return;
    setLessons(lessons.filter((_, i) => i !== idx));
  };

  const updateLesson = (idx, field, value) => {
    const updated = [...lessons];
    updated[idx] = { ...updated[idx], [field]: value };
    setLessons(updated);
  };

  const handleFileUpload = async (idx, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 50 * 1024 * 1024) {
      alert(t('create.error_size', "File size exceeds 50MB limit."));
      return;
    }
    
    const resData = await handleFileUploadUtil(file, token, API_URL);
    if (resData && resData.url) {
      updateLesson(idx, 'video_url', resData.url);
    } else {
      alert(t('create.error_upload', "Upload failed. Please check your connection or server logs."));
    }
    e.target.value = '';
  };

  const handleAttachmentsUpload = async (idx, e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const currentAttachments = lessons[idx].attachments || [];
    if (currentAttachments.length + files.length > 10) {
      alert(t('create.error_max_attach', "Maximum 10 attachments allowed per lesson."));
      e.target.value = '';
      return;
    }
    
    for (let file of files) {
      if (file.size > 50 * 1024 * 1024) {
        alert(t('create.error_size', "One or more files exceed 50MB limit."));
        e.target.value = '';
        return;
      }
    }
    
    const uploadedResults = await handleMultipleFileUploadsUtil(files, token, API_URL);
    if (uploadedResults.length === 0) {
      alert(t('create.error_upload', "Failed to upload attachments. Please check your connection or server logs."));
    } else if (uploadedResults.length < files.length) {
      alert(t('create.error_upload_some', "Some files failed to upload."));
    }

    const newAttachmentObjects = uploadedResults.map(res => ({
      id: 'att_' + Math.random().toString(36).substring(2, 9),
      type: 'file',
      title: res.filename || t('create.attachment_file', 'Attachment File'),
      url: res.url,
      filename: res.filename || '',
      file_size: res.size || null,
      content_type: res.content_type || null
    }));

    updateLesson(idx, 'attachments', [...currentAttachments, ...newAttachmentObjects]);
    e.target.value = '';
  };

  const handleAddLinkAttachment = (linkObject) => {
    if (activeLinkLessonIdx === null) return;
    const currentAttachments = lessons[activeLinkLessonIdx].attachments || [];
    updateLesson(activeLinkLessonIdx, 'attachments', [...currentAttachments, linkObject]);
    setActiveLinkLessonIdx(null);
  };

  const removeAttachment = (lessonIdx, attachIdx) => {
    const currentAttachments = [...(lessons[lessonIdx].attachments || [])];
    currentAttachments.splice(attachIdx, 1);
    updateLesson(lessonIdx, 'attachments', currentAttachments);
  };

  const getUrlPlaceholder = (type) => {
    switch(type) {
      case 'video': return t('create.ph_video');
      case 'pdf': return t('create.ph_pdf');
      case 'gdrive': return t('create.ph_gdrive');
      case 'meeting': return t('create.ph_url', 'URL (Zoom, Meet, etc...)');
      case 'link': return t('create.ph_link');
      case 'document': return t('create.ph_doc');
      case 'presentation': return t('create.ph_presentation', 'URL or Upload File');
      case 'text': return '';
      default: return '';
    }
  };

  return (
    <form onSubmit={onSubmit} autoComplete="off">
      <div className="form-group">
        <label>{t('create.course_name')}</label>
        <input
          type="text"
          className="glass-input"
          placeholder={t('create.course_name_ph')}
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          autoComplete="off"
        />
      </div>

      <div className="form-group">
        <label>{t('create.course_desc')}</label>
        <textarea
          className="glass-input glass-textarea"
          placeholder={t('create.course_desc_ph')}
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="lessons-section">
        <div className="lessons-header">
          <h3>{t('create.lessons')} ({lessons.length})</h3>
          <button type="button" className="btn-glass btn-sm" onClick={addLesson}>
            + {t('create.add_lesson')}
          </button>
        </div>

        {lessons.map((lesson, idx) => (
          <div key={idx} className="lesson-form-item">
            <div className="lesson-form-header">
              <span className="lesson-form-number">{idx + 1}</span>
              {lessons.length > 1 && (
                <button type="button" className="btn-remove" onClick={() => removeLesson(idx)}>×</button>
              )}
            </div>
            <input
              type="text"
              className="glass-input"
              placeholder={t('create.lesson_title')}
              value={lesson.title}
              onChange={e => updateLesson(idx, 'title', e.target.value)}
              required
              autoComplete="off"
            />
            <input
              type="text"
              className="glass-input"
              placeholder={t('create.lesson_desc')}
              value={lesson.content}
              onChange={e => updateLesson(idx, 'content', e.target.value)}
              autoComplete="off"
            />
            <div className="resource-type-row">
              <select
                className="glass-input resource-type-select"
                value={lesson.resource_type}
                onChange={e => updateLesson(idx, 'resource_type', e.target.value)}
              >
                {RESOURCE_TYPES.map(rt => (
                  <option key={rt.value} value={rt.value} style={{color:'#333'}}>
                    {t(rt.label)}
                  </option>
                ))}
              </select>
              {lesson.resource_type !== 'text' && (
                <div style={{display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center'}}>
                  <input
                    type="text"
                    className="glass-input resource-url-input"
                    placeholder={getUrlPlaceholder(lesson.resource_type)}
                    value={lesson.video_url}
                    onChange={e => updateLesson(idx, 'video_url', e.target.value)}
                    style={{flex: 1, margin: 0}}
                  />
                  {['video', 'pdf', 'document', 'presentation'].includes(lesson.resource_type) && (
                    <label className="btn-glass btn-sm" style={{cursor: 'pointer', padding: '10px', height: '100%', margin: 0, display: 'flex', alignItems: 'center'}}>
                      <Paperclip size={18} />
                      <input 
                        type="file" 
                        style={{display: 'none'}} 
                        onChange={(e) => handleFileUpload(idx, e)} 
                        accept={
                          lesson.resource_type === 'pdf' ? '.pdf' : 
                          lesson.resource_type === 'presentation' ? '.ppt,.pptx' : 
                          lesson.resource_type === 'document' ? '.doc,.docx' : 
                          'video/*'
                        }
                      />
                    </label>
                  )}
                </div>
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
                        onChange={(e) => handleAttachmentsUpload(idx, e)} 
                      />
                    </label>
                    <button 
                      type="button" 
                      className="btn-glass btn-sm" 
                      style={{padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px'}}
                      onClick={() => setActiveLinkLessonIdx(idx)}
                    >
                      <LinkIcon size={15} /> {t('create.add_link', 'Add Link')}
                    </button>
                  </div>
                )}
              </div>

              <AttachmentList 
                attachments={lesson.attachments || []} 
                isEditable={true} 
                onRemove={(aIdx) => removeAttachment(idx, aIdx)} 
              />
            </div>
          </div>
        ))}
      </div>

      <button type="submit" className="btn-oil w-full mt-4">
        {submitLabel}
      </button>

      <AddLinkModal
        isOpen={activeLinkLessonIdx !== null}
        onClose={() => setActiveLinkLessonIdx(null)}
        onAdd={handleAddLinkAttachment}
      />
    </form>
  );
}
