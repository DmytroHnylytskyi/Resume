'use client';

/**
 * @file UserProfileModal.tsx
 * @module components/UserProfileModal
 * @description Modal component for displaying user account information, saving current 3D scenes to cloud DB,
 * and managing/loading saved user projects via the FastAPI backend. Supports full i18n localization.
 * 
 * @author 3D Furniture Configurator Team
 */

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useStore } from '../store/useStore';
import { 
  X, 
  User, 
  FolderPlus, 
  Folder, 
  Trash2, 
  RotateCcw, 
  LogOut, 
  Sparkles, 
  CheckCircle2,
  Calendar,
  Box
} from 'lucide-react';
import { API_URL } from '../config';
import type { CloudProject } from '../types';

interface UserProfileModalProps {
  onClose: () => void;
}

/**
 * UserProfileModal Component.
 * 
 * @param {Object} props - Component props.
 * @param {() => void} props.onClose - Callback function to close the profile modal.
 * @returns {JSX.Element} Profile and saved projects modal view.
 */
export default function UserProfileModal({ onClose }: UserProfileModalProps) {
  const tProf = useTranslations('Profile');
  const locale = useStore(state => state.locale);
  const token = useStore(state => state.token);
  const user = useStore(state => state.user);
  const logout = useStore(state => state.logout);
  const placedObjects = useStore(state => state.placedObjects);
  const loadUserProject = useStore(state => state.loadUserProject);
  
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(() => Boolean(token));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  /** Fetches cloud project list for active authenticated user */
  const fetchProjects = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/projects/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  /** Initial project list fetch effect */
  useEffect(() => {
    if (!token) return;
    let isSubscribed = true;
    fetch(`${API_URL}/projects/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isSubscribed) {
          setProjects(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching projects:', err);
        if (isSubscribed) setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [token]);

  /**
   * Saves current active 3D layout to user cloud profile.
   * @param {React.FormEvent} e - Form event.
   */
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/projects/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newProjectName.trim(),
          data: JSON.stringify(placedObjects)
        })
      });

      if (!res.ok) throw new Error('Save error');

      setNewProjectName('');
      setMessage(tProf('saveSuccess'));
      await fetchProjects();
    } catch (err: any) {
      setMessage(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Loads selected project into 3D scene canvas and closes modal.
   * @param {CloudProject} project - Target project record.
   */
  const handleLoadProject = (project: CloudProject) => {
    loadUserProject(project);
    onClose();
  };

  /**
   * Deletes a project by ID from cloud database.
   * @param {number} projectId - Target project ID.
   */
  const handleDeleteProject = async (projectId: number) => {
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  return (
    <div className="instruction-modal-overlay" onClick={onClose}>
      <div 
        className="instruction-modal-card glass-panel profile-modal-card" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="instruction-modal-header">
          <div className="instruction-modal-title-group">
            <User className="instruction-modal-title-icon" size={22} />
            <h2>{tProf('title')}</h2>
          </div>
          <button className="instruction-modal-close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="instruction-modal-body profile-modal-body">
          {/* User Details Status Card */}
          <div className="profile-user-card">
            <div className="profile-user-avatar">
              <User size={24} />
            </div>
            <div className="profile-user-details">
              <h3>{user?.name || 'User'}</h3>
              <p>{user?.email}</p>
            </div>
            <button className="profile-logout-btn" onClick={() => { logout(); onClose(); }}>
              <LogOut size={15} />
              <span>{tProf('logout')}</span>
            </button>
          </div>

          {/* Save Current Scene Section */}
          <form className="profile-save-form" onSubmit={handleSaveProject}>
            <div className="profile-form-title">
              <FolderPlus size={18} className="profile-form-icon" />
              <h4>{tProf('saveTitle')} ({placedObjects.length} {tProf('objects')})</h4>
            </div>
            <div className="profile-input-group">
              <input 
                type="text" 
                className="profile-input"
                placeholder={tProf('inputPlaceholder')}
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                required
              />
              <button type="submit" className="profile-save-btn" disabled={saving}>
                <Sparkles size={16} />
                <span>{saving ? tProf('saving') : tProf('saveCloudBtn')}</span>
              </button>
            </div>
            {message && (
              <div className="profile-status-message">
                <CheckCircle2 size={15} />
                <span>{message}</span>
              </div>
            )}
          </form>

          {/* Saved Cloud Projects List */}
          <div className="profile-projects-section">
            <div className="profile-section-header">
              <Folder size={18} className="profile-form-icon" />
              <h4>{tProf('myProjects')} ({projects.length})</h4>
            </div>

            {loading ? (
              <div className="profile-loading">{tProf('loadingProjects')}</div>
            ) : projects.length === 0 ? (
              <div className="profile-empty">
                <span>{tProf('noProjects')}</span>
              </div>
            ) : (
              <div className="profile-projects-grid">
                {projects.map(proj => {
                  let objCount = 0;
                  try {
                    objCount = JSON.parse(proj.data).length;
                  } catch {
                    objCount = 0;
                  }

                  const dateStr = new Date(proj.created_at).toLocaleDateString(locale === 'uk' ? 'uk-UA' : 'en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <div key={proj.id} className="profile-project-card">
                      <div className="profile-project-info">
                        <h5>{proj.name}</h5>
                        <div className="profile-project-meta">
                          <span><Calendar size={12} /> {dateStr}</span>
                          <span><Box size={12} /> {objCount} {tProf('objects')}</span>
                        </div>
                      </div>
                      <div className="profile-project-actions">
                        <button 
                          className="profile-project-btn load"
                          onClick={() => handleLoadProject(proj)}
                          title={tProf('loadTooltip')}
                        >
                          <RotateCcw size={14} />
                          <span>{tProf('loadBtn')}</span>
                        </button>
                        <button 
                          className="profile-project-btn delete"
                          onClick={() => handleDeleteProject(proj.id)}
                          title={tProf('deleteTooltip')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
