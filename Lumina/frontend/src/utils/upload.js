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

export const handleMultipleFileUploadsUtil = async (files, token, apiUrl) => {
  if (!files || files.length === 0) return [];
  
  const uploadPromises = files.map(file => handleFileUploadUtil(file, token, apiUrl));
  const results = await Promise.all(uploadPromises);
  
  return results.filter(res => res !== null);
};
