/**
 * AddLinkModal — small dialog for attaching an external web link to a
 * lesson. Normalizes bare domains to https://, previews the resolved
 * favicon/domain via attachmentUtils, and hands the {title, url} pair back
 * through `onAdd`.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as LinkIcon, X } from 'lucide-react';
import { getDomainName } from '../utils/attachmentUtils';

export default function AddLinkModal({ isOpen, onClose, onAdd }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const finalTitle = title.trim() || getDomainName(formattedUrl) || 'Web Link';

    onAdd({
      id: 'att_' + Math.random().toString(36).substring(2, 9),
      type: 'link',
      title: finalTitle,
      url: formattedUrl,
      filename: null,
      file_size: null,
      content_type: null
    });

    setUrl('');
    setTitle('');
    onClose();
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div className="modal-content glass-panel" style={{ maxWidth: '480px', width: '90%', padding: '1.75rem' }}>
        <button 
          type="button" 
          className="close-btn" 
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <h3 style={{ margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fff' }}>
          <LinkIcon size={20} color="var(--accent-color, #3b82f6)" />
          {t('create.link_modal_title', 'Add Web Link / Resource')}
        </h3>

        <div className="link-form-container">
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
              {t('create.link_url', 'URL Address')} *
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder={t('create.link_url_ph', 'https://example.com/resource')}
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
              {t('create.link_title', 'Link Title / Description')} ({t('app.optional', 'Optional')})
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder={t('create.link_title_ph', 'e.g. GitHub Repository, Figma Design...')}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn-glass btn-sm" onClick={onClose}>
              {t('app.cancel', 'Cancel')}
            </button>
            <button type="button" className="btn-oil btn-sm" disabled={!url.trim()} onClick={handleSubmit}>
              {t('create.save_link', 'Add Link')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
