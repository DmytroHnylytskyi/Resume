import { API_URL } from '../config';
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import CourseForm from './CourseForm';
import './CreateCourseModal.css';

export default function EditCourseModal({ course, onClose, onCourseUpdated }) {
  const { token } = useContext(AuthContext);
  const { t } = useTranslation();
  const [title, setTitle] = useState(course?.title || '');
  const [description, setDescription] = useState(course?.description || '');
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    if (course && course.lessons) {
      setLessons(course.lessons.map(l => ({
        id: l.id,
        title: l.title || '',
        content: l.content || '',
        video_url: l.video_url || '',
        attachments: l.attachments || [],
        resource_type: l.resource_type || 'video'
      })));
    } else {
      setLessons([{ title: '', content: '', video_url: '', attachments: [], resource_type: 'video' }]);
    }
  }, [course]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const processedLessons = lessons
      .filter(l => l.title.trim())
      .map(l => {
        let url = l.video_url || '';
        // Safely convert YouTube watch URLs to embed
        if (l.resource_type === 'video' && url) {
          try {
            if (url.includes('youtube.com/watch')) {
              const urlObj = new URL(url);
              const videoId = urlObj.searchParams.get('v');
              if (videoId) {
                url = `https://www.youtube.com/embed/${videoId}`;
              }
            } else if (url.includes('youtu.be/')) {
              const urlObj = new URL(url);
              const videoId = urlObj.pathname.substring(1);
              if (videoId) {
                url = `https://www.youtube.com/embed/${videoId}`;
              }
            }
          } catch (err) {
            console.error('Invalid URL:', err);
          }
        }
        return {
          id: l.id || null,
          title: l.title,
          content: l.content,
          video_url: url || null,
          resource_type: l.resource_type,
          attachments: l.attachments || []
        };
      });

    try {
      const res = await fetch(`${API_URL}/courses/${course.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          lessons: processedLessons
        })
      });

      if (res.ok) {
        onCourseUpdated();
        onClose();
      } else {
        alert(t('app.fail', 'Failed to update course.'));
      }
    } catch (err) {
      console.error(err);
      alert(t('app.fail', 'Failed to update course.'));
    }
  };

  if (!course) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel create-course-modal">
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
        <h2>{t('app.edit_course', 'Edit Course')}</h2>
        <CourseForm
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          lessons={lessons}
          setLessons={setLessons}
          onSubmit={handleSubmit}
          submitLabel={t('app.save_changes', 'Save Changes')}
          token={token}
        />
      </div>
    </div>
  );
}

