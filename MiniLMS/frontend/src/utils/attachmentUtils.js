export const formatBytes = (bytes) => {
  if (!bytes || isNaN(bytes) || bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const getDomainName = (urlStr) => {
  if (!urlStr) return '';
  try {
    const url = new URL(urlStr);
    return url.hostname.replace(/^www\./, '');
  } catch (e) {
    return urlStr;
  }
};

export const normalizeAttachment = (item) => {
  if (!item) return null;
  if (typeof item === 'string') {
    const url = item;
    const cleanUrl = url.split('?')[0].split('#')[0];
    const pathSegments = cleanUrl.split('/').filter(Boolean);
    const rawName = pathSegments[pathSegments.length - 1] || 'Attachment';
    
    // Check if it looks like a local uploaded file or common document extension
    const hasExtension = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|zip|rar|png|jpg|jpeg|gif|mp4|mov)$/i.test(rawName);
    const isUploadPath = url.includes('/uploads/') || url.includes('cloudinary');
    
    const type = (hasExtension || isUploadPath) ? 'file' : 'link';
    const title = type === 'link' ? getDomainName(url) : rawName;

    return {
      id: 'att_' + Math.random().toString(36).substring(2, 9),
      type: type,
      title: title,
      url: url,
      filename: rawName,
      file_size: null,
      content_type: null
    };
  }

  // It's already an object
  return {
    id: item.id || ('att_' + Math.random().toString(36).substring(2, 9)),
    type: item.type || (item.filename ? 'file' : 'link'),
    title: item.title || item.filename || getDomainName(item.url) || 'Attachment',
    url: item.url || '',
    filename: item.filename || (item.url ? item.url.split('/').pop() : ''),
    file_size: item.file_size || item.size || null,
    content_type: item.content_type || null
  };
};

export const detectAttachmentCategory = (attachment) => {
  const norm = normalizeAttachment(attachment);
  if (!norm) return 'file';

  const url = (norm.url || '').toLowerCase();
  const name = (norm.filename || norm.title || '').toLowerCase();
  const type = norm.type;

  if (type === 'link') {
    if (url.includes('github.com')) return 'github';
    if (url.includes('figma.com')) return 'figma';
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) return 'gdrive';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('notion.so') || url.includes('notion.site')) return 'notion';
    return 'link';
  }

  // File categories by extension or title
  if (name.endsWith('.pdf')) return 'pdf';
  if (/\.(doc|docx|rtf|txt|odt)$/.test(name)) return 'doc';
  if (/\.(xls|xlsx|csv)$/.test(name)) return 'sheet';
  if (/\.(ppt|pptx)$/.test(name)) return 'presentation';
  if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return 'archive';
  if (/\.(png|jpg|jpeg|gif|svg|webp)$/.test(name)) return 'image';
  if (/\.(mp4|webm|mov|mkv)$/.test(name)) return 'video';
  if (/\.(mp3|wav|ogg)$/.test(name)) return 'audio';

  return 'file';
};
