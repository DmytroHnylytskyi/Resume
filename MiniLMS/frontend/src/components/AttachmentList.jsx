import React, { useState } from 'react';
import { 
  FileText, FileSpreadsheet, FileArchive, Image as ImageIcon, 
  Film, Music, Globe, FileCode, Layout, HardDrive, Video, 
  Paperclip, ExternalLink, Download, Eye, X 
} from 'lucide-react';
import { 
  normalizeAttachment, 
  detectAttachmentCategory, 
  formatBytes, 
  getDomainName 
} from '../utils/attachmentUtils';
import { useTranslation } from 'react-i18next';
import './AttachmentList.css';

const CategoryIcon = ({ category }) => {
  switch (category) {
    case 'pdf': return <FileText size={20} />;
    case 'doc': return <FileText size={20} />;
    case 'sheet': return <FileSpreadsheet size={20} />;
    case 'presentation': return <FileText size={20} />;
    case 'archive': return <FileArchive size={20} />;
    case 'image': return <ImageIcon size={20} />;
    case 'video': return <Film size={20} />;
    case 'audio': return <Music size={20} />;
    case 'github': return <FileCode size={20} />;
    case 'figma': return <Layout size={20} />;
    case 'gdrive': return <HardDrive size={20} />;
    case 'youtube': return <Video size={20} />;
    case 'link': return <Globe size={20} />;
    default: return <Paperclip size={20} />;
  }
};

export default function AttachmentList({ 
  attachments = [], 
  isEditable = false, 
  onRemove = null 
}) {
  const { t } = useTranslation();
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const normalizedItems = attachments.map(normalizeAttachment).filter(Boolean);

  const handleDownload = async (item, e) => {
    e.preventDefault();
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
      const fallbackName = item.title ? `${item.title.replace(/\s+/g, '_')}` : t('app.download', 'download');
      const urlParts = item.url.split('.');
      const ext = urlParts.length > 1 ? urlParts.pop() : '';
      
      let filename = item.filename;
      if (!filename) {
         filename = (ext && ext.length <= 4) ? `${fallbackName}.${ext}` : fallbackName;
      }

      // We fetch the file directly. Since you enabled "Allow PDF delivery" in Cloudinary,
      // this will now succeed without 400 errors.
      const response = await fetch(item.url);
      if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback to default browser behavior if fetch fails (e.g. CORS)
      window.open(item.url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="attachment-list-container">
      {normalizedItems.map((item, idx) => {
        const category = detectAttachmentCategory(item);
        const isPreviewable = category === 'pdf' || category === 'image';
        const formattedSize = formatBytes(item.file_size);
        const domain = getDomainName(item.url);

        return (
          <div key={item.id || idx} className="attachment-card">
            <div className="attachment-info-group">
              <div className={`attachment-icon-wrapper icon-cat-${category}`}>
                <CategoryIcon category={category} />
              </div>
              
              <div className="attachment-details">
                <div className="attachment-title" title={item.title}>
                  {item.title}
                </div>
                <div className="attachment-subtitle">
                  <span className="attachment-type-tag">
                    {item.type === 'link' ? (domain || 'LINK') : category.toUpperCase()}
                  </span>
                  {formattedSize && <span>• {formattedSize}</span>}
                  {item.filename && item.type === 'file' && item.filename !== item.title && (
                    <span title={item.filename}>• {item.filename}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="attachment-actions">
              {item.type === 'link' ? (
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-icon-action"
                  title={t('player.open_link', 'Open Link')}
                >
                  <ExternalLink size={15} />
                  <span>{t('player.open_link', 'Open Link')}</span>
                </a>
              ) : (
                <>
                  {isPreviewable && (
                    <button 
                      type="button" 
                      className="btn-icon-action"
                      onClick={() => setPreviewAttachment(item)}
                      title={t('player.preview', 'Preview')}
                    >
                      <Eye size={15} />
                      <span>{t('player.preview', 'Preview')}</span>
                    </button>
                  )}
                  <a 
                    href={item.url}
                    onClick={(e) => handleDownload(item, e)}
                    className="btn-icon-action"
                    title={t('player.download_file', 'Download File')}
                    style={isDownloading ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                  >
                    <Download size={15} />
                    <span>{t('player.download_file', 'Download')}</span>
                  </a>
                </>
              )}

              {isEditable && onRemove && (
                <button 
                  type="button" 
                  className="btn-icon-action btn-action-remove" 
                  onClick={() => onRemove(idx)}
                  title={t('app.remove', 'Remove')}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Modal Preview for PDFs and Images */}
      {previewAttachment && (
        <div className="attachment-preview-backdrop" onClick={() => setPreviewAttachment(null)}>
          <div className="attachment-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="preview-header">
              <div className="preview-title">
                <Paperclip size={18} />
                <span>{previewAttachment.title}</span>
              </div>
              <button 
                type="button" 
                className="btn-icon-action btn-action-remove" 
                onClick={() => setPreviewAttachment(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="preview-content">
              {detectAttachmentCategory(previewAttachment) === 'image' ? (
                <img src={previewAttachment.url} alt={previewAttachment.title} />
              ) : (
                <iframe 
                  src={previewAttachment.url} 
                  title={previewAttachment.title}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
