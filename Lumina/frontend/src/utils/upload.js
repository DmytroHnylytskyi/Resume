/**
 * Media & File Upload Utility Module.
 *
 * Provides functions for single and batch file uploads to the backend API
 * with authentication and error handling.
 */

/**
 * Uploads a single file to the backend API server or Cloudinary integration.
 *
 * @async
 * @function handleFileUploadUtil
 * @param {File} file - The browser File object selected by the user.
 * @param {string|null} token - The Bearer JWT authentication token.
 * @param {string} apiUrl - The base API URL.
 * @returns {Promise<Object|null>} Object containing url, filename, size, and content_type, or null on failure.
 */
export const handleFileUploadUtil = async (file, token, apiUrl) => {
  if (!file) return null;
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await fetch(`${apiUrl}/courses/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      return data;
    } else {
      console.error("Upload failed", data);
      return null;
    }
  } catch (err) {
    console.error("Upload error", err);
    return null;
  }
};

/**
 * Uploads multiple files concurrently using Promise.all.
 *
 * @async
 * @function handleMultipleFileUploadsUtil
 * @param {File[]} files - Array of browser File objects.
 * @param {string|null} token - The Bearer JWT authentication token.
 * @param {string} apiUrl - The base API URL.
 * @returns {Promise<Array<Object>>} Array of successful upload response objects.
 */
export const handleMultipleFileUploadsUtil = async (files, token, apiUrl) => {
  if (!files || files.length === 0) return [];
  
  const uploadPromises = files.map(file => handleFileUploadUtil(file, token, apiUrl));
  const results = await Promise.all(uploadPromises);
  
  return results.filter(res => res !== null);
};
